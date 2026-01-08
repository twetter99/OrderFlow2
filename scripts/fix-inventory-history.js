// Script de migración para corregir inventory_history
// 1. Corrige projectId que tienen nombres en vez de IDs
// 2. Añade unitCost como alias de unitPrice
// 3. Crea registros faltantes desde órdenes recibidas

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function migrate() {
  console.log('🔧 === MIGRACIÓN DE INVENTORY_HISTORY ===\n');
  
  // PASO 1: Construir mapa de nombre -> ID de proyectos
  console.log('📋 Paso 1: Cargando proyectos...');
  const projectsSnap = await db.collection('projects').get();
  const projectNameToId = new Map();
  const projectIdToName = new Map();
  
  projectsSnap.forEach(doc => {
    const name = doc.data().name;
    projectNameToId.set(name, doc.id);
    projectIdToName.set(doc.id, name);
  });
  console.log(`   ${projectsSnap.size} proyectos cargados\n`);
  
  // PASO 2: Corregir projectId en inventory_history
  console.log('🔄 Paso 2: Corrigiendo projectId en inventory_history...');
  const historySnap = await db.collection('inventory_history').get();
  
  let correctedProjectId = 0;
  let addedUnitCost = 0;
  let alreadyCorrect = 0;
  
  const batchSize = 500;
  let batch = db.batch();
  let batchCount = 0;
  
  for (const doc of historySnap.docs) {
    const data = doc.data();
    const updates = {};
    
    // Verificar si projectId es un nombre en vez de ID
    if (data.projectId && projectNameToId.has(data.projectId)) {
      // Es un nombre, corregir al ID real
      updates.projectId = projectNameToId.get(data.projectId);
      correctedProjectId++;
    }
    
    // Añadir unitCost si no existe
    if (data.unitPrice !== undefined && data.unitCost === undefined) {
      updates.unitCost = data.unitPrice;
      addedUnitCost++;
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      batchCount++;
      
      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        process.stdout.write('.');
      }
    } else {
      alreadyCorrect++;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`\n   Corregidos projectId: ${correctedProjectId}`);
  console.log(`   Añadido unitCost: ${addedUnitCost}`);
  console.log(`   Ya correctos: ${alreadyCorrect}\n`);
  
  // PASO 3: Crear registros faltantes desde órdenes recibidas
  console.log('📦 Paso 3: Buscando órdenes recibidas sin registro en inventory_history...');
  
  // Obtener todas las órdenes recibidas
  const ordersSnap = await db.collection('purchaseOrders')
    .where('status', 'in', ['Recibida', 'Recibida Parcialmente'])
    .get();
  
  console.log(`   ${ordersSnap.size} órdenes recibidas encontradas`);
  
  // Obtener inventory_history actualizado
  const updatedHistorySnap = await db.collection('inventory_history').get();
  const existingKeys = new Set();
  updatedHistorySnap.forEach(doc => {
    const data = doc.data();
    // Clave única: orderId + itemId
    existingKeys.add(`${data.purchaseOrderId}_${data.itemId}`);
  });
  
  console.log(`   ${existingKeys.size} registros existentes en inventory_history`);
  
  // Mapear proveedores
  const suppliersSnap = await db.collection('suppliers').get();
  const supplierNameToId = new Map();
  suppliersSnap.forEach(doc => {
    supplierNameToId.set(doc.data().name, doc.id);
  });
  
  // Crear registros faltantes
  let created = 0;
  let skipped = 0;
  batch = db.batch();
  batchCount = 0;
  
  for (const orderDoc of ordersSnap.docs) {
    const order = orderDoc.data();
    const orderId = orderDoc.id;
    const items = order.items || [];
    
    // Obtener fecha de la orden
    let orderDate;
    if (order.date?._seconds) {
      orderDate = new Date(order.date._seconds * 1000).toISOString();
    } else if (order.date?.toDate) {
      orderDate = order.date.toDate().toISOString();
    } else {
      orderDate = order.date || new Date().toISOString();
    }
    
    // Obtener projectId correcto
    let projectId = order.project || '';
    if (projectNameToId.has(projectId)) {
      // Es un nombre, convertir a ID
      projectId = projectNameToId.get(projectId);
    }
    const projectName = order.projectName || projectIdToName.get(projectId) || projectId;
    
    for (const item of items) {
      if (!item.itemId || item.type !== 'Material') continue;
      
      const key = `${orderId}_${item.itemId}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      
      const historyEntry = {
        itemId: item.itemId,
        itemSku: item.itemSku || '',
        itemName: item.itemName,
        supplierId: order.supplierId || supplierNameToId.get(order.supplier) || '',
        supplierName: order.supplierName || order.supplier || '',
        purchaseOrderId: orderId,
        orderNumber: order.orderNumber || orderId,
        quantity: item.quantity,
        unitPrice: item.price,
        unitCost: item.price, // Alias
        totalPrice: item.quantity * item.price,
        unit: item.unit || 'ud',
        date: orderDate,
        projectId: projectId,
        projectName: projectName,
        migratedAt: new Date().toISOString(),
        migrationSource: 'fix-inventory-history-v2',
      };
      
      const newRef = db.collection('inventory_history').doc();
      batch.set(newRef, historyEntry);
      batchCount++;
      created++;
      existingKeys.add(key); // Prevenir duplicados en este batch
      
      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        process.stdout.write('+');
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`\n   Creados: ${created}`);
  console.log(`   Omitidos (ya existían): ${skipped}\n`);
  
  // PASO 4: Verificación final
  console.log('✅ Paso 4: Verificación final...');
  const finalHistorySnap = await db.collection('inventory_history').get();
  let withUnitCost = 0;
  let withCorrectProjectId = 0;
  
  finalHistorySnap.forEach(doc => {
    const data = doc.data();
    if (data.unitCost !== undefined) withUnitCost++;
    if (data.projectId && !projectNameToId.has(data.projectId)) withCorrectProjectId++;
  });
  
  console.log(`   Total registros: ${finalHistorySnap.size}`);
  console.log(`   Con unitCost: ${withUnitCost} (${(withUnitCost/finalHistorySnap.size*100).toFixed(1)}%)`);
  console.log(`   Con projectId correcto: ${withCorrectProjectId} (${(withCorrectProjectId/finalHistorySnap.size*100).toFixed(1)}%)`);
  
  console.log('\n🎉 Migración completada!');
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
