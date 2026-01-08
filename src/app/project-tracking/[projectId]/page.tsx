import { unstable_cache, revalidateTag } from "next/cache";
import { notFound } from "next/navigation";
import { getProjectConsumption } from "../actions";
import { ProjectConsumptionClient } from "./project-consumption-client";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}

// Función cacheada para obtener consumo de proyecto - 5 minutos de caché
const getCachedProjectConsumption = unstable_cache(
  async (projectId: string, startDate?: string, endDate?: string) => {
    const data = await getProjectConsumption(projectId, startDate, endDate);
    // Añadir timestamp de cuando se cachearon los datos
    return data ? { ...data, cachedAt: new Date().toISOString() } : null;
  },
  ["project-consumption"],
  { revalidate: 300, tags: ["project-consumption"] } // Caché por 5 minutos (300 segundos)
);

export default async function ProjectConsumptionPage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { startDate, endDate } = await searchParams;
  
  // Usar datos cacheados - reduce consultas a Firestore
  const data = await getCachedProjectConsumption(projectId, startDate, endDate);
  
  if (!data) {
    notFound();
  }
  
  return <ProjectConsumptionClient data={data} />;
}
