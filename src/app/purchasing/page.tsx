import { unstable_noStore } from "next/cache";
import { Suspense } from "react";
import { db } from "@/lib/firebase-admin";
import type { PurchaseOrder, Supplier, InventoryItem, Project, User, Location } from "@/lib/types";
import { PurchasingClientPageNew } from "@/components/purchasing/purchasing-client-page-new";

// Helper para convertir Timestamps de Firestore a string
function convertTimestamp(timestamp: any): string {
  if (!timestamp) return '';
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') return timestamp;
  return '';
}

// Función recursiva para convertir todos los Timestamps en un objeto
function sanitizeForClient(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // Si es un Timestamp de Firestore
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  
  // Si tiene método toDate (Timestamp nativo)
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  
  // Si es un array
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForClient(item));
  }
  
  // Si es un objeto plano
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeForClient(obj[key]);
      }
    }
    return sanitized;
  }
  
  // Primitivos
  return obj;
}

function convertPurchaseOrder(doc: FirebaseFirestore.DocumentSnapshot): PurchaseOrder {
  const data = doc.data() as any;
  // Sanitizar todo el objeto recursivamente
  const sanitized = sanitizeForClient({
    id: doc.id,
    ...data,
  });
  return sanitized as PurchaseOrder;
}

function convertProject(doc: FirebaseFirestore.DocumentSnapshot): Project {
  const data = doc.data() as any;
  return sanitizeForClient({
    id: doc.id,
    ...data,
  }) as Project;
}

async function getPurchasingData() {
  unstable_noStore();

  const [
    purchaseOrdersSnapshot,
    suppliersSnapshot,
    inventorySnapshot,
    projectsSnapshot,
    usersSnapshot,
    locationsSnapshot,
  ] = await Promise.all([
    db.collection("purchaseOrders").get(),
    db.collection("suppliers").get(),
    db.collection("inventory").get(),
    db.collection("projects").get(),
    db.collection("users").get(),
    db.collection("locations").get(),
  ]);

  const purchaseOrders = purchaseOrdersSnapshot.docs.map(convertPurchaseOrder);
  const suppliers = suppliersSnapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() })) as Supplier[];
  const inventory = inventorySnapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() })) as InventoryItem[];
  const projects = projectsSnapshot.docs.map(convertProject);
  const users = usersSnapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() })) as User[];
  const locations = locationsSnapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() })) as Location[];

  return {
    purchaseOrders,
    suppliers,
    inventory,
    projects,
    users,
    locations,
  };
}

export default async function PurchasingPage() {
  const data = await getPurchasingData();
  
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Cargando órdenes de compra...</div>}>
      <PurchasingClientPageNew {...data} />
    </Suspense>
  );
}
