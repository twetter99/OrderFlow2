import { db } from "@/lib/firebase-admin";
import { ProjectsClientPage } from "./projects-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import type { Project, Client, User, Operador, Technician } from '@/lib/types';

function convertTimestamp(timestamp: any): string | undefined {
  if (!timestamp) return undefined;
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  return timestamp;
}

async function getProjects(): Promise<Project[]> {
  noStore();
  const snapshot = await db.collection("projects").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: convertTimestamp(data.startDate),
      endDate: convertTimestamp(data.endDate),
    } as Project;
  });
}

async function getClients(): Promise<Client[]> {
  noStore();
  const snapshot = await db.collection("clients").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
}

async function getUsers(): Promise<User[]> {
  noStore();
  const snapshot = await db.collection("users").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

async function getOperadores(): Promise<Operador[]> {
  noStore();
  const snapshot = await db.collection("operadores").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operador));
}

async function getTechnicians(): Promise<Technician[]> {
  noStore();
  const snapshot = await db.collection("technicians").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));
}

export default async function ProjectsPage() {
  const [projects, clients, users, operadores, technicians] = await Promise.all([
    getProjects(),
    getClients(),
    getUsers(),
    getOperadores(),
    getTechnicians(),
  ]);

  return (
    <ProjectsClientPage
      initialProjects={projects}
      clients={clients}
      users={users}
      operadores={operadores}
      technicians={technicians}
    />
  );
}
