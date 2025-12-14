"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { PurchaseOrder, Supplier, Project, Location, InventoryItem, SupplierInvoice } from "@/lib/types";
import { CompletedOrdersClientPage } from "./completed-orders-client-page";

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

export default async function CompletedOrdersPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [
    purchaseOrdersSnapshot,
    projectsSnapshot,
    suppliersSnapshot,
    locationsSnapshot,
    inventorySnapshot,
    invoicesSnapshot,
  ] = await Promise.all([
    db.collection("purchaseOrders").get(),
    db.collection("projects").get(),
    db.collection("suppliers").get(),
    db.collection("locations").get(),
    db.collection("inventory").get(),
    db.collection("supplierInvoices").get(),
  ]);

  const purchaseOrders: PurchaseOrder[] = purchaseOrdersSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as PurchaseOrder
  );

  const projects: Project[] = projectsSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as Project
  );

  const suppliers: Supplier[] = suppliersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Supplier));

  const locations: Location[] = locationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Location));

  const inventory: InventoryItem[] = inventorySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as InventoryItem));

  const invoices: SupplierInvoice[] = invoicesSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as SupplierInvoice
  );

  return (
    <CompletedOrdersClientPage
      purchaseOrders={purchaseOrders}
      projects={projects}
      suppliers={suppliers}
      locations={locations}
      inventory={inventory}
      invoices={invoices}
    />
  );
}
