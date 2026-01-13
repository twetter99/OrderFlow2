/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Inicializar Firebase Admin
admin.initializeApp();

// Configuración global
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// ID del proyecto Firebase (se obtiene automáticamente)
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

// Bucket donde se guardarán los backups
const BACKUP_BUCKET = `gs://orderflow-pxtw9-backups`;

/**
 * Backup automático semanal de Firestore
 * Se ejecuta todos los domingos a las 3:00 AM (hora de Madrid)
 * 
 * Cron: "0 3 * * 0" = minuto 0, hora 3, cualquier día del mes, cualquier mes, domingo
 */
export const scheduledFirestoreBackup = onSchedule(
  {
    schedule: "0 3 * * 0", // Domingos a las 3:00 AM
    timeZone: "Europe/Madrid",
    retryCount: 3,
    memory: "256MiB",
  },
  async (event) => {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const backupPath = `${BACKUP_BUCKET}/automatic/${timestamp}`;

    logger.info(`🔄 Iniciando backup automático de Firestore a: ${backupPath}`);

    try {
      const client = new admin.firestore.v1.FirestoreAdminClient();

      const databaseName = client.databasePath(PROJECT_ID!, "(default)");

      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: backupPath,
        // Si quieres exportar solo colecciones específicas, descomenta:
        // collectionIds: ["clients", "projects", "purchaseOrders", "inventory", "suppliers"],
      });

      logger.info(`✅ Backup iniciado correctamente. Operación: ${operation.name}`);
      
      // El backup se ejecuta de forma asíncrona, aquí solo verificamos que se inició
      return;
    } catch (error) {
      logger.error("❌ Error al realizar backup de Firestore:", error);
      throw error; // Re-lanzar para que Cloud Functions marque la ejecución como fallida
    }
  }
);

/**
 * Backup manual de Firestore (llamable vía HTTP)
 * Útil para hacer backups antes de cambios importantes
 * 
 * URL: https://europe-west1-{PROJECT_ID}.cloudfunctions.net/manualFirestoreBackup
 */
export const manualFirestoreBackup = onRequest(
  { 
    cors: true,
    memory: "256MiB",
  },
  async (req, res) => {
    // Verificar que sea una petición POST
    if (req.method !== "POST") {
      res.status(405).send("Método no permitido. Usa POST.");
      return;
    }

    // Verificación básica de autorización (puedes mejorarla con tokens)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).send("No autorizado. Incluye un header Authorization.");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${BACKUP_BUCKET}/manual/${timestamp}`;

    logger.info(`🔄 Iniciando backup MANUAL de Firestore a: ${backupPath}`);

    try {
      const client = new admin.firestore.v1.FirestoreAdminClient();
      const databaseName = client.databasePath(PROJECT_ID!, "(default)");

      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: backupPath,
      });

      logger.info(`✅ Backup manual iniciado. Operación: ${operation.name}`);
      
      res.status(200).json({
        success: true,
        message: "Backup iniciado correctamente",
        backupPath: backupPath,
        operationName: operation.name,
      });
    } catch (error) {
      logger.error("❌ Error al realizar backup manual:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
);
