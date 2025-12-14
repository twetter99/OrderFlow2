import { Suspense } from "react";
import { BackupManager } from "./backup-manager";
import { getCollectionsList, listBackups } from "./actions";
import { Loader2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function BackupPage() {
  // Cargar datos iniciales en el servidor
  const [collectionsResult, backupsResult] = await Promise.all([
    getCollectionsList(),
    listBackups(),
  ]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <BackupManager 
          initialCollections={collectionsResult.collections}
          initialBackups={backupsResult.backups}
        />
      </Suspense>
    </div>
  );
}
