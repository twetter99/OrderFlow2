import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Supervisor } from "@/lib/types";
import SupervisoresClientPage from "./supervisores-client-page";

async function getSupervisores(): Promise<Supervisor[]> {
  unstable_noStore();
  
  const snapshot = await db.collection("supervisores").get();
  const supervisores = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Supervisor[];
  
  // Ordenar por nombre
  return supervisores.sort((a, b) => a.name.localeCompare(b.name));
}

export default async function SupervisoresPage() {
  const supervisores = await getSupervisores();
  
  return <SupervisoresClientPage initialSupervisores={supervisores} />;
}
