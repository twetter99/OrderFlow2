"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db, admin } from "@/lib/firebase-admin"; // Use admin SDK for backend actions
import type { PurchaseOrder, StatusHistoryEntry, DeliveryNoteAttachment, Project } from "@/lib/types";
import { sendApprovalEmail } from "@/ai/flows/send-approval-email";

// Helper to generate the next order number
const getNextOrderNumber = async (): Promise<string> => {
    const today = new Date();
    const year = today.getFullYear();
    // In a real app, we would read a counter from Firestore and increment it atomically.
    // For this prototype, we'll use a random number to simulate it.
    const sequentialNumber = Math.floor(Math.random() * 900) + 100; // Simulates a counter
    return `WF-PO-${year}-${String(sequentialNumber).padStart(4, '0')}`;
};

export async function addPurchaseOrder(orderData: Partial<PurchaseOrder>) {
  let docRef;
  const newOrderNumber = await getNextOrderNumber();
  const orderDate = new Date();
  
  // Fetch project name using Admin SDK - OPTIMIZADO: usar ID directo si está disponible
  let projectName = orderData.projectName || 'No especificado';
  let projectId = orderData.project || '';
  
  if (orderData.project && !orderData.projectName) {
    try {
        // OPTIMIZADO: Consulta directa por ID (más rápido que where)
        const projectDoc = await db.collection('projects').doc(orderData.project).get();
        if (projectDoc.exists) {
            projectName = (projectDoc.data() as Project).name;
            projectId = projectDoc.id;
        } else {
            // FALLBACK: Si el project es un nombre (datos legacy), buscar por nombre
            const projectsSnapshot = await db.collection('projects').where('name', '==', orderData.project).limit(1).get();
            if (!projectsSnapshot.empty) {
                const legacyProjectDoc = projectsSnapshot.docs[0];
                projectName = (legacyProjectDoc.data() as Project).name;
                projectId = legacyProjectDoc.id;
            }
        }
    } catch (e) {
        console.error("Could not fetch project name for email.", e);
    }
  }
  
  try {
    const historyEntry: StatusHistoryEntry = {
        status: orderData.status || 'Pendiente de Aprobación',
        date: admin.firestore.Timestamp.fromDate(orderDate),
        comment: 'Pedido creado'
    };
    
    docRef = await db.collection("purchaseOrders").add({
      ...orderData,
      orderNumber: newOrderNumber,
      project: projectId, // Guardar siempre el ID del proyecto
      projectName: projectName,
      // Guardar supplier info normalizada si viene del nuevo frontend
      ...(orderData.supplierId && { supplierId: orderData.supplierId }),
      ...(orderData.supplierName && { supplierName: orderData.supplierName }),
      date: admin.firestore.Timestamp.fromDate(orderDate),
      estimatedDeliveryDate: admin.firestore.Timestamp.fromDate(new Date(orderData.estimatedDeliveryDate as string)),
      statusHistory: [historyEntry]
    });
    
  } catch (error) {
    console.error("Error creating purchase order in Firestore: ", error);
    return { success: false, message: "No se pudo crear el pedido en la base de datos." };
  }

  if (orderData.status === 'Pendiente de Aprobación') {
      try {
          const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
          const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3000';
          const baseUrl = `${protocol}://${host}`;
          
          const approvalUrl = `${baseUrl}/approve/${docRef.id}`;
          
          console.log(`Triggering approval email for order ${docRef.id} to juan@winfin.es`);
          console.log(`Generated approval URL: ${approvalUrl}`);

          const emailResult = await sendApprovalEmail({
              to: 'juan@winfin.es',
              orderId: docRef.id,
              orderNumber: newOrderNumber,
              orderAmount: orderData.total || 0,
              approvalUrl: approvalUrl,
              orderDate: orderDate.toISOString(),
              projectName: projectName
          });

          if (!emailResult.success) {
               const errorMessage = emailResult.error || "El flujo de email falló sin un mensaje específico.";
               console.error(`CRITICAL: Email failed for order ${docRef.id}. Rolling back... Error details:`, errorMessage);
               await db.collection("purchaseOrders").doc(docRef.id).delete();
               return { 
                  success: false,
                  message: `No se pudo enviar el email de aprobación. La orden de compra no ha sido creada. Error: ${errorMessage}`,
              };
          }
          
          console.log(`Successfully sent approval email for order ${docRef.id}.`);
          revalidatePath("/purchasing");
          return { success: true, message: `Pedido ${newOrderNumber} creado y email de aprobación enviado.`, id: docRef.id, warning: emailResult.success === false };
      
      } catch (emailError: any) {
          console.error(`CRITICAL: The entire email process failed for order ${docRef.id}. Rolling back... Full error:`, emailError);
          await db.collection("purchaseOrders").doc(docRef.id).delete();
          return { 
              success: false, 
              message: `Falló el proceso de envío de email. La orden no ha sido creada. Error: ${emailError.message}`,
          };
      }
  }

  revalidatePath("/purchasing");
  return { success: true, message: `Pedido ${newOrderNumber} creado exitosamente.`, id: docRef.id };
}


export async function createPurchaseOrder(orderData: Partial<PurchaseOrder>) {
  try {
    const newOrderNumber = await getNextOrderNumber();
    const docRef = await db.collection("purchaseOrders").add({
        ...orderData,
        orderNumber: newOrderNumber,
        projectName: orderData.projectName || 'No especificado'
    });
    return { success: true, id: docRef.id };
  } catch(e) {
    return { success: false, message: (e as Error).message };
  }
}


export async function updatePurchaseOrder(id: string, orderData: Partial<PurchaseOrder>) {
  try {
    const orderRef = db.collection("purchaseOrders").doc(id);

    if (orderData.project && !orderData.projectName) {
      try {
        const projectDoc = await db.collection('projects').doc(orderData.project).get();
        if (projectDoc.exists) {
          orderData.projectName = (projectDoc.data() as Project).name;
        }
      } catch(e) {
        console.error("Could not fetch project name during update", e);
      }
    }

    await orderRef.update({
        ...orderData,
        ...(orderData.date && { date: admin.firestore.Timestamp.fromDate(new Date(orderData.date as any)) }),
        ...(orderData.estimatedDeliveryDate && { estimatedDeliveryDate: admin.firestore.Timestamp.fromDate(new Date(orderData.estimatedDeliveryDate as any)) }),
    });
    revalidatePath("/purchasing");
    return { success: true, message: "Pedido actualizado exitosamente." };
  } catch (error) {
    console.error("Error updating purchase order: ", error);
    return { success: false, message: "No se pudo actualizar el pedido." };
  }
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status'], comment?: string) {
  try {
    const orderRef = db.collection("purchaseOrders").doc(id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return { success: false, message: "La orden de compra no existe." };
    }

    const orderData = orderDoc.data() as PurchaseOrder;
    const previousStatus = orderData.status;

    const newHistoryEntry: StatusHistoryEntry = {
      status,
      date: admin.firestore.Timestamp.now(),
      comment: comment || `Estado cambiado a ${status}`
    };

    await orderRef.update({ 
      status: status,
      statusHistory: admin.firestore.FieldValue.arrayUnion(newHistoryEntry)
    });

    // ✅ OPTIMIZADO: Actualizar el spent del proyecto cuando se aprueba
    if (status === 'Aprobada' && previousStatus !== 'Aprobada' && orderData.project && orderData.total) {
      try {
        // OPTIMIZADO: Intentar consulta directa por ID primero
        let projectRef = db.collection('projects').doc(orderData.project);
        let projectDoc = await projectRef.get();
        
        // FALLBACK: Si no existe con ese ID, puede ser un nombre (datos legacy)
        if (!projectDoc.exists) {
          const projectsSnapshot = await db.collection('projects')
            .where('name', '==', orderData.project)
            .limit(1)
            .get();
          
          if (!projectsSnapshot.empty) {
            projectDoc = projectsSnapshot.docs[0];
            projectRef = db.collection('projects').doc(projectDoc.id);
          }
        }

        if (projectDoc.exists) {
          await db.runTransaction(async (transaction) => {
            const projectData = (await transaction.get(projectRef)).data() as Project;
            const currentSpent = projectData.spent || 0;
            const newSpent = currentSpent + orderData.total;
            const currentMaterialsCommitted = projectData.materialsCommitted || 0;

            transaction.update(projectRef, {
              spent: newSpent,
              materialsCommitted: currentMaterialsCommitted + orderData.total,
            });

            console.log(`✅ Project ${orderData.project} updated: spent ${currentSpent}€ → ${newSpent}€, materialsCommitted +${orderData.total}€`);
          });
          
          revalidateTag("project-tracking");
          revalidateTag(`project-${projectDoc.id}`);
        } else {
          console.warn(`⚠️ Project "${orderData.project}" not found when trying to update spent.`);
        }
      } catch (projectError) {
        console.error("❌ Error updating project spent:", projectError);
        // No fallar la aprobación si hay error actualizando el proyecto
      }
    }

    revalidatePath("/purchasing");
    revalidatePath("/projects");
    revalidatePath("/project-tracking");
    revalidatePath(`/approve/${id}`);
    return { success: true, message: "Estado del pedido actualizado." };
  } catch (error) {
    console.error("Error updating order status: ", error);
    return { success: false, message: "No se pudo actualizar el estado." };
  }
}

/**
 * Limpia TODOS los datos derivados de una orden de compra antes de eliminarla.
 * Incluye: inventory_history, inventoryLocations (stock), project totals,
 * supplierInvoices (referencias), y backorders.
 */
async function cleanupOrderData(orderId: string, orderData: PurchaseOrder) {
  const cleanupLog: string[] = [];
  let historyDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  try {
    // 1. Limpiar inventory_history y revertir stock en inventoryLocations
    const historySnapshot = await db.collection("inventory_history")
      .where("purchaseOrderId", "==", orderId)
      .get();
    historyDocs = historySnapshot.docs;

    if (!historySnapshot.empty) {
      const batch = db.batch();
      let totalRevertedAmount = 0;

      for (const doc of historySnapshot.docs) {
        const historyData = doc.data();

        // Revertir stock en inventoryLocations
        if (historyData.itemId && historyData.locationId && historyData.quantity) {
          const invLocSnapshot = await db.collection("inventoryLocations")
            .where("itemId", "==", historyData.itemId)
            .where("locationId", "==", historyData.locationId)
            .get();

          if (!invLocSnapshot.empty) {
            const locDoc = invLocSnapshot.docs[0];
            const currentQty = locDoc.data().quantity || 0;
            const newQty = Math.max(0, currentQty - Math.abs(historyData.quantity));
            batch.update(locDoc.ref, { quantity: newQty });
            cleanupLog.push(`inventoryLocations: ${historyData.itemName} → ${newQty}`);
          }
        }

        totalRevertedAmount += historyData.totalPrice || 0;
        batch.delete(doc.ref);
      }

      await batch.commit();
      cleanupLog.push(`inventory_history: ${historySnapshot.size} registros eliminados (${totalRevertedAmount.toFixed(2)}€)`);
    }

    // 2. Revertir totales del proyecto
    if (orderData.project && orderData.total) {
      try {
        let projectRef = db.collection("projects").doc(orderData.project);
        let projectDoc = await projectRef.get();

        if (!projectDoc.exists && orderData.projectName) {
          const byName = await db.collection("projects")
            .where("name", "==", orderData.projectName).limit(1).get();
          if (!byName.empty) {
            projectDoc = byName.docs[0];
            projectRef = db.collection("projects").doc(projectDoc.id);
          }
        }

        if (projectDoc.exists) {
          const projectData = projectDoc.data() as Project;
          const updates: Record<string, number> = {};
          const status = orderData.status;

          if (status === 'Aprobada' || status === 'Enviada al Proveedor') {
            updates.spent = Math.max(0, (projectData.spent || 0) - orderData.total);
            updates.materialsCommitted = Math.max(0, (projectData.materialsCommitted || 0) - orderData.total);
          } else if (status === 'Recibida') {
            updates.spent = Math.max(0, (projectData.spent || 0) - orderData.total);
            updates.materialsReceived = Math.max(0, (projectData.materialsReceived || 0) - orderData.total);
          } else if (status === 'Recibida Parcialmente') {
            const receivedAmount = historyDocs.reduce((sum, d) => sum + (d.data().totalPrice || 0), 0);
            const pendingAmount = orderData.total - receivedAmount;
            updates.spent = Math.max(0, (projectData.spent || 0) - orderData.total);
            updates.materialsReceived = Math.max(0, (projectData.materialsReceived || 0) - receivedAmount);
            updates.materialsCommitted = Math.max(0, (projectData.materialsCommitted || 0) - pendingAmount);
          }
          // Pendiente de Aprobación y Rechazado no afectan totales

          if (Object.keys(updates).length > 0) {
            await projectRef.update(updates);
            cleanupLog.push(`project ${orderData.projectName}: ${JSON.stringify(updates)}`);
          }
        }
      } catch (projErr) {
        console.error("⚠️ Error revirtiendo totales del proyecto:", projErr);
      }
    }

    // 3. Limpiar referencia en supplierInvoices
    const invoicesSnapshot = await db.collection("supplierInvoices")
      .where("purchaseOrderIds", "array-contains", orderId)
      .get();

    if (!invoicesSnapshot.empty) {
      const batch = db.batch();
      for (const doc of invoicesSnapshot.docs) {
        batch.update(doc.ref, {
          purchaseOrderIds: admin.firestore.FieldValue.arrayRemove(orderId)
        });
      }
      await batch.commit();
      cleanupLog.push(`supplierInvoices: referencia eliminada de ${invoicesSnapshot.size} facturas`);
    }

    // 4. Limpiar relaciones de backorders
    if (orderData.backorderIds && orderData.backorderIds.length > 0) {
      const batch = db.batch();
      for (const backorderId of orderData.backorderIds) {
        const backorderRef = db.collection("purchaseOrders").doc(backorderId);
        const backorderDoc = await backorderRef.get();
        if (backorderDoc.exists) {
          batch.update(backorderRef, { originalOrderId: admin.firestore.FieldValue.delete() });
        }
      }
      await batch.commit();
      cleanupLog.push(`backorders: ${orderData.backorderIds.length} hijos desvinculados`);
    }

    if (orderData.originalOrderId) {
      const parentRef = db.collection("purchaseOrders").doc(orderData.originalOrderId);
      const parentDoc = await parentRef.get();
      if (parentDoc.exists) {
        await parentRef.update({
          backorderIds: admin.firestore.FieldValue.arrayRemove(orderId)
        });
        cleanupLog.push(`padre ${orderData.originalOrderId}: referencia de backorder eliminada`);
      }
    }

  } catch (error) {
    console.error("❌ Error durante limpieza de datos de orden:", error);
    cleanupLog.push(`❌ Error: ${(error as Error).message}`);
  }

  return cleanupLog;
}

export async function deletePurchaseOrder(id: string) {
  try {
    // Leer la orden ANTES de eliminarla para hacer limpieza completa
    const orderDoc = await db.collection("purchaseOrders").doc(id).get();

    if (orderDoc.exists) {
      const orderData = { id: orderDoc.id, ...orderDoc.data() } as PurchaseOrder;
      const cleanupLog = await cleanupOrderData(id, orderData);
      console.log(`🧹 Limpieza para orden ${id}:`, cleanupLog);
    }

    await db.collection("purchaseOrders").doc(id).delete();

    revalidatePath("/purchasing");
    revalidatePath("/completed-orders");
    revalidatePath("/inventory");
    revalidatePath("/project-tracking");
    revalidateTag("project-tracking");
    return { success: true, message: "Pedido eliminado y datos relacionados limpiados." };
  } catch (error) {
    console.error("Error deleting purchase order: ", error);
    return { success: false, message: "No se pudo eliminar el pedido." };
  }
}

export async function deleteMultiplePurchaseOrders(ids: string[]) {
    try {
        // Limpiar datos de cada orden antes de eliminarlas
        for (const id of ids) {
          const orderDoc = await db.collection("purchaseOrders").doc(id).get();
          if (orderDoc.exists) {
            const orderData = { id: orderDoc.id, ...orderDoc.data() } as PurchaseOrder;
            const cleanupLog = await cleanupOrderData(id, orderData);
            console.log(`🧹 Limpieza para orden ${id}:`, cleanupLog);
          }
        }

        const batch = db.batch();
        ids.forEach(id => {
            const docRef = db.collection("purchaseOrders").doc(id);
            batch.delete(docRef);
        });
        await batch.commit();

        revalidatePath("/purchasing");
        revalidatePath("/completed-orders");
        revalidatePath("/inventory");
        revalidatePath("/project-tracking");
        revalidateTag("project-tracking");
        return { success: true, message: `${ids.length} pedidos eliminados y datos relacionados limpiados.` };
    } catch(error) {
        console.error("Error deleting multiple orders: ", error);
        return { success: false, message: "No se pudieron eliminar los pedidos." };
    }
}

export async function linkDeliveryNoteToPurchaseOrder(orderId: string, notes: DeliveryNoteAttachment[]) {
    try {
        const orderRef = db.collection("purchaseOrders").doc(orderId);
        const notesToStore = notes.map(note => ({
            ...note,
            uploadedAt: admin.firestore.Timestamp.now()
        }));

        await orderRef.update({
            deliveryNotes: admin.firestore.FieldValue.arrayUnion(...notesToStore),
            hasDeliveryNotes: true,
            lastDeliveryNoteUpload: admin.firestore.Timestamp.now(),
        });
        revalidatePath(`/purchasing`);
        return { success: true, message: 'Albarán adjuntado con éxito.' };
    } catch (error) {
        console.error("Error linking delivery note: ", error);
        return { success: false, message: "No se pudo adjuntar el albarán en la base de datos." };
    }
}
