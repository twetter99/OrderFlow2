"use server";

import { db, admin } from "@/lib/firebase-admin";
import type { PurchaseOrder, Project, Supplier } from "@/lib/types";

type MigrationResult = {
  success: boolean;
  message: string;
  details?: {
    total: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
};

/**
 * Migra las órdenes de compra existentes para usar IDs en lugar de nombres.
 * 
 * Cambios realizados:
 * 1. Si `project` es un nombre (no un ID válido), busca el proyecto y:
 *    - Actualiza `project` con el ID del documento
 *    - Añade/actualiza `projectName` con el nombre
 * 
 * 2. Si no existe `supplierId`, busca el proveedor por nombre y:
 *    - Añade `supplierId` con el ID del documento
 *    - Añade `supplierName` con el nombre del proveedor
 */
export async function migrateOrdersToUseIds(): Promise<MigrationResult> {
  const errors: string[] = [];
  let total = 0;
  let updated = 0;
  let skipped = 0;

  try {
    // Cargar todos los proyectos en memoria para búsquedas rápidas
    const projectsSnapshot = await db.collection("projects").get();
    const projectsByName = new Map<string, { id: string; name: string }>();
    const projectsById = new Map<string, { id: string; name: string }>();
    
    projectsSnapshot.docs.forEach(doc => {
      const data = doc.data() as Project;
      projectsByName.set(data.name.toLowerCase(), { id: doc.id, name: data.name });
      projectsById.set(doc.id, { id: doc.id, name: data.name });
    });

    // Cargar todos los proveedores en memoria
    const suppliersSnapshot = await db.collection("suppliers").get();
    const suppliersByName = new Map<string, { id: string; name: string }>();
    
    suppliersSnapshot.docs.forEach(doc => {
      const data = doc.data() as Supplier;
      suppliersByName.set(data.name.toLowerCase(), { id: doc.id, name: data.name });
    });

    // Obtener todas las órdenes de compra
    const ordersSnapshot = await db.collection("purchaseOrders").get();
    total = ordersSnapshot.docs.length;

    // Procesar en lotes de 500 (límite de Firestore para batch writes)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data() as PurchaseOrder;
      const updates: Partial<PurchaseOrder> = {};
      let needsUpdate = false;

      // === MIGRAR PROYECTO ===
      // Verificar si `project` parece ser un nombre (no un ID de Firestore)
      // Los IDs de Firestore tienen 20 caracteres alfanuméricos
      const isProjectAnId = projectsById.has(orderData.project);
      
      if (!isProjectAnId && orderData.project) {
        // Es un nombre, buscar el ID correspondiente
        const projectMatch = projectsByName.get(orderData.project.toLowerCase());
        
        if (projectMatch) {
          updates.project = projectMatch.id;
          if (!orderData.projectName) {
            updates.projectName = projectMatch.name;
          }
          needsUpdate = true;
        } else {
          // No se encontró el proyecto, mantener pero añadir warning
          if (!orderData.projectName) {
            updates.projectName = orderData.project;
          }
          needsUpdate = true;
          errors.push(`Orden ${orderDoc.id}: No se encontró proyecto "${orderData.project}"`);
        }
      } else if (isProjectAnId && !orderData.projectName) {
        // Ya tiene ID válido pero falta el nombre
        const project = projectsById.get(orderData.project);
        if (project) {
          updates.projectName = project.name;
          needsUpdate = true;
        }
      }

      // === MIGRAR PROVEEDOR ===
      // Si no existe supplierId, añadirlo
      if (!orderData.supplierId && orderData.supplier) {
        const supplierMatch = suppliersByName.get(orderData.supplier.toLowerCase());
        
        if (supplierMatch) {
          updates.supplierId = supplierMatch.id;
          if (!orderData.supplierName) {
            updates.supplierName = supplierMatch.name;
          }
          needsUpdate = true;
        } else {
          // No se encontró el proveedor
          if (!orderData.supplierName) {
            updates.supplierName = orderData.supplier;
          }
          needsUpdate = true;
          errors.push(`Orden ${orderDoc.id}: No se encontró proveedor "${orderData.supplier}"`);
        }
      }

      // Aplicar actualizaciones si es necesario
      if (needsUpdate) {
        batch.update(db.collection("purchaseOrders").doc(orderDoc.id), updates);
        batchCount++;
        updated++;

        // Si alcanzamos el límite del batch, ejecutar y crear nuevo
        if (batchCount >= batchSize) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } else {
        skipped++;
      }
    }

    // Ejecutar el último batch si tiene documentos pendientes
    if (batchCount > 0) {
      await batch.commit();
    }

    const successMessage = `Migración completada: ${updated} órdenes actualizadas, ${skipped} omitidas de ${total} total.`;
    
    return {
      success: errors.length === 0 || updated > 0,
      message: errors.length > 0 
        ? `${successMessage} Se encontraron ${errors.length} advertencias.`
        : successMessage,
      details: {
        total,
        updated,
        skipped,
        errors
      }
    };

  } catch (error) {
    console.error("Error during migration:", error);
    return {
      success: false,
      message: `Error durante la migración: ${error instanceof Error ? error.message : "Error desconocido"}`,
      details: {
        total,
        updated,
        skipped,
        errors
      }
    };
  }
}

/**
 * Función auxiliar para verificar el estado de migración sin hacer cambios
 */
export async function checkMigrationStatus(): Promise<{
  needsMigration: number;
  alreadyMigrated: number;
  total: number;
  examples: { id: string; project: string; supplier: string }[];
}> {
  const ordersSnapshot = await db.collection("purchaseOrders").get();
  
  // Cargar IDs de proyectos válidos
  const projectsSnapshot = await db.collection("projects").get();
  const validProjectIds = new Set(projectsSnapshot.docs.map(d => d.id));
  
  let needsMigration = 0;
  let alreadyMigrated = 0;
  const examples: { id: string; project: string; supplier: string }[] = [];

  for (const doc of ordersSnapshot.docs) {
    const data = doc.data() as PurchaseOrder;
    
    const projectIsId = validProjectIds.has(data.project);
    const hasSupplierId = !!data.supplierId;
    
    if (!projectIsId || !hasSupplierId) {
      needsMigration++;
      if (examples.length < 5) {
        examples.push({
          id: doc.id,
          project: data.project,
          supplier: data.supplier
        });
      }
    } else {
      alreadyMigrated++;
    }
  }

  return {
    needsMigration,
    alreadyMigrated,
    total: ordersSnapshot.docs.length,
    examples
  };
}
