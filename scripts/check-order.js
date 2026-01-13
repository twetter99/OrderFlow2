require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();
const orderId = process.argv[2];

async function checkOrder() {
  if (!orderId) {
    console.log('Uso: node check-order.js <orderId>');
    process.exit(1);
  }

  const doc = await db.collection('purchaseOrders').doc(orderId).get();
  
  if (!doc.exists) {
    console.log('Orden no encontrada:', orderId);
    process.exit(1);
  }

  const data = doc.data();
  console.log('\n=== ORDEN:', orderId, '===\n');
  
  for (const [key, value] of Object.entries(data)) {
    if (key === 'items' || key === 'statusHistory' || key === 'deliveryNotes') {
      console.log(key + ':', Array.isArray(value) ? `[${value.length} items]` : value);
    } else if (value && value._seconds) {
      console.log(key + ':', new Date(value._seconds * 1000).toISOString());
    } else {
      console.log(key + ':', JSON.stringify(value));
    }
  }
  
  console.log('\n=== ANÁLISIS orderNumber ===');
  console.log('Valor:', JSON.stringify(data.orderNumber));
  console.log('Tipo:', typeof data.orderNumber);
  console.log('Es string vacío:', data.orderNumber === '');
  console.log('Es undefined:', data.orderNumber === undefined);
  console.log('Es null:', data.orderNumber === null);
  console.log('Falsy:', !data.orderNumber);
}

checkOrder().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
