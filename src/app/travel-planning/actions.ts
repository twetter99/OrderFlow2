"use server";

import { revalidatePath } from "next/cache";
import { db, admin } from "@/lib/firebase-admin";
import { InformeViaje, GastoDetallado, Project, Technician } from "@/lib/types";
import { sendTravelReportApprovalEmail } from "@/ai/flows/send-travel-approval-email";

// Helper para generar el próximo número de informe
const getNextReportNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const sequentialNumber = Math.floor(Math.random() * 9000) + 1000; 
  return `VIAJE-${year}-${String(sequentialNumber).padStart(4, '0')}`;
};

export async function addTravelReport(data: Partial<InformeViaje>) {
  if (!data.proyecto_id || !data.tecnico_id || !data.gastos) {
    return { success: false, message: "Faltan datos clave (proyecto, técnico o gastos)." };
  }

  // Validación de fechas
  if (data.fecha_inicio && data.fecha_fin) {
    const inicio = new Date(data.fecha_inicio);
    const fin = new Date(data.fecha_fin);
    if (fin < inicio) {
      return { 
        success: false, 
        message: "La fecha de fin debe ser posterior o igual a la fecha de inicio." 
      };
    }
  }

  let docRef;
  let reportCode: string;
  let projectName: string;
  let technicianName: string;
  let totalInforme: number;

  try {
    reportCode = await getNextReportNumber();
    
    // 1. Obtener datos desnormalizados
    projectName = 'No especificado';
    technicianName = 'No especificado';

    const [projectDoc, techDoc] = await Promise.all([
      db.collection('projects').doc(data.proyecto_id).get(),
      db.collection('technicians').doc(data.tecnico_id).get()
    ]);

    if (projectDoc.exists) {
      projectName = (projectDoc.data() as Project).name;
    }

    if (techDoc.exists) {
      technicianName = (techDoc.data() as Technician).name;
    }

    // 2. Calcular el total y procesar gastos
    totalInforme = 0;
    const gastosProcesados = data.gastos.map((gasto, index) => {
      totalInforme += Number(gasto.importe);
      return {
        ...gasto,
        id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        fecha: admin.firestore.Timestamp.fromDate(new Date(gasto.fecha as string)),
      };
    });

    // 3. Crear el objeto final del informe
    const newReportData = {
      proyecto_id: data.proyecto_id,
      tecnico_id: data.tecnico_id,
      codigo_informe: reportCode,
      proyecto_name: projectName,
      tecnico_name: technicianName,
      descripcion_viaje: data.descripcion_viaje || '',
      gastos: gastosProcesados as GastoDetallado[],
      total_informe: totalInforme,
      estado: 'Pendiente de Aprobación' as const,
      fecha_inicio: admin.firestore.Timestamp.fromDate(new Date(data.fecha_inicio as string)),
      fecha_fin: admin.firestore.Timestamp.fromDate(new Date(data.fecha_fin as string)),
      fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. Guardar en Firestore
    docRef = await db.collection("travelReports").add(newReportData);
    
  } catch (error) {
    console.error("Error creando el informe de viaje: ", error);
    return { 
      success: false, 
      message: `No se pudo crear el informe: ${(error as Error).message}` 
    };
  }

  // 5. Enviar email de aprobación
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const approvalUrl = `${baseUrl}/approve-travel/${docRef.id}`;
    
    console.log(`📧 Enviando email de aprobación para informe ${docRef.id}`);
    console.log(`   → URL de aprobación: ${approvalUrl}`);

    const emailResult = await sendTravelReportApprovalEmail({
      to: process.env.APPROVAL_EMAIL || 'juan@winfin.es',
      reportId: docRef.id,
      reportCode: reportCode,
      technicianName: technicianName,
      projectName: projectName,
      totalAmount: totalInforme,
      approvalUrl: approvalUrl,
      reportDate: new Date().toISOString(),
      startDate: data.fecha_inicio as string,
      endDate: data.fecha_fin as string,
    });

    if (!emailResult.success) {
      const errorMessage = emailResult.error || "El flujo de email falló.";
      console.error(`❌ Email failed for report ${docRef.id}. Rolling back...`, errorMessage);
      await db.collection("travelReports").doc(docRef.id).delete();
      return { 
        success: false,
        message: `No se pudo enviar el email de aprobación. Error: ${errorMessage}`,
      };
    }
    
    console.log(`✅ Email enviado correctamente para informe ${docRef.id}`);
    
  } catch (emailError: any) {
    console.error(`❌ Error en proceso de email para informe ${docRef.id}. Rolling back...`, emailError);
    await db.collection("travelReports").doc(docRef.id).delete();
    return { 
      success: false, 
      message: `Falló el envío de email. Error: ${emailError.message}`,
    };
  }

  revalidatePath("/travel-planning");
  return { 
    success: true, 
    message: `Informe ${reportCode} creado y email de aprobación enviado.`, 
    id: docRef.id 
  };
}

export async function approveTravelReport(id: string, adminUserId: string) {
  if (!id || !adminUserId) {
    return { success: false, message: "Faltan parámetros requeridos." };
  }

  try {
    const reportRef = db.collection("travelReports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return { success: false, message: "El informe no existe." };
    }

    const reportData = reportDoc.data() as InformeViaje;

    if (reportData.estado === 'Aprobado') {
      return { success: false, message: "El informe ya estaba aprobado." };
    }

    if (reportData.estado === 'Rechazado') {
      return { 
        success: false, 
        message: "No se puede aprobar un informe que ya fue rechazado." 
      };
    }

    // 1. Actualizar el estado del informe
    await reportRef.update({
      estado: 'Aprobado',
      aprobado_por: adminUserId,
      fecha_aprobacion: admin.firestore.Timestamp.now()
    });

    // 2. Actualizar el gasto del proyecto
    if (reportData.proyecto_id && reportData.total_informe) {
      try {
        const projectRef = db.collection("projects").doc(reportData.proyecto_id);
        
        await db.runTransaction(async (transaction) => {
          const projectDoc = await transaction.get(projectRef);

          if (!projectDoc.exists) {
            console.warn(`⚠️ Project ${reportData.proyecto_id} not found.`);
            return;
          }

          const projectData = projectDoc.data() as Project;
          const currentSpent = projectData.spent || 0;
          const newSpent = currentSpent + reportData.total_informe;

          transaction.update(projectRef, {
            spent: newSpent,
          });

          console.log(`✅ Project ${reportData.proyecto_id} updated: ${currentSpent}€ → ${newSpent}€`);
        });

      } catch (projectError) {
        console.error("❌ Error updating project spent:", projectError);
        return {
          success: true,
          message: "Informe aprobado, pero hubo un error al actualizar el proyecto. Contacta al administrador.",
        };
      }
    }

    revalidatePath("/travel-planning");
    revalidatePath("/projects");
    
    return { 
      success: true, 
      message: `Informe aprobado. Gasto de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(reportData.total_informe)} imputado al proyecto.` 
    };

  } catch (error) {
    console.error("❌ Error aprobando el informe:", error);
    return { 
      success: false, 
      message: `No se pudo aprobar: ${(error as Error).message}` 
    };
  }
}

export async function rejectTravelReport(id: string, adminUserId: string, razon: string) {
  if (!id || !adminUserId) {
    return { success: false, message: "Faltan parámetros requeridos." };
  }

  if (!razon || razon.trim().length < 5) {
    return { 
      success: false, 
      message: "Debes proporcionar una razón de rechazo válida (mínimo 5 caracteres)." 
    };
  }

  try {
    const reportRef = db.collection("travelReports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return { success: false, message: "El informe no existe." };
    }

    const reportData = reportDoc.data() as InformeViaje;

    if (reportData.estado === 'Rechazado') {
      return { success: false, message: "El informe ya estaba rechazado." };
    }

    if (reportData.estado === 'Aprobado') {
      return { 
        success: false, 
        message: "No se puede rechazar un informe que ya fue aprobado." 
      };
    }
    
    await reportRef.update({
      estado: 'Rechazado',
      aprobado_por: adminUserId,
      notas_aprobacion: razon.trim(),
      fecha_rechazo: admin.firestore.Timestamp.now()
    });

    revalidatePath("/travel-planning");
    revalidatePath(`/approve-travel/${id}`);

    return { success: true, message: "Informe rechazado correctamente." };

  } catch (error) {
    console.error("❌ Error rechazando el informe:", error);
    return { 
      success: false, 
      message: `No se pudo rechazar: ${(error as Error).message}` 
    };
  }
}

export async function cancelTravelReport(id: string, adminUserId: string, razon: string) {
  if (!id || !adminUserId) {
    return { success: false, message: "Faltan parámetros requeridos." };
  }

  if (!razon || razon.trim().length < 5) {
    return { 
      success: false, 
      message: "Debes proporcionar una razón de cancelación válida (mínimo 5 caracteres)." 
    };
  }

  try {
    const reportRef = db.collection("travelReports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return { success: false, message: "El informe no existe." };
    }

    const reportData = reportDoc.data() as InformeViaje;

    if (reportData.estado === 'Cancelado') {
      return { success: false, message: "El informe ya estaba cancelado." };
    }

    if (reportData.estado !== 'Aprobado') {
      return { 
        success: false, 
        message: "Solo se pueden cancelar informes que estén en estado Aprobado." 
      };
    }

    // 1. Actualizar el estado del informe
    await reportRef.update({
      estado: 'Cancelado',
      cancelado_por: adminUserId,
      notas_cancelacion: razon.trim(),
      fecha_cancelacion: admin.firestore.Timestamp.now()
    });

    // 2. Restar el gasto del proyecto (operación inversa a la aprobación)
    if (reportData.proyecto_id && reportData.total_informe) {
      try {
        const projectRef = db.collection("projects").doc(reportData.proyecto_id);
        
        await db.runTransaction(async (transaction) => {
          const projectDoc = await transaction.get(projectRef);

          if (!projectDoc.exists) {
            console.warn(`⚠️ Project ${reportData.proyecto_id} not found.`);
            return;
          }

          const projectData = projectDoc.data() as Project;
          const currentSpent = projectData.spent || 0;
          const newSpent = Math.max(0, currentSpent - reportData.total_informe);

          transaction.update(projectRef, {
            spent: newSpent,
          });

          console.log(`✅ Project ${reportData.proyecto_id} updated: ${currentSpent}€ → ${newSpent}€ (cancelación)`);
        });

      } catch (projectError) {
        console.error("❌ Error updating project spent:", projectError);
        return {
          success: true,
          message: "Informe cancelado, pero hubo un error al actualizar el proyecto. Contacta al administrador.",
        };
      }
    }

    revalidatePath("/travel-planning");
    revalidatePath("/projects");

    return { 
      success: true, 
      message: `Informe cancelado. Gasto de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(reportData.total_informe)} restado del proyecto.` 
    };

  } catch (error) {
    console.error("❌ Error cancelando el informe:", error);
    return { 
      success: false, 
      message: `No se pudo cancelar: ${(error as Error).message}` 
    };
  }
}

export async function deleteTravelReport(id: string) {
  if (!id) {
    return { success: false, message: "ID de informe no proporcionado." };
  }

  try {
    const reportRef = db.collection("travelReports").doc(id);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return { success: false, message: "El informe no existe." };
    }

    const reportData = reportDoc.data() as InformeViaje;

    // Si el informe está aprobado, restar el gasto del proyecto antes de eliminar
    if (reportData.estado === 'Aprobado' && reportData.proyecto_id && reportData.total_informe) {
      try {
        const projectRef = db.collection("projects").doc(reportData.proyecto_id);
        
        await db.runTransaction(async (transaction) => {
          const projectDoc = await transaction.get(projectRef);

          if (!projectDoc.exists) {
            console.warn(`⚠️ Project ${reportData.proyecto_id} not found.`);
            return;
          }

          const projectData = projectDoc.data() as Project;
          const currentSpent = projectData.spent || 0;
          const newSpent = Math.max(0, currentSpent - reportData.total_informe);

          transaction.update(projectRef, {
            spent: newSpent,
          });

          console.log(`✅ Project ${reportData.proyecto_id} updated: ${currentSpent}€ → ${newSpent}€ (eliminación de informe aprobado)`);
        });

      } catch (projectError) {
        console.error("❌ Error updating project spent:", projectError);
        return {
          success: false,
          message: "Error al actualizar el proyecto. No se pudo eliminar el informe. Contacta al administrador.",
        };
      }
    }

    // Eliminar el informe
    await reportRef.delete();
    revalidatePath("/travel-planning");
    revalidatePath("/projects");

    const wasApproved = reportData.estado === 'Aprobado';
    const message = wasApproved 
      ? `Informe ${reportData.codigo_informe || id} eliminado correctamente. Gasto de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(reportData.total_informe)} restado del proyecto.`
      : `Informe ${reportData.codigo_informe || id} eliminado correctamente.`;

    return { 
      success: true, 
      message
    };

  } catch (error) {
    console.error("❌ Error eliminando el informe:", error);
    return { 
      success: false, 
      message: `No se pudo eliminar: ${(error as Error).message}` 
    };
  }
}

export async function deleteTravelReports(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, message: "No se proporcionaron IDs para eliminar." };
  }

  try {
    let deletedCount = 0;
    let totalRefunded = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const reportRef = db.collection("travelReports").doc(id);
      const reportDoc = await reportRef.get();

      if (!reportDoc.exists) {
        errors.push(`Informe ${id} no existe`);
        continue;
      }

      const reportData = reportDoc.data() as InformeViaje;

      // Si el informe está aprobado, restar el gasto del proyecto antes de eliminar
      if (reportData.estado === 'Aprobado' && reportData.proyecto_id && reportData.total_informe) {
        try {
          const projectRef = db.collection("projects").doc(reportData.proyecto_id);
          
          await db.runTransaction(async (transaction) => {
            const projectDoc = await transaction.get(projectRef);

            if (!projectDoc.exists) {
              console.warn(`⚠️ Project ${reportData.proyecto_id} not found.`);
              return;
            }

            const projectData = projectDoc.data() as Project;
            const currentSpent = projectData.spent || 0;
            const newSpent = Math.max(0, currentSpent - reportData.total_informe);

            transaction.update(projectRef, {
              spent: newSpent,
            });

            console.log(`✅ Project ${reportData.proyecto_id} updated: ${currentSpent}€ → ${newSpent}€`);
          });

          totalRefunded += reportData.total_informe;

        } catch (projectError) {
          console.error("❌ Error updating project spent:", projectError);
          errors.push(`${reportData.codigo_informe || id}: error al actualizar proyecto`);
          continue;
        }
      }

      // Eliminar el informe
      await reportRef.delete();
      deletedCount++;
    }

    revalidatePath("/travel-planning");
    revalidatePath("/projects");

    let message = `${deletedCount} informe(s) eliminado(s) correctamente.`;
    if (totalRefunded > 0) {
      message += ` Total restado de proyectos: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalRefunded)}.`;
    }

    return { 
      success: true, 
      message,
      details: {
        deleted: deletedCount,
        totalRefunded,
        errors
      }
    };

  } catch (error) {
    console.error("❌ Error eliminando informes:", error);
    return { 
      success: false, 
      message: `No se pudieron eliminar los informes: ${(error as Error).message}` 
    };
  }
}