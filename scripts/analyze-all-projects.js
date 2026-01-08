// Script para analizar discrepancias en TODOS los proyectos
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

async function analyzeAllProjects() {
  console.log('🔍 === ANÁLISIS DE DISCREPANCIAS EN TODOS LOS PROYECTOS ===\n');
  
  // 1. Obtener todos los proyectos
  const projectsSnap = await db.collection('projects').get();
  const projects = new Map();
  projectsSnap.forEach(doc => {
    projects.set(doc.id, doc.data().name);
  });
  
  // 2. Obtener todas las órdenes
  const ordersSnap = await db.collection('purchaseOrders').get();
  
  const receivedStatuses = ['Recibida', 'Recibida Parcialmente'];
  const committedStatuses = ['Aprobada', 'Enviada al Proveedor'];
  
  // Calcular totales por proyecto desde órdenes
  const ordersByProject = new Map(); // { projectId: { received, committed } }
  
  ordersSnap.forEach(doc => {
    const data = doc.data();
    const projectId = data.project;
    const status = data.status;
    const total = data.total || 0;
    
    if (!projectId) return;
    
    if (!ordersByProject.has(projectId)) {
      ordersByProject.set(projectId, { received: 0, committed: 0, name: projects.get(projectId) || projectId });
    }
    
    const proj = ordersByProject.get(projectId);
    if (receivedStatuses.includes(status)) {
      proj.received += total;
    } else if (committedStatuses.includes(status)) {
      proj.committed += total;
    }
  });
  
  // 3. Obtener inventory_history
  const historySnap = await db.collection('inventory_history').get();
  
  const historyByProject = new Map(); // { projectId: total }
  let historyWithZeroCost = 0;
  let historyTotal = 0;
  
  historySnap.forEach(doc => {
    const data = doc.data();
    const projectId = data.projectId;
    const cost = (data.quantity || 0) * (data.unitCost || data.unitPrice || 0);
    
    if (!projectId) return;
    
    historyTotal++;
    if (!data.unitCost && !data.unitPrice) {
      historyWithZeroCost++;
    }
    
    if (!historyByProject.has(projectId)) {
      historyByProject.set(projectId, 0);
    }
    historyByProject.set(projectId, historyByProject.get(projectId) + cost);
  });
  
  console.log(`📊 Estadísticas de inventory_history:`);
  console.log(`   Total registros: ${historyTotal}`);
  console.log(`   Registros con unitCost = 0: ${historyWithZeroCost} (${(historyWithZeroCost/historyTotal*100).toFixed(1)}%)`);
  console.log('');
  
  // 4. Comparar
  console.log('📋 DISCREPANCIAS POR PROYECTO:');
  console.log('═'.repeat(100));
  console.log('Proyecto'.padEnd(35) + 'Órdenes Recibidas'.padStart(18) + 'Inventory_History'.padStart(18) + 'Diferencia'.padStart(15) + '  Estado');
  console.log('─'.repeat(100));
  
  let projectsWithIssues = 0;
  const issues = [];
  
  ordersByProject.forEach((orderData, projectId) => {
    const historyTotal = historyByProject.get(projectId) || 0;
    const ordersReceived = orderData.received;
    const diff = ordersReceived - historyTotal;
    const diffPercent = ordersReceived > 0 ? (diff / ordersReceived * 100) : 0;
    
    let status = '✅ OK';
    if (Math.abs(diff) > 10 && Math.abs(diffPercent) > 5) {
      status = '⚠️  DISCREPANCIA';
      projectsWithIssues++;
      issues.push({
        name: orderData.name || projectId,
        ordersReceived,
        historyTotal,
        diff,
        diffPercent
      });
    }
    
    if (ordersReceived > 0 || historyTotal > 0) {
      const name = (orderData.name || projectId).substring(0, 33).padEnd(35);
      console.log(
        name +
        ordersReceived.toFixed(2).padStart(15) + ' €' +
        historyTotal.toFixed(2).padStart(15) + ' €' +
        diff.toFixed(2).padStart(12) + ' €  ' +
        status
      );
    }
  });
  
  console.log('═'.repeat(100));
  console.log(`\n🚨 PROYECTOS CON DISCREPANCIA: ${projectsWithIssues}`);
  
  if (issues.length > 0) {
    console.log('\n📌 DETALLE DE DISCREPANCIAS:');
    issues.sort((a, b) => b.diff - a.diff);
    issues.forEach(i => {
      console.log(`\n   ${i.name}:`);
      console.log(`      Órdenes recibidas: ${i.ordersReceived.toFixed(2)} €`);
      console.log(`      Inventory_history: ${i.historyTotal.toFixed(2)} €`);
      console.log(`      Diferencia: ${i.diff.toFixed(2)} € (${i.diffPercent.toFixed(1)}%)`);
    });
  }
  
  // 5. Verificar muestra de inventory_history
  console.log('\n\n🔬 MUESTRA DE INVENTORY_HISTORY (primeros 5 con unitCost=0):');
  console.log('─'.repeat(80));
  
  let sampleCount = 0;
  historySnap.forEach(doc => {
    if (sampleCount >= 5) return;
    const data = doc.data();
    if (!data.unitCost || data.unitCost === 0) {
      console.log(`   ${doc.id}:`);
      console.log(`      itemName: ${data.itemName}`);
      console.log(`      quantity: ${data.quantity}`);
      console.log(`      unitCost: ${data.unitCost}`);
      console.log(`      projectId: ${data.projectId}`);
      console.log(`      type: ${data.type}`);
      console.log('');
      sampleCount++;
    }
  });
}

analyzeAllProjects()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
