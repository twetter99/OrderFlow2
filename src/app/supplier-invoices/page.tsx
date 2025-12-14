import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { SupplierInvoice, Supplier, PurchaseOrder, Project } from "@/lib/types";
import { SupplierInvoicesClientPage } from "./supplier-invoices-client-page";

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

function convertInvoiceTimestamps(data: any): SupplierInvoice {
  return {
    ...data,
    emissionDate: convertTimestamp(data.emissionDate),
    dueDate: convertTimestamp(data.dueDate),
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  };
}

function convertPurchaseOrderTimestamps(data: any): PurchaseOrder {
  return {
    ...data,
    date: convertTimestamp(data.date),
    estimatedDeliveryDate: convertTimestamp(data.estimatedDeliveryDate),
  };
}

async function getSupplierInvoicesData() {
  unstable_noStore();

  const [
    invoicesSnapshot,
    suppliersSnapshot,
    purchaseOrdersSnapshot,
    projectsSnapshot,
  ] = await Promise.all([
    db.collection("supplierInvoices").get(),
    db.collection("suppliers").get(),
    db.collection("purchaseOrders").get(),
    db.collection("projects").get(),
  ]);

  const invoices = invoicesSnapshot.docs.map(doc => 
    convertInvoiceTimestamps({ id: doc.id, ...doc.data() })
  );

  const suppliers = suppliersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Supplier[];

  const purchaseOrders = purchaseOrdersSnapshot.docs.map(doc => 
    convertPurchaseOrderTimestamps({ id: doc.id, ...doc.data() })
  );

  const projects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Project[];

  return {
    invoices,
    suppliers,
    purchaseOrders,
    projects,
  };
}

export default async function SupplierInvoicesPage() {
  const data = await getSupplierInvoicesData();
  
  return <SupplierInvoicesClientPage {...data} />;
}
