/**
 * Script de migración para calcular y almacenar totales pre-calculados en proyectos
 * 
 * Campos a calcular:
 * - materialsReceived: suma de totalPrice desde inventory_history donde projectId = proyecto
 * - materialsCommitted: suma de total desde purchaseOrders donde project = proyecto y status in ['Aprobada', 'Enviada al Proveedor']
 * - travelApproved: suma de total_informe desde travelReports donde proyecto_id = proyecto y estado = 'Aprobado'
 * - travelPending: suma de total_informe desde travelReports donde proyecto_id = proyecto y estado = 'Pendiente de Aprobación'
 * 
 * Uso: node scripts/migrate-project-totals.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

// Inicializar Firebase Admin
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

async function migrateProjectTotals() {
  console.log('🚀 Iniciando migración de totales de proyectos...\n');
  
  // Obtener todos los datos necesarios en paralelo
  const [projectsSnapshot, inventoryHistorySnapshot, purchaseOrdersSnapshot, travelReportsSnapshot] = await Promise.all([
    db.collection('projects').get(),
    db.collection('inventory_history').get(),
    db.collection('purchaseOrders').get(),
    db.collection('travelReports').get(),
  ]);

  console.log(`📊 Datos cargados:`);
  console.log(`   - ${projectsSnapshot.size} proyectos`);
  console.log(`   - ${inventoryHistorySnapshot.size} registros de inventory_history`);
  console.log(`   - ${purchaseOrdersSnapshot.size} órdenes de compra`);
  console.log(`   - ${travelReportsSnapshot.size} informes de viaje\n`);

  // Calcular materialsReceived desde inventory_history
  const materialsReceivedMap = new Map();
  inventoryHistorySnapshot.docs.forEach(doc => {
    const data = doc.data();
    const projectId = data.projectId;
    const totalPrice = data.totalPrice || 0;
    
    if (projectId) {
      const current = materialsReceivedMap.get(projectId) || 0;
      materialsReceivedMap.set(projectId, current + totalPrice);
    }
  });

  // Calcular materialsCommitted desde purchaseOrders
  const materialsCommittedMap = new Map();
  const committedStatuses = ['Aprobada', 'Enviada al Proveedor'];
  
  purchaseOrdersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const projectId = data.project;
    const status = data.status;
    const total = data.total || 0;
    
    if (projectId && committedStatuses.includes(status)) {
      const current = materialsCommittedMap.get(projectId) || 0;
      materialsCommittedMap.set(projectId, current + total);
    }
  });

  // Calcular travelApproved y travelPending desde travelReports
  const travelApprovedMap = new Map();
  const travelPendingMap = new Map();
  
  travelReportsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const projectId = data.proyecto_id;
    const estado = data.estado;
    const total = data.total_informe || 0;
    
    if (projectId) {
      if (estado === 'Aprobado') {
        const current = travelApprovedMap.get(projectId) || 0;
        travelApprovedMap.set(projectId, current + total);
      } else if (estado === 'Pendiente de Aprobación') {
        const current = travelPendingMap.get(projectId) || 0;
        travelPendingMap.set(projectId, current + total);
      }
    }
  });

  // Actualizar cada proyecto
  const batch = db.batch();
  let updateCount = 0;
  
  console.log('📝 Actualizando proyectos...\n');

  for (const projectDoc of projectsSnapshot.docs) {
    const projectId = projectDoc.id;
    const projectData = projectDoc.data();
    
    const materialsReceived = materialsReceivedMap.get(projectId) || 0;
    const materialsCommitted = materialsCommittedMap.get(projectId) || 0;
    const travelApproved = travelApprovedMap.get(projectId) || 0;
    const travelPending = travelPendingMap.get(projectId) || 0;
    
    const updateData = {
      materialsReceived,
      materialsCommitted,
      travelApproved,
      travelPending,
    };

    // Solo mostrar proyectos con valores
    if (materialsReceived > 0 || materialsCommitted > 0 || travelApproved > 0 || travelPending > 0) {
      console.log(`  ✅ ${projectData.name || projectId}:`);
      console.log(`      materialsReceived: ${materialsReceived.toFixed(2)}€`);
      console.log(`      materialsCommitted: ${materialsCommitted.toFixed(2)}€`);
      console.log(`      travelApproved: ${travelApproved.toFixed(2)}€`);
      console.log(`      travelPending: ${travelPending.toFixed(2)}€`);
      console.log(`      TOTAL GASTADO: ${(materialsReceived + travelApproved).toFixed(2)}€`);
      console.log(`      TOTAL COMPROMETIDO: ${(materialsCommitted + travelPending).toFixed(2)}€\n`);
    }

    batch.update(projectDoc.ref, updateData);
    updateCount++;
  }

  // Ejecutar batch
  await batch.commit();
  
  console.log(`\n✅ Migración completada: ${updateCount} proyectos actualizados.`);
  
  // Resumen global
  let totalMaterialsReceived = 0;
  let totalMaterialsCommitted = 0;
  let totalTravelApproved = 0;
  let totalTravelPending = 0;
  
  materialsReceivedMap.forEach(v => totalMaterialsReceived += v);
  materialsCommittedMap.forEach(v => totalMaterialsCommitted += v);
  travelApprovedMap.forEach(v => totalTravelApproved += v);
  travelPendingMap.forEach(v => totalTravelPending += v);
  
  console.log('\n📊 RESUMEN GLOBAL:');
  console.log(`   Materiales Recibidos: ${totalMaterialsReceived.toFixed(2)}€`);
  console.log(`   Materiales Comprometidos: ${totalMaterialsCommitted.toFixed(2)}€`);
  console.log(`   Viajes Aprobados: ${totalTravelApproved.toFixed(2)}€`);
  console.log(`   Viajes Pendientes: ${totalTravelPending.toFixed(2)}€`);
  console.log(`   ─────────────────────────────`);
  console.log(`   TOTAL GASTADO: ${(totalMaterialsReceived + totalTravelApproved).toFixed(2)}€`);
  console.log(`   TOTAL COMPROMETIDO: ${(totalMaterialsCommitted + totalTravelPending).toFixed(2)}€`);
}

migrateProjectTotals()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });
