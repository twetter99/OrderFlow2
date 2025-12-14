import { db } from "@/lib/firebase-admin";
import { ClientsClientPage } from "./clients-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import type { Client } from '@/lib/types';

async function getClients(): Promise<Client[]> {
  noStore();
  const snapshot = await db.collection("clients").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
}

export default async function ClientsPage() {
  const clients = await getClients();

  return <ClientsClientPage initialClients={clients} />;
}
