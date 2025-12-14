import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import type { Operador } from "@/lib/types";
import OperadoresClientPage from "./operadores-client-page";

async function getOperadores(): Promise<Operador[]> {
  unstable_noStore();
  
  const snapshot = await db.collection("operadores").get();
  const operadores = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Operador[];
  
  // Ordenar por nombre
  return operadores.sort((a, b) => a.name.localeCompare(b.name));
}

export default async function OperadoresPage() {
  const operadores = await getOperadores();
  
  return <OperadoresClientPage initialOperadores={operadores} />;
}
