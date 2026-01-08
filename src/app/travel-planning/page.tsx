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

// Serializar proyectos - solo campos necesarios
async function getProjects() {
  noStore();
  const snapshot = await db.collection("projects").orderBy("name", "asc").get();
  
  const projects = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      codigo_proyecto: data.codigo_proyecto || '',
      name: data.name || '',
      clientId: data.clientId || '',
      client: data.client || '',
      status: data.status || 'Planificado',
      startDate: serializeTimestamp(data.startDate) || '',
      endDate: serializeTimestamp(data.endDate) || '',
      budget: data.budget,
      spent: data.spent,
      centro_coste: data.centro_coste || '',
      numero_vehiculos: data.numero_vehiculos || 0,
      tipo_flota: data.tipo_flota || 'otros',
      localizacion_base: data.localizacion_base || { direccion: '', ciudad: '', provincia: '', coordenadas: { lat: 0, lng: 0 } },
    } as Project;
  });

  return projects;
}

// Serializar técnicos - solo campos necesarios
async function getTechnicians() {
  noStore();
  const snapshot = await db.collection("technicians").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      name: data.name || '',
      specialty: data.specialty || '',
      category: data.category || '',
      phone: data.phone || '',
      notes: data.notes || '',
      rates: data.rates || {},
    } as Technician;
  });
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