import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { DeliveryNote, Client, Project, InventoryItem, Location, InventoryLocation } from "@/lib/types";
import { DespatchesClientPage } from "./despatches-client-page";

function convertTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
}

async function getDespatchesData() {
  unstable_noStore();

  const [
    deliveryNotesSnapshot,
    clientsSnapshot,
    projectsSnapshot,
    inventorySnapshot,
    locationsSnapshot,
    inventoryLocationsSnapshot,
  ] = await Promise.all([
    db.collection("deliveryNotes").get(),
    db.collection("clients").get(),
    db.collection("projects").get(),
    db.collection("inventory").get(),
    db.collection("locations").get(),
    db.collection("inventoryLocations").get(),
  ]);

  const deliveryNotes = deliveryNotesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: convertTimestamp(data.date),
    } as DeliveryNote;
  });

  const clients = clientsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Client[];

  const projects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Project[];

  const inventory = inventorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as InventoryItem[];

  const locations = locationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Location[];

  const inventoryLocations = inventoryLocationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as InventoryLocation[];

  return {
    deliveryNotes,
    clients,
    projects,
    inventory,
    locations,
    inventoryLocations,
  };
}

export default async function DespatchesPage() {
  const data = await getDespatchesData();
  
  return <DespatchesClientPage {...data} />;
}
