import { db } from "@/lib/firebase-admin";
import { ProjectsClientPage } from "./projects-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import { sanitizeForClient } from '@/lib/utils';
import type { Project, Client, User, Operador, Technician } from '@/lib/types';

async function getProjects(): Promise<Project[]> {
  noStore();
  const snapshot = await db.collection("projects").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Project);
}

async function getClients(): Promise<Client[]> {
  noStore();
  const snapshot = await db.collection("clients").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Client);
}

async function getUsers(): Promise<User[]> {
  noStore();
  const snapshot = await db.collection("usuarios").get();
  return snapshot.docs.map(doc => sanitizeForClient({ uid: doc.id, ...doc.data() }) as User);
}

async function getOperadores(): Promise<Operador[]> {
  noStore();
  const snapshot = await db.collection("operadores").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Operador);
}

async function getTechnicians(): Promise<Technician[]> {
  noStore();
  const snapshot = await db.collection("technicians").orderBy("name", "asc").get();
  return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Technician);
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
