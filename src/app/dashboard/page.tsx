import { db } from "@/lib/firebase-admin";
import { DashboardClientPage } from "./dashboard-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import { sanitizeForClient } from '@/lib/utils';
import type { Project, PurchaseOrder, InventoryItem, InventoryLocation } from '@/lib/types';

async function getProjects(): Promise<Project[]> {
  noStore();
  const snapshot = await db.collection("projects").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Project);
}

async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  noStore();
  const snapshot = await db.collection("purchaseOrders").orderBy("orderDate", "desc").limit(50).get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as PurchaseOrder);
}

async function getInventory(): Promise<InventoryItem[]> {
  noStore();
  const snapshot = await db.collection("inventory").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as InventoryItem);
}

async function getInventoryLocations(): Promise<InventoryLocation[]> {
  noStore();
  const snapshot = await db.collection("inventoryLocations").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as InventoryLocation);
}

export default async function DashboardPage() {
  // Cargar todos los datos en paralelo en el servidor
  const [projects, purchaseOrders, inventory, inventoryLocations] = await Promise.all([
    getProjects(),
    getPurchaseOrders(),
    getInventory(),
    getInventoryLocations(),
  ]);

  return (
    <DashboardClientPage
      initialProjects={projects}
      initialPurchaseOrders={purchaseOrders}
      initialInventory={inventory}
      initialInventoryLocations={inventoryLocations}
    />
  );
}
