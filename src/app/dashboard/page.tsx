import { db } from "@/lib/firebase-admin";
import { DashboardClientPage } from "./dashboard-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import type { Project, PurchaseOrder, InventoryItem, InventoryLocation } from '@/lib/types';

// Función para convertir Timestamps de Firestore
function convertTimestamp(timestamp: any): string | undefined {
  if (!timestamp) return undefined;
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  return timestamp;
}

async function getProjects(): Promise<Project[]> {
  noStore();
  const snapshot = await db.collection("projects").get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: convertTimestamp(data.startDate),
      endDate: convertTimestamp(data.endDate),
    } as Project;
  });
}

async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  noStore();
  const snapshot = await db.collection("purchaseOrders").orderBy("orderDate", "desc").limit(50).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      orderDate: convertTimestamp(data.orderDate),
      expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
      approvalDate: convertTimestamp(data.approvalDate),
    } as PurchaseOrder;
  });
}

async function getInventory(): Promise<InventoryItem[]> {
  noStore();
  const snapshot = await db.collection("inventory").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InventoryItem));
}

async function getInventoryLocations(): Promise<InventoryLocation[]> {
  noStore();
  const snapshot = await db.collection("inventoryLocations").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InventoryLocation));
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
