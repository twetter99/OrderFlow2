// Script para analizar inventory_history de LURRALDEBUS
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

async function analyze() {
  console.log('🔍 Análisis de inventory_history para LURRALDEBUS\n');
  
  // Por ID real del proyecto
  const byId = await db.collection('inventory_history')
    .where('projectId', '==', 'OEVZ73jdj9OUTIfDwdhs')
    .get();
  
  let totalById = 0;
  byId.forEach(d => { totalById += d.data().totalPrice || 0; });
  
  console.log(`Por projectId (ID real): ${byId.size} registros, ${totalById.toFixed(2)} €`);
  
  // Por nombre del proyecto
  const byName = await db.collection('inventory_history')
    .where('projectName', '==', 'LURRALDEBUS')
    .get();
  
  let totalByName = 0;
  byName.forEach(d => { totalByName += d.data().totalPrice || 0; });
  
  console.log(`Por projectName: ${byName.size} registros, ${totalByName.toFixed(2)} €`);
  
  // Ver qué projectIds tienen los registros con projectName=LURRALDEBUS
  console.log('\nProjectIds de los registros con projectName=LURRALDEBUS:');
  const projectIds = new Map();
  byName.forEach(d => {
    const pid = d.data().projectId;
    projectIds.set(pid, (projectIds.get(pid) || 0) + 1);
  });
  projectIds.forEach((count, pid) => {
    console.log(`   "${pid}": ${count} registros`);
  });
  
  // Ver órdenes recibidas
  console.log('\n📦 Órdenes recibidas para comparar:');
  const orders = await db.collection('purchaseOrders')
    .where('project', '==', 'OEVZ73jdj9OUTIfDwdhs')
    .where('status', 'in', ['Recibida', 'Recibida Parcialmente'])
    .get();
  
  let ordersTotal = 0;
  orders.forEach(d => { ordersTotal += d.data().total || 0; });
  console.log(`Órdenes recibidas: ${orders.size}, Total: ${ordersTotal.toFixed(2)} €`);
}

analyze().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
