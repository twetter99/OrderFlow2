import { db } from "@/lib/firebase-admin";
import { InformeViaje } from "@/lib/types";
import { TravelApprovalPage } from "./travel-approval-client";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}

async function getTravelReport(id: string): Promise<InformeViaje | null> {
  try {
    const docRef = db.collection("travelReports").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      fecha_inicio: data?.fecha_inicio?.toDate().toISOString(),
      fecha_fin: data?.fecha_fin?.toDate().toISOString(),
      fecha_aprobacion: data?.fecha_aprobacion?.toDate().toISOString(),
      fecha_creacion: data?.fecha_creacion?.toDate().toISOString(),
      fecha_rechazo: data?.fecha_rechazo?.toDate().toISOString(),
      gastos: data?.gastos?.map((gasto: any) => ({
        ...gasto,
        fecha: gasto.fecha.toDate().toISOString(),
      })),
    } as InformeViaje;
  } catch (error) {
    console.error("Error fetching travel report:", error);
    return null;
  }
}

export default async function ApproveTravelReportPage({ params }: PageProps) {
  const report = await getTravelReport(params.id);

  if (!report) {
    notFound();
  }

  return <TravelApprovalPage report={report} />;
}