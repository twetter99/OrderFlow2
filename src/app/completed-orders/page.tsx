"use server";

import { Suspense } from "react";
import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { PurchaseOrder, Supplier, Project, Location, InventoryItem, SupplierInvoice } from "@/lib/types";
import { CompletedOrdersClientPage } from "./completed-orders-client-page";
import { sanitizeForClient } from "@/lib/utils";

export default async function CompletedOrdersPage() {
  unstable_noStore();

  try {
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
      sanitizeForClient({ id: doc.id, ...doc.data() }) as PurchaseOrder
    );

    const projects: Project[] = projectsSnapshot.docs.map(doc => 
      sanitizeForClient({ id: doc.id, ...doc.data() }) as Project
    );

    const suppliers: Supplier[] = suppliersSnapshot.docs.map(doc => 
      sanitizeForClient({ id: doc.id, ...doc.data() }) as Supplier
    );

    const locations: Location[] = locationsSnapshot.docs.map(doc => 
      sanitizeForClient({ id: doc.id, ...doc.data() }) as Location
    );

    const inventory: InventoryItem[] = inventorySnapshot.docs.map(doc => 
      sanitizeForClient({ id: doc.id, ...doc.data() }) as InventoryItem
    );

    const invoices: SupplierInvoice[] = invoicesSnapshot.docs.map(doc => 
      sanitizeForClient({ id: doc.id, ...doc.data() }) as SupplierInvoice
    );

    return (
      <Suspense fallback={<div className="p-6">Cargando órdenes finalizadas...</div>}>
        <CompletedOrdersClientPage
          purchaseOrders={purchaseOrders}
          projects={projects}
          suppliers={suppliers}
          locations={locations}
          inventory={inventory}
          invoices={invoices}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading completed orders:", error);
    return (
      <div className="p-6 text-red-600">
        Error al cargar las órdenes completadas. Por favor, inténtelo de nuevo.
      </div>
    );
  }
}
