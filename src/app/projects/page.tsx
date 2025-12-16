import { db } from "@/lib/firebase-admin";
import { ProjectsClientPage } from "./projects-client-page";
import { unstable_noStore as noStore } from 'next/cache';
import { sanitizeForClient } from '@/lib/utils';
import type { Project, Client, User, Operador, Technician } from '@/lib/types';

async function getProjects(): Promise<Project[]> {
  noStore();
  try {
    const snapshot = await db.collection("projects").orderBy("name", "asc").get();
    return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Project);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

async function getClients(): Promise<Client[]> {
  noStore();
  try {
    const snapshot = await db.collection("clients").orderBy("name", "asc").get();
    return snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Client);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}

async function getUsers(): Promise<User[]> {
  noStore();
  try {
    const snapshot = await db.collection("usuarios").get();
    return snapshot.docs.map(doc => sanitizeForClient({ uid: doc.id, ...doc.data() }) as User);
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

async function getOperadores(): Promise<Operador[]> {
  noStore();
  try {
    const snapshot = await db.collection("operadores").get();
    const data = snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Operador);
    return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (error) {
    console.error("Error fetching operadores:", error);
    return [];
  }
}

async function getTechnicians(): Promise<Technician[]> {
  noStore();
  try {
    const snapshot = await db.collection("technicians").get();
    const data = snapshot.docs.map(doc => sanitizeForClient({ id: doc.id, ...doc.data() }) as Technician);
    return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return [];
  }
}

export default async function ProjectsPage() {
  try {
    const [projects, clients, users, operadores, technicians] = await Promise.all([
      getProjects(),
      getClients(),
      getUsers(),
      getOperadores(),
      getTechnicians(),
    ]);

    console.log("ProjectsPage data loaded:", {
      projects: projects.length,
      clients: clients.length,
      users: users.length,
      operadores: operadores.length,
      technicians: technicians.length,
    });

    return (
      <ProjectsClientPage
        initialProjects={projects}
        clients={clients}
        users={users}
        operadores={operadores}
        technicians={technicians}
      />
    );
  } catch (error) {
    console.error("Error in ProjectsPage:", error);
    throw error;
  }
}
