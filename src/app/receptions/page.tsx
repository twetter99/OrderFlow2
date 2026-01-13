import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { PurchaseOrder, Location } from "@/lib/types";
import { ReceptionsClientPage } from "./receptions-client-page";

// Función robusta para convertir Timestamps de Firestore a ISO strings
function sanitizeForClient(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // Timestamp del Admin SDK (tiene _seconds y _nanoseconds)
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  
  // Objeto con método toDate (Timestamp nativo de ambos SDKs)
  if (typeof obj.toDate === 'function') {
    try {
      return obj.toDate().toISOString();
    } catch {
      return null;
    }
  }
  
  // Date nativo
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForClient(item));
  }
  
  // Objetos planos
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeForClient(obj[key]);
      }
    }
    return sanitized;
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
    sanitizeForClient({ id: doc.id, ...doc.data() }) as PurchaseOrder
  );

  const locations: Location[] = locationsSnapshot.docs.map(doc => 
    sanitizeForClient({ id: doc.id, ...doc.data() }) as Location
  );

  return (
    <ReceptionsClientPage
      purchaseOrders={purchaseOrders}
      locations={locations}
    />
  );
}
