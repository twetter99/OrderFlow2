import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { InventoryItem, Supplier, Location, InventoryLocation } from "@/lib/types";
import { InventoryClientPageNew } from "./inventory-client-page-new";

async function getInventoryData() {
  unstable_noStore();

  const [
    inventorySnapshot,
    suppliersSnapshot,
    locationsSnapshot,
    inventoryLocationsSnapshot,
  ] = await Promise.all([
    db.collection("inventory").get(),
    db.collection("suppliers").get(),
    db.collection("locations").get(),
    db.collection("inventoryLocations").get(),
  ]);

  const inventory = inventorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as InventoryItem[];

  const suppliers = suppliersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Supplier[];

  const locations = locationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Location[];

  const inventoryLocations = inventoryLocationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as InventoryLocation[];

  return {
    inventory,
    suppliers,
    locations,
    inventoryLocations,
  };
}

export default async function InventoryPage() {
  const data = await getInventoryData();
  
  return <InventoryClientPageNew {...data} />;
}
