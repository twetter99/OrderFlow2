// Script para verificar órdenes pendientes y sus totales
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin credentials in env');
    console.log('FIREBASE_PROJECT_ID:', !!projectId);
    console.log('FIREBASE_CLIENT_EMAIL:', !!clientEmail);
    console.log('FIREBASE_PRIVATE_KEY:', !!privateKey);
    process.exit(1);
  }
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

const db = admin.firestore();

async function checkPendingOrders() {
  console.log('🔍 === VERIFICACIÓN DE ÓRDENES PENDIENTES ===\n');
  
  // Buscar órdenes con status Aprobada o Enviada al Proveedor
  const pendingStatuses = ['Aprobada', 'Enviada al Proveedor'];
  
  const snapshot = await db.collection('purchaseOrders')
    .where('status', 'in', pendingStatuses)
    .limit(10)
    .get();
  
  console.log(`📋 Encontradas ${snapshot.size} órdenes pendientes (mostrando hasta 10)\n`);
  
  let calculatedTotal = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    
    console.log(`📦 Orden: ${data.orderNumber || doc.id}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Supplier: ${data.supplier || data.supplierName}`);
    console.log(`   Project: ${data.project}`);
    console.log(`   ProjectName: ${data.projectName}`);
    console.log(`   --- CAMPOS DE TOTAL ---`);
    console.log(`   total: ${data.total}`);
    console.log(`   totalAmount: ${data.totalAmount}`);
    console.log(`   grandTotal: ${data.grandTotal}`);
    
    // Calcular total de items si existe
    if (data.items && Array.isArray(data.items)) {
      const itemsTotal = data.items.reduce((sum, item) => {
        return sum + (item.quantity * item.price);
      }, 0);
      console.log(`   items total calculado: ${itemsTotal}`);
      calculatedTotal += itemsTotal;
    }
    
    console.log('');
  });
  
  console.log(`\n💰 Total calculado de items: ${calculatedTotal.toFixed(2)} €`);
}

checkPendingOrders()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
