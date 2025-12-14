"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { PurchaseOrder, Location } from "@/lib/types";
import { ReceptionsClientPage } from "./receptions-client-page";

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

export default async function ReceptionsPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [purchaseOrdersSnapshot, locationsSnapshot] = await Promise.all([
    db.collection("purchaseOrders").get(),
    db.collection("locations").get(),
  ]);

  const purchaseOrders: PurchaseOrder[] = purchaseOrdersSnapshot.docs.map(doc => 
    convertTimestamps({ id: doc.id, ...doc.data() }) as PurchaseOrder
  );

  const locations: Location[] = locationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Location));

  return (
    <ReceptionsClientPage
      purchaseOrders={purchaseOrders}
      locations={locations}
    />
  );
}
