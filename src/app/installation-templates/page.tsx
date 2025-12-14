"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { PlantillaInstalacion, InventoryItem } from "@/lib/types";
import { InstallationTemplatesClientPage } from "./installation-templates-client-page";

export default async function InstallationTemplatesPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [templatesSnapshot, inventorySnapshot] = await Promise.all([
    db.collection("installationTemplates").get(),
    db.collection("inventory").get(),
  ]);

  const templates: PlantillaInstalacion[] = templatesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as PlantillaInstalacion));

  const inventoryItems: InventoryItem[] = inventorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InventoryItem));

  return (
    <InstallationTemplatesClientPage
      templates={templates}
      inventoryItems={inventoryItems}
    />
  );
}
