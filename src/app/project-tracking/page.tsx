"use server";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Project, InformeViaje } from "@/lib/types";
import { ProjectTrackingClientPage } from "./project-tracking-client-page";

function convertTimestamps(obj: any): any {
  if (!obj) return obj;
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(convertTimestamps);
    }
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertTimestamps(obj[key]);
    }
    return converted;
  }
  return obj;
}

// Tipo ligero para totales pre-calculados
interface ProjectSpentData {
  projectId: string;
  spent: number;          // Materiales recibidos
  committed: number;      // Materiales comprometidos
  travelApproved: number; // Viajes aprobados
  travelPending: number;  // Viajes pendientes
}

// Función que obtiene los datos (sin caché)
async function fetchProjectTrackingData() {
  // Obtener datos en paralelo - ya no necesitamos purchaseOrders para calcular totales
  const [projectsSnapshot, travelReportsSnapshot] = await Promise.all([
    db.collection("projects").get(),
    db.collection("travelReports").get(),
  ]);

  // Proyectos - extraer solo campos necesarios y convertir timestamps
  const projects: Project[] = projectsSnapshot.docs.map(doc => {
    const data = doc.data();
    const convertDate = (val: any) => {
      if (!val) return '';
      if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString();
      if (val.toDate) return val.toDate().toISOString();
      return val;
    };
    
    return {
      id: doc.id,
      codigo_proyecto: data.codigo_proyecto || '',
      name: data.name || '',
      clientId: data.clientId || '',
      client: data.client || '',
      status: data.status || 'Planificado',
      startDate: convertDate(data.startDate),
      endDate: convertDate(data.endDate),
      budget: data.budget,
      spent: data.spent,
      centro_coste: data.centro_coste || '',
      numero_vehiculos: data.numero_vehiculos || 0,
      tipo_flota: data.tipo_flota || 'otros',
      localizacion_base: data.localizacion_base || { direccion: '', ciudad: '', provincia: '', coordenadas: { lat: 0, lng: 0 } },
      // Campos pre-calculados
      materialsReceived: data.materialsReceived || 0,
      materialsCommitted: data.materialsCommitted || 0,
      travelApproved: data.travelApproved || 0,
      travelPending: data.travelPending || 0,
    } as Project;
  });

  // Ya no necesitamos calcular desde purchaseOrders - usamos campos pre-calculados
  // Convertir de formato proyecto a formato ProjectSpentData para compatibilidad
  const projectSpentData: ProjectSpentData[] = projects.map(project => ({
    projectId: project.id,
    spent: (project.materialsReceived || 0),  // Materiales recibidos
    committed: (project.materialsCommitted || 0), // Materiales comprometidos
    travelApproved: (project.travelApproved || 0), // Viajes aprobados
    travelPending: (project.travelPending || 0), // Viajes pendientes
  }));

  // Travel reports - ya no necesario calcular totales, solo para referencia
  const travelReports = travelReportsSnapshot.docs.map(doc => {
    const data = doc.data();
    return convertTimestamps({
      id: doc.id,
      proyecto_id: data.proyecto_id || '',
      proyecto_name: data.proyecto_name || '',
      estado: data.estado || '',
      total_informe: data.total_informe || 0,
    }) as Pick<InformeViaje, 'id' | 'proyecto_id' | 'proyecto_name' | 'estado' | 'total_informe'>;
  }) as InformeViaje[];

  return {
    projects,
    projectSpentData,
    travelReports,
    cachedAt: new Date().toISOString(),
  };
}

// Caché de 5 minutos para la lista de proyectos
const getCachedProjectTrackingData = unstable_cache(
  fetchProjectTrackingData,
  ["project-tracking-list"],
  { revalidate: 300, tags: ["project-tracking"] } // 5 minutos
);

export default async function ProjectTrackingPage() {
  const { projects, projectSpentData, travelReports, cachedAt } = await getCachedProjectTrackingData();

  return (
    <ProjectTrackingClientPage
      projects={projects}
      projectSpentData={projectSpentData}
      travelReports={travelReports}
      cachedAt={cachedAt}
    />
  );
}