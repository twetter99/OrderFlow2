import { getCollectionsList, listBackups } from "@/app/admin/backup/actions";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  // Cargar datos para el módulo de backup
  let collections: string[] = [];
  let backups: any[] = [];
  let storageConfigured = true;

  try {
    const collectionsResult = await getCollectionsList();
    collections = collectionsResult.success ? collectionsResult.collections : [];
  } catch (error) {
    console.error("Error cargando colecciones:", error);
  }

  try {
    const backupsResult = await listBackups();
    if (backupsResult.success) {
      backups = backupsResult.backups;
    } else {
      // Si el mensaje indica que el bucket no existe, Storage no está configurado
      if (backupsResult.message?.includes('bucket does not exist') || 
          backupsResult.message?.includes('does not exist')) {
        storageConfigured = false;
      }
    }
  } catch (error) {
    console.error("Error cargando backups:", error);
    storageConfigured = false;
  }

  return (
    <SettingsClient 
      initialCollections={collections}
      initialBackups={backups}
      storageConfigured={storageConfigured}
    />
  );
}
