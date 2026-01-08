// Script para analizar informes de viaje existentes
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
  console.log('📊 === ANÁLISIS DE INFORMES DE VIAJE ===\n');
  
  const snap = await db.collection('travelReports').get();
  console.log(`Total informes: ${snap.size}\n`);
  
  if (snap.empty) {
    console.log('⚠️ No hay informes de viaje en la base de datos.');
    return;
  }
  
  const byStatus = {};
  const byProject = {};
  let totalAprobado = 0;
  let totalPendiente = 0;
  let totalRechazado = 0;
  
  console.log('=== DETALLE DE INFORMES ===');
  snap.docs.forEach(doc => {
    const d = doc.data();
    const estado = d.estado || 'Sin estado';
    byStatus[estado] = (byStatus[estado] || 0) + 1;
    
    const projectKey = d.proyecto_id || 'sin-proyecto';
    if (!byProject[projectKey]) {
      byProject[projectKey] = {
        name: d.proyecto_name || 'Sin proyecto',
        aprobado: 0,
        pendiente: 0,
        rechazado: 0,
        count: 0
      };
    }
    byProject[projectKey].count++;
    
    const total = d.total_informe || 0;
    
    if (estado === 'Aprobado') {
      totalAprobado += total;
      byProject[projectKey].aprobado += total;
    } else if (estado === 'Pendiente de Aprobación') {
      totalPendiente += total;
      byProject[projectKey].pendiente += total;
    } else if (estado === 'Rechazado') {
      totalRechazado += total;
      byProject[projectKey].rechazado += total;
    }
    
    const fechaInicio = d.fecha_inicio?.toDate?.() 
      ? d.fecha_inicio.toDate().toISOString().split('T')[0] 
      : d.fecha_inicio || 'N/A';
    
    console.log(`  ${d.codigo_informe || doc.id}`);
    console.log(`    Proyecto: ${d.proyecto_name} (${d.proyecto_id})`);
    console.log(`    Técnico: ${d.tecnico_name}`);
    console.log(`    Fecha: ${fechaInicio}`);
    console.log(`    Total: ${total.toFixed(2)}€`);
    console.log(`    Estado: ${estado}`);
    
    // Mostrar gastos detallados
    if (d.gastos && d.gastos.length > 0) {
      console.log(`    Gastos (${d.gastos.length}):`);
      d.gastos.forEach(g => {
        console.log(`      - ${g.concepto}: ${g.importe}€ (${g.tipo})`);
      });
    }
    console.log('');
  });
  
  console.log('\n=== RESUMEN POR ESTADO ===');
  Object.keys(byStatus).forEach(k => {
    console.log(`  ${k}: ${byStatus[k]} informes`);
  });
  
  console.log('\n=== RESUMEN POR PROYECTO ===');
  Object.entries(byProject).forEach(([id, data]) => {
    console.log(`  ${data.name} (${id}):`);
    console.log(`    - Aprobado: ${data.aprobado.toFixed(2)}€`);
    console.log(`    - Pendiente: ${data.pendiente.toFixed(2)}€`);
    console.log(`    - Rechazado: ${data.rechazado.toFixed(2)}€`);
    console.log(`    - Total informes: ${data.count}`);
  });
  
  console.log('\n=== TOTALES GLOBALES ===');
  console.log(`  💚 APROBADO (gastado): ${totalAprobado.toFixed(2)}€`);
  console.log(`  💛 PENDIENTE (comprometido): ${totalPendiente.toFixed(2)}€`);
  console.log(`  ❌ RECHAZADO: ${totalRechazado.toFixed(2)}€`);
  console.log(`  📊 TOTAL PROYECTADO: ${(totalAprobado + totalPendiente).toFixed(2)}€`);
}

analyze().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
