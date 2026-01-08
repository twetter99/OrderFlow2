// Script para verificar la migración de órdenes en Firestore
// Ejecutar con: node scripts/verify-migration.js

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Obtener credenciales desde variables de entorno
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Error: Faltan variables de entorno de Firebase');
  console.log('Asegúrate de tener FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env.local');
  process.exit(1);
}

const credentials = {
  type: "service_account",
  project_id: projectId,
  private_key: privateKey,
  client_email: clientEmail,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
  });
}

const db = admin.firestore();

async function verifyMigration() {
  console.log('\n🔍 === VERIFICACIÓN DE MIGRACIÓN EN FIRESTORE ===\n');
  
  // Obtener muestra de órdenes
  const snapshot = await db.collection('purchaseOrders').limit(5).get();
  
  console.log('📋 Muestra de 5 órdenes:\n');
  
  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    const hasAllFields = data.supplierId && data.projectName && data.supplierName;
    const status = hasAllFields ? '✅' : '⚠️';
    
    console.log(`${status} Orden ${i + 1}: ${doc.id}`);
    console.log(`   project (ID):   ${data.project || 'NO EXISTE'}`);
    console.log(`   projectName:    ${data.projectName || '❌ NO EXISTE'}`);
    console.log(`   supplier:       ${data.supplier || 'NO EXISTE'}`);
    console.log(`   supplierId:     ${data.supplierId || '❌ NO EXISTE'}`);
    console.log(`   supplierName:   ${data.supplierName || '❌ NO EXISTE'}`);
    console.log('');
  });
  
  // Estadísticas generales
  const allDocs = await db.collection('purchaseOrders').get();
  let fullyMigrated = 0;
  let partiallyMigrated = 0;
  let notMigrated = 0;
  
  allDocs.docs.forEach(doc => {
    const data = doc.data();
    const hasSupplierId = !!data.supplierId;
    const hasProjectName = !!data.projectName;
    const hasSupplierName = !!data.supplierName;
    
    if (hasSupplierId && hasProjectName && hasSupplierName) {
      fullyMigrated++;
    } else if (hasSupplierId || hasProjectName || hasSupplierName) {
      partiallyMigrated++;
    } else {
      notMigrated++;
    }
  });
  
  console.log('📊 === RESUMEN DE MIGRACIÓN ===\n');
  console.log(`   Total órdenes:           ${allDocs.size}`);
  console.log(`   ✅ Completamente migradas: ${fullyMigrated}`);
  console.log(`   ⚠️  Parcialmente migradas: ${partiallyMigrated}`);
  console.log(`   ❌ Sin migrar:             ${notMigrated}`);
  console.log('');
  
  if (fullyMigrated === allDocs.size) {
    console.log('🎉 ¡Migración 100% completada! Todas las órdenes tienen los campos optimizados.\n');
  } else {
    console.log(`⚠️  Hay ${partiallyMigrated + notMigrated} órdenes que necesitan revisión.\n`);
  }
}

verifyMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
