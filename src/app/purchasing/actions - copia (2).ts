"use server";

import { revalidatePath } from "next/cache";
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
  
  // Fetch project name using Admin SDK
  let projectName = 'No especificado';
  if (orderData.project) {
    try {
        const projectsSnapshot = await db.collection('projects').where('name', '==', orderData.project).limit(1).get();
        if (!projectsSnapshot.empty) {
            const projectDoc = projectsSnapshot.docs[0];
            projectName = (projectDoc.data() as Project).name;
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
      projectName: projectName,
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
          // --- INICIO DE LA CORRECCIÓN ---
          // Usa la variable de entorno para el puerto local, y VERCEL_URL para producción.
          const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
          const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3000';
          const baseUrl = `${protocol}://${host}`;
          
          const approvalUrl = `${baseUrl}/approve/${docRef.id}`;
          // --- FIN DE LA CORRECCIÓN ---
          
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
    const newHistoryEntry: StatusHistoryEntry = {
      status,
      date: admin.firestore.Timestamp.now(),
      comment: comment || `Estado cambiado a ${status}`
    };
    await orderRef.update({ 
      status: status,
      statusHistory: admin.firestore.FieldValue.arrayUnion(newHistoryEntry)
    });

    revalidatePath("/purchasing");
    revalidatePath(`/approve/${id}`);
    return { success: true, message: "Estado del pedido actualizado." };
  } catch (error) {
    console.error("Error updating order status: ", error);
    return { success: false, message: "No se pudo actualizar el estado." };
  }
}

export async function deletePurchaseOrder(id: string) {
  try {
    await db.collection("purchaseOrders").doc(id).delete();
    revalidatePath("/purchasing");
    return { success: true, message: "Pedido eliminado." };
  } catch (error) {
    console.error("Error deleting purchase order: ", error);
    return { success: false, message: "No se pudo eliminar el pedido." };
  }
}

export async function deleteMultiplePurchaseOrders(ids: string[]) {
    try {
        const batch = db.batch();
        ids.forEach(id => {
            const docRef = db.collection("purchaseOrders").doc(id);
            batch.delete(docRef);
        });
        await batch.commit();
        revalidatePath("/purchasing");
        revalidatePath("/completed-orders");
        return { success: true, message: `${ids.length} pedidos eliminados.` };
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

