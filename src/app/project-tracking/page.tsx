"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Project, PurchaseOrder, InformeViaje } from "@/lib/types";
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

export default async function ProjectTrackingPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [projectsSnapshot, purchaseOrdersSnapshot, travelReportsSnapshot] = await Promise.all([
    db.collection("projects").get(),
    db.collection("purchaseOrders").get(),
    db.collection("travelReports").get(),
  ]);

  const projects: Project[] = projectsSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as Project
  );

  const purchaseOrders: PurchaseOrder[] = purchaseOrdersSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as PurchaseOrder
  );

  const travelReports: InformeViaje[] = travelReportsSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as InformeViaje
  );

  return (
    <ProjectTrackingClientPage
      projects={projects}
      purchaseOrders={purchaseOrders}
      travelReports={travelReports}
    />
  );
}
