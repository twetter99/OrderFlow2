import { db } from "@/lib/firebase-admin";
import { TechniciansClientPage } from "./technicians-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import { sanitizeForClient } from '@/lib/utils';
import type { Technician } from '@/lib/types';

async function getTechnicians(): Promise<Technician[]> {
  noStore();
  const snapshot = await db.collection("technicians").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Technician);
}

export default async function TechniciansPage() {
  const technicians = await getTechnicians();
  return <TechniciansClientPage initialTechnicians={technicians} />;
}
