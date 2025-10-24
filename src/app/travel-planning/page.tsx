import { db } from "@/lib/firebase-admin";
import { GastoDetallado, InformeViaje, Project, Technician } from "@/lib/types";
import { TravelPlanningClientPage } from "./travel-planning-client-page";
import { unstable_noStore as noStore } from 'next/cache';

// Función para serializar Timestamps de Firestore a strings ISO
function serializeTimestamp(timestamp: any): string | undefined {
  if (!timestamp) return undefined;
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return timestamp;
}

// Función para traer y SERIALIZAR los datos del servidor
async function getTravelReports() {
  noStore();
  const snapshot = await db.collection("travelReports").orderBy("fecha_inicio", "desc").get();
  
  const reports = snapshot.docs.map(doc => {
    const data = doc.data();
    
    // Convertir todos los Timestamps a strings ISO
    return {
      id: doc.id,
      ...data,
      fecha_inicio: serializeTimestamp(data.fecha_inicio),
      fecha_fin: serializeTimestamp(data.fecha_fin),
      fecha_aprobacion: serializeTimestamp(data.fecha_aprobacion),
      fecha_creacion: serializeTimestamp(data.fecha_creacion),
      fecha_rechazo: serializeTimestamp(data.fecha_rechazo),
      gastos: data.gastos?.map((gasto: any) => ({
        ...gasto,
        fecha: serializeTimestamp(gasto.fecha),
      })) || [],
    } as InformeViaje;
  });

  return reports;
}

// Serializar proyectos
async function getProjects() {
  noStore();
  const snapshot = await db.collection("projects").orderBy("name", "asc").get();
  
  const projects = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Asegurarnos de que las fechas sean strings
      startDate: serializeTimestamp(data.startDate),
      endDate: serializeTimestamp(data.endDate),
    } as Project;
  });

  return projects;
}

// Serializar técnicos (no tienen timestamps, pero por consistencia)
async function getTechnicians() {
  noStore();
  const snapshot = await db.collection("technicians").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as Technician));
}

export default async function TravelPlanningPage() {
  const [reports, projects, technicians] = await Promise.all([
    getTravelReports(),
    getProjects(),
    getTechnicians()
  ]);

  return (
    <TravelPlanningClientPage 
      initialReports={reports}
      projects={projects}
      technicians={technicians}
    />
  );
}