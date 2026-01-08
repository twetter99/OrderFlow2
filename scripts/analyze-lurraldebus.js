// Script para analizar el proyecto LURRALDEBUS
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}

const db = admin.firestore();

async function analyzeLurraldebus() {
  console.log('🔍 === ANÁLISIS PROYECTO LURRALDEBUS ===\n');
  
  // 1. Buscar el proyecto
  const projectsSnap = await db.collection('projects')
    .where('name', '==', 'LURRALDEBUS')
    .get();
  
  if (projectsSnap.empty) {
    console.log('❌ Proyecto LURRALDEBUS no encontrado');
    return;
  }
  
  const projectDoc = projectsSnap.docs[0];
  const projectId = projectDoc.id;
  const projectData = projectDoc.data();
  
  console.log(`📋 Proyecto encontrado:`);
  console.log(`   ID: ${projectId}`);
  console.log(`   Nombre: ${projectData.name}`);
  console.log(`   Cliente: ${projectData.client || projectData.clientId}`);
  console.log('');
  
  // 2. Buscar todas las órdenes de este proyecto
  const ordersSnap = await db.collection('purchaseOrders')
    .where('project', '==', projectId)
    .get();
  
  console.log(`📦 Órdenes de compra encontradas: ${ordersSnap.size}\n`);
  
  // Agrupar por estado
  const byStatus = {};
  let totalGeneral = 0;
  
  ordersSnap.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'Sin estado';
    const total = data.total || 0;
    
    if (!byStatus[status]) {
      byStatus[status] = { count: 0, total: 0, orders: [] };
    }
    byStatus[status].count++;
    byStatus[status].total += total;
    byStatus[status].orders.push({
      id: doc.id,
      orderNumber: data.orderNumber || doc.id,
      total: total,
      supplier: data.supplier || data.supplierName
    });
    totalGeneral += total;
  });
  
  console.log('📊 DESGLOSE POR ESTADO:');
  console.log('─'.repeat(60));
  
  Object.keys(byStatus).sort().forEach(status => {
    const data = byStatus[status];
    console.log(`\n${status}:`);
    console.log(`   Órdenes: ${data.count}`);
    console.log(`   Total: ${data.total.toFixed(2)} €`);
    if (data.orders.length <= 5) {
      data.orders.forEach(o => {
        console.log(`      - ${o.orderNumber}: ${o.total.toFixed(2)} € (${o.supplier})`);
      });
    }
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log(`TOTAL TODAS LAS ÓRDENES: ${totalGeneral.toFixed(2)} €`);
  console.log('═'.repeat(60));
  
  // 3. Calcular según la nueva lógica
  const receivedStatuses = ['Recibida', 'Recibida Parcialmente'];
  const committedStatuses = ['Aprobada', 'Enviada al Proveedor'];
  
  let gastadoReal = 0;
  let comprometido = 0;
  let noContado = 0;
  
  Object.keys(byStatus).forEach(status => {
    if (receivedStatuses.includes(status)) {
      gastadoReal += byStatus[status].total;
    } else if (committedStatuses.includes(status)) {
      comprometido += byStatus[status].total;
    } else {
      noContado += byStatus[status].total;
    }
  });
  
  console.log('\n📈 SEGÚN NUEVA LÓGICA (fuente de verdad):');
  console.log('─'.repeat(60));
  console.log(`   Gastado Real (Recibida/Parcial):     ${gastadoReal.toFixed(2)} €`);
  console.log(`   Comprometido (Aprobada/Enviada):     ${comprometido.toFixed(2)} €`);
  console.log(`   ─────────────────────────────────────────`);
  console.log(`   TOTAL PROYECTADO:                    ${(gastadoReal + comprometido).toFixed(2)} €`);
  console.log(`   No contado (Pendiente/Rechazado):    ${noContado.toFixed(2)} €`);
  
  // 4. Verificar inventory_history
  console.log('\n\n📦 INVENTORY_HISTORY (material físicamente recibido):');
  console.log('─'.repeat(60));
  
  const historySnap = await db.collection('inventory_history')
    .where('projectId', '==', projectId)
    .get();
  
  let historyTotal = 0;
  historySnap.forEach(doc => {
    const data = doc.data();
    historyTotal += (data.quantity || 0) * (data.unitCost || 0);
  });
  
  console.log(`   Entradas en inventory_history: ${historySnap.size}`);
  console.log(`   Total en inventory_history: ${historyTotal.toFixed(2)} €`);
  
  // Si no hay por projectId, buscar por projectName
  if (historySnap.empty) {
    const historyByNameSnap = await db.collection('inventory_history')
      .where('projectName', '==', 'LURRALDEBUS')
      .get();
    
    let historyByNameTotal = 0;
    historyByNameSnap.forEach(doc => {
      const data = doc.data();
      historyByNameTotal += (data.quantity || 0) * (data.unitCost || 0);
    });
    
    console.log(`\n   (Buscando por projectName...)`);
    console.log(`   Entradas por nombre: ${historyByNameSnap.size}`);
    console.log(`   Total por nombre: ${historyByNameTotal.toFixed(2)} €`);
  }
  
  // 5. Travel Reports
  console.log('\n\n✈️  TRAVEL REPORTS:');
  console.log('─'.repeat(60));
  
  const travelSnap = await db.collection('travelReports')
    .where('proyecto_id', '==', projectId)
    .get();
  
  let travelAprobado = 0;
  travelSnap.forEach(doc => {
    const data = doc.data();
    if (data.estado === 'Aprobado') {
      travelAprobado += data.total_informe || 0;
    }
  });
  
  console.log(`   Travel reports: ${travelSnap.size}`);
  console.log(`   Total aprobados: ${travelAprobado.toFixed(2)} €`);
  
  console.log('\n\n🎯 RESUMEN FINAL:');
  console.log('═'.repeat(60));
  console.log(`   Lista debería mostrar: ${(gastadoReal + comprometido + travelAprobado).toFixed(2)} €`);
  console.log(`   Detalle "Recibido": ${historyTotal.toFixed(2)} € (de inventory_history)`);
  console.log(`   Detalle "Comprometido": ${comprometido.toFixed(2)} € (órdenes aprobadas/enviadas)`);
  console.log(`   Detalle "Total Proyectado": ${(historyTotal + comprometido).toFixed(2)} €`);
}

analyzeLurraldebus()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
