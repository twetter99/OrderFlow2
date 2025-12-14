"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Payment, SupplierInvoice } from "@/lib/types";
import { PaymentsClientPage } from "./payments-client-page";

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

export default async function PaymentsPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [paymentsSnapshot, invoicesSnapshot] = await Promise.all([
    db.collection("payments").get(),
    db.collection("supplierInvoices").get(),
  ]);

  const payments: Payment[] = paymentsSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as Payment
  );

  const invoices: SupplierInvoice[] = invoicesSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as SupplierInvoice
  );

  return (
    <PaymentsClientPage
      payments={payments}
      invoices={invoices}
    />
  );
}
