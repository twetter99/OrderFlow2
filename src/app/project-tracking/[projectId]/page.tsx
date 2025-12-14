import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import { getProjectConsumption } from "../actions";
import { ProjectConsumptionClient } from "./project-consumption-client";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}

export default async function ProjectConsumptionPage({ params, searchParams }: Props) {
  unstable_noStore();
  
  const { projectId } = await params;
  const { startDate, endDate } = await searchParams;
  
  const data = await getProjectConsumption(projectId, startDate, endDate);
  
  if (!data) {
    notFound();
  }
  
  return <ProjectConsumptionClient data={data} />;
}
