"use server";

import { unstable_noStore } from "next/cache";
import { db } from "@/lib/firebase-admin";
import { sanitizeForClient } from "@/lib/utils";
import type { User, Technician, Supervisor } from "@/lib/types";
import { UsersClientPage } from "./users-client-page";

export default async function UsersPage() {
  unstable_noStore();

  // Fetch all data server-side
  const [usersSnapshot, techniciansSnapshot, supervisorsSnapshot] = await Promise.all([
    db.collection("usuarios").get(),
    db.collection("technicians").get(),
    db.collection("supervisores").get(),
  ]);

  const users: User[] = usersSnapshot.docs.map(doc => 
    sanitizeForClient({ uid: doc.id, ...doc.data() }) as User
  );

  const technicians: Technician[] = techniciansSnapshot.docs.map(doc => 
    sanitizeForClient({ id: doc.id, ...doc.data() }) as Technician
  );

  const supervisors: Supervisor[] = supervisorsSnapshot.docs.map(doc => 
    sanitizeForClient({ id: doc.id, ...doc.data() }) as Supervisor
  );

  return (
    <UsersClientPage
      users={users}
      technicians={technicians}
      supervisors={supervisors}
    />
  );
}
