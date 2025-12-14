"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Replanteo, Project, PlantillaInstalacion, Technician, InventoryItem } from "@/lib/types";
import { ReplanClientPage } from "./replan-client-page";

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

export default async function ReplanPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [replanteosSnapshot, projectsSnapshot, templatesSnapshot, techniciansSnapshot, inventorySnapshot] = await Promise.all([
    db.collection("replanteos").get(),
    db.collection("projects").get(),
    db.collection("installationTemplates").get(),
    db.collection("technicians").get(),
    db.collection("inventory").get(),
  ]);

  const replanteos: Replanteo[] = replanteosSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as Replanteo
  );

  const projects: Project[] = projectsSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as Project
  );

  const templates: PlantillaInstalacion[] = templatesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as PlantillaInstalacion));

  const technicians: Technician[] = techniciansSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Technician));

  const inventoryItems: InventoryItem[] = inventorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InventoryItem));

  return (
    <ReplanClientPage
      replanteos={replanteos}
      projects={projects}
      templates={templates}
      technicians={technicians}
      inventoryItems={inventoryItems}
    />
  );
}
