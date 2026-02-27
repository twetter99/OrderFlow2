// Script para hacer copia de seguridad completa de Firestore
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}

const db = admin.firestore();

// Colecciones a exportar
const COLLECTIONS = [
  'clients',
  'deliveryNotes',
  'installationTemplates',
  'inventory',
  'inventoryLocations',
  'locations',
  'operadores',
  'payments',
  'projects',
  'purchaseOrders',
  'replanteos',
  'supervisores',
  'supplierInvoices',
  'suppliers',
  'technicians',
  'usuarios',
  'users',
];

async function exportCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  const data = {};
  snap.forEach(doc => {
    data[doc.id] = doc.data();
  });
  console.log(`  ✅ ${collectionName}: ${snap.size} documentos`);
  return data;
}

async function backupFirestore() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'firestore-data', 'backups', `backup-${timestamp}`);

  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`\n🔥 BACKUP DE FIRESTORE`);
  console.log(`📁 Destino: ${backupDir}\n`);

  const manifest = {
    timestamp: new Date().toISOString(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    collections: {},
  };

  for (const col of COLLECTIONS) {
    try {
      const data = await exportCollection(col);
      const filePath = path.join(backupDir, `${col}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      manifest.collections[col] = Object.keys(data).length;
    } catch (err) {
      console.warn(`  ⚠️  ${col}: error al exportar (${err.message})`);
      manifest.collections[col] = 'ERROR';
    }
  }

  // Guardar manifiesto con resumen
  fs.writeFileSync(
    path.join(backupDir, '_manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  const total = Object.values(manifest.collections)
    .filter(v => typeof v === 'number')
    .reduce((a, b) => a + b, 0);

  console.log(`\n🎉 Backup completado: ${total} documentos en total`);
  console.log(`📄 Manifiesto: ${path.join(backupDir, '_manifest.json')}\n`);

  process.exit(0);
}

backupFirestore().catch(err => {
  console.error('❌ Error en el backup:', err);
  process.exit(1);
});
