/**
 * Script para detectar y limpiar datos huérfanos en Firestore.
 * Busca inventory_history, supplierInvoices y project totals que
 * referencian órdenes de compra que ya no existen.
 *
 * Uso:
 *   node scripts/cleanup-orphaned-data.js            → DRY RUN (solo muestra)
 *   node scripts/cleanup-orphaned-data.js --execute   → Ejecuta la limpieza real
 */

const admin = require("firebase-admin");
const path = require("path");

// Cargar variables de entorno
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Usar las mismas variables de entorno que firebase-admin.ts
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Faltan variables de entorno: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
  console.error("   Asegúrate de que el archivo .env está configurado correctamente.");
  process.exit(1);
}

let formattedPrivateKey = privateKey;
if (privateKey.includes('\\n')) {
  formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  }),
});

const db = admin.firestore();
const isDryRun = !process.argv.includes("--execute");

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧹 LIMPIEZA DE DATOS HUÉRFANOS`);
  console.log(`   Modo: ${isDryRun ? "🔍 DRY RUN (solo lectura)" : "⚡ EJECUCIÓN REAL"}`);
  console.log(`${"=".repeat(60)}\n`);

  // 1. Obtener todas las órdenes de compra existentes
  const ordersSnapshot = await db.collection("purchaseOrders").get();
  const existingOrderIds = new Set(ordersSnapshot.docs.map((d) => d.id));

  console.log(`📦 Órdenes de compra existentes: ${existingOrderIds.size}`);

  // 2. Buscar inventory_history huérfanos
  console.log(`\n--- inventory_history ---`);
  const historySnapshot = await db.collection("inventory_history").get();
  const orphanedHistory = [];

  for (const doc of historySnapshot.docs) {
    const data = doc.data();
    const poId = data.purchaseOrderId;
    if (poId && !existingOrderIds.has(poId)) {
      orphanedHistory.push({ id: doc.id, ...data });
    }
  }

  console.log(`  Total registros: ${historySnapshot.size}`);
  console.log(`  Huérfanos encontrados: ${orphanedHistory.length}`);

  if (orphanedHistory.length > 0) {
    // Agrupar por purchaseOrderId para mostrar resumen
    const byOrder = {};
    orphanedHistory.forEach((h) => {
      if (!byOrder[h.purchaseOrderId]) byOrder[h.purchaseOrderId] = [];
      byOrder[h.purchaseOrderId].push(h);
    });

    for (const [poId, items] of Object.entries(byOrder)) {
      const total = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
      console.log(`    → Orden ${poId}: ${items.length} registros, ${total.toFixed(2)}€`);
      items.forEach((item) => {
        console.log(`      - ${item.itemName} x${item.quantity} = ${(item.totalPrice || 0).toFixed(2)}€ (proyecto: ${item.projectName || "N/A"})`);
      });
    }

    if (!isDryRun) {
      // Revertir stock en inventoryLocations
      console.log(`\n  🔄 Revirtiendo stock en inventoryLocations...`);
      for (const h of orphanedHistory) {
        if (h.itemId && h.locationId && h.quantity) {
          const invLocSnap = await db.collection("inventoryLocations")
            .where("itemId", "==", h.itemId)
            .where("locationId", "==", h.locationId)
            .get();

          if (!invLocSnap.empty) {
            const locDoc = invLocSnap.docs[0];
            const currentQty = locDoc.data().quantity || 0;
            const newQty = Math.max(0, currentQty - Math.abs(h.quantity));
            await locDoc.ref.update({ quantity: newQty });
            console.log(`    ✅ ${h.itemName}: ${currentQty} → ${newQty} en ubicación ${h.locationId}`);
          }
        }
      }

      // Eliminar registros huérfanos (en batches de 450 para no superar el límite de 500)
      console.log(`\n  🗑️ Eliminando registros huérfanos de inventory_history...`);
      const batches = [];
      let batch = db.batch();
      let count = 0;
      for (const h of orphanedHistory) {
        batch.delete(db.collection("inventory_history").doc(h.id));
        count++;
        if (count % 450 === 0) {
          batches.push(batch);
          batch = db.batch();
        }
      }
      batches.push(batch);
      for (const b of batches) await b.commit();
      console.log(`    ✅ ${orphanedHistory.length} registros eliminados`);
    }
  }

  // 3. Buscar supplierInvoices con referencias rotas
  console.log(`\n--- supplierInvoices ---`);
  const invoicesSnapshot = await db.collection("supplierInvoices").get();
  const brokenInvoiceRefs = [];

  for (const doc of invoicesSnapshot.docs) {
    const data = doc.data();
    const poIds = data.purchaseOrderIds || [];
    const brokenIds = poIds.filter((id) => !existingOrderIds.has(id));
    if (brokenIds.length > 0) {
      brokenInvoiceRefs.push({ id: doc.id, invoiceNumber: data.invoiceNumber, brokenIds });
    }
  }

  console.log(`  Total facturas: ${invoicesSnapshot.size}`);
  console.log(`  Con referencias rotas: ${brokenInvoiceRefs.length}`);

  if (brokenInvoiceRefs.length > 0) {
    brokenInvoiceRefs.forEach((inv) => {
      console.log(`    → Factura ${inv.invoiceNumber || inv.id}: refs rotas → [${inv.brokenIds.join(", ")}]`);
    });

    if (!isDryRun) {
      console.log(`\n  🔄 Limpiando referencias rotas...`);
      for (const inv of brokenInvoiceRefs) {
        for (const brokenId of inv.brokenIds) {
          await db.collection("supplierInvoices").doc(inv.id).update({
            purchaseOrderIds: admin.firestore.FieldValue.arrayRemove(brokenId),
          });
        }
        console.log(`    ✅ Factura ${inv.invoiceNumber || inv.id}: ${inv.brokenIds.length} refs eliminadas`);
      }
    }
  }

  // 4. Recalcular totales de proyectos afectados
  console.log(`\n--- Totales de proyectos ---`);
  const affectedProjects = new Set();
  orphanedHistory.forEach((h) => {
    if (h.projectId) affectedProjects.add(h.projectId);
  });

  if (affectedProjects.size > 0) {
    console.log(`  Proyectos afectados: ${affectedProjects.size}`);

    for (const projectId of affectedProjects) {
      const projectDoc = await db.collection("projects").doc(projectId).get();
      if (!projectDoc.exists) {
        console.log(`    ⚠️ Proyecto ${projectId} no existe, saltando...`);
        continue;
      }

      const projectData = projectDoc.data();

      // Recalcular materialsReceived desde inventory_history (solo los que quedan)
      const validHistory = await db.collection("inventory_history")
        .where("projectId", "==", projectId)
        .get();
      const realMaterialsReceived = validHistory.docs.reduce(
        (sum, d) => sum + (d.data().totalPrice || 0), 0
      );

      // Recalcular materialsCommitted y spent desde purchaseOrders activas
      const activeOrders = await db.collection("purchaseOrders")
        .where("project", "==", projectId)
        .get();
      let realMaterialsCommitted = 0;
      let realSpent = 0;
      activeOrders.docs.forEach((d) => {
        const o = d.data();
        if (["Aprobada", "Enviada al Proveedor"].includes(o.status)) {
          realMaterialsCommitted += o.total || 0;
          realSpent += o.total || 0;
        } else if (["Recibida", "Recibida Parcialmente"].includes(o.status)) {
          realSpent += o.total || 0;
        }
      });

      const current = {
        spent: projectData.spent || 0,
        materialsReceived: projectData.materialsReceived || 0,
        materialsCommitted: projectData.materialsCommitted || 0,
      };
      const corrected = {
        spent: realSpent,
        materialsReceived: realMaterialsReceived,
        materialsCommitted: realMaterialsCommitted,
      };

      const hasChanges = current.spent !== corrected.spent ||
        current.materialsReceived !== corrected.materialsReceived ||
        current.materialsCommitted !== corrected.materialsCommitted;

      if (hasChanges) {
        console.log(`    → ${projectData.name || projectId}:`);
        console.log(`      spent: ${current.spent.toFixed(2)}€ → ${corrected.spent.toFixed(2)}€`);
        console.log(`      materialsReceived: ${current.materialsReceived.toFixed(2)}€ → ${corrected.materialsReceived.toFixed(2)}€`);
        console.log(`      materialsCommitted: ${current.materialsCommitted.toFixed(2)}€ → ${corrected.materialsCommitted.toFixed(2)}€`);

        if (!isDryRun) {
          await db.collection("projects").doc(projectId).update(corrected);
          console.log(`      ✅ Actualizado`);
        }
      } else {
        console.log(`    → ${projectData.name || projectId}: sin cambios necesarios`);
      }
    }
  } else {
    console.log(`  No hay proyectos afectados por datos huérfanos.`);
  }

  // 5. Resumen final
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESUMEN:`);
  console.log(`  inventory_history huérfanos: ${orphanedHistory.length}`);
  console.log(`  supplierInvoices con refs rotas: ${brokenInvoiceRefs.length}`);
  console.log(`  Proyectos afectados: ${affectedProjects.size}`);

  if (isDryRun && (orphanedHistory.length > 0 || brokenInvoiceRefs.length > 0)) {
    console.log(`\n⚠️  Esto fue un DRY RUN. Para ejecutar la limpieza real:`);
    console.log(`    node scripts/cleanup-orphaned-data.js --execute`);
  }
  console.log(`${"=".repeat(60)}\n`);
}

main().catch(console.error).finally(() => process.exit(0));
