import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { PurchaseOrder, Supplier, InventoryItem, Project, User, Location } from "@/lib/types";
import { PurchasingClientPageNew } from "@/components/purchasing/purchasing-client-page-new";

// Helper para convertir Timestamps de Firestore
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

function convertPurchaseOrder(doc: FirebaseFirestore.DocumentSnapshot): PurchaseOrder {
  const data = doc.data() as any;
  return {
    id: doc.id,
    ...data,
    date: convertTimestamp(data.date),
    estimatedDeliveryDate: convertTimestamp(data.estimatedDeliveryDate),
    statusHistory: (data.statusHistory || []).map((entry: any) => ({
      ...entry,
      date: convertTimestamp(entry.date),
    })),
    deliveryNotes: (data.deliveryNotes || []).map((note: any) => ({
      ...note,
      uploadedAt: convertTimestamp(note.uploadedAt),
    })),
  };
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
  const suppliers = suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[];
  const inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryItem[];
  const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
  const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
  const locations = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Location[];

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
  
  return <PurchasingClientPageNew {...data} />;
}
