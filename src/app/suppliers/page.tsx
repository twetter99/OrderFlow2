import { db } from "@/lib/firebase-admin";
import { SuppliersClientPage } from "./suppliers-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import type { Supplier } from '@/lib/types';

async function getSuppliers(): Promise<Supplier[]> {
  noStore();
  const snapshot = await db.collection("suppliers").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();
  return <SuppliersClientPage initialSuppliers={suppliers} />;
}
