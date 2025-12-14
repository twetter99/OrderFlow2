"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Location, InventoryLocation, InventoryItem, Technician } from "@/lib/types";
import { LocationsClientPage } from "./locations-client-page";

export default async function LocationsPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [locationsSnapshot, inventoryLocationsSnapshot, inventorySnapshot, techniciansSnapshot] = await Promise.all([
    db.collection("locations").get(),
    db.collection("inventoryLocations").get(),
    db.collection("inventory").get(),
    db.collection("technicians").get(),
  ]);

  const locations: Location[] = locationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Location));

  const inventoryLocations: InventoryLocation[] = inventoryLocationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InventoryLocation));

  const inventoryItems: InventoryItem[] = inventorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InventoryItem));

  const technicians: Technician[] = techniciansSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Technician));

  return (
    <LocationsClientPage
      locations={locations}
      inventoryLocations={inventoryLocations}
      inventoryItems={inventoryItems}
      technicians={technicians}
    />
  );
}
