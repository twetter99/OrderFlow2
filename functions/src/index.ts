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
import {GoogleAuth} from "google-auth-library";

// Inicializar Firebase Admin
admin.initializeApp();

// Configuración global
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// ID del proyecto Firebase
const PROJECT_ID = "orderflow-pxtw9";

// Bucket donde se guardarán los backups
const BACKUP_BUCKET = "gs://orderflow-pxtw9-backups";

/**
 * Función auxiliar para exportar Firestore usando la API REST
 */
async function exportFirestore(backupPath: string): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      outputUriPrefix: backupPath,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Export failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return result.name || "Operation started";
}

/**
 * Backup automático semanal de Firestore
 * Se ejecuta todos los domingos a las 3:00 AM (hora de Madrid)
 */
export const scheduledFirestoreBackup = onSchedule(
  {
    schedule: "0 3 * * 0", // Domingos a las 3:00 AM
    timeZone: "Europe/Madrid",
    retryCount: 3,
    memory: "256MiB",
  },
  async () => {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const backupPath = `${BACKUP_BUCKET}/automatic/${timestamp}`;

    logger.info(`🔄 Iniciando backup automático de Firestore a: ${backupPath}`);

    try {
      const operationName = await exportFirestore(backupPath);
      logger.info(`✅ Backup iniciado correctamente. Operación: ${operationName}`);
    } catch (error) {
      logger.error("❌ Error al realizar backup de Firestore:", error);
      throw error;
    }
  }
);

/**
 * Backup manual de Firestore (llamable vía HTTP)
 * URL: https://europe-west1-orderflow-pxtw9.cloudfunctions.net/manualFirestoreBackup
 */
export const manualFirestoreBackup = onRequest(
  { 
    cors: true,
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Método no permitido. Usa POST.");
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).send("No autorizado. Incluye un header Authorization.");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${BACKUP_BUCKET}/manual/${timestamp}`;

    logger.info(`🔄 Iniciando backup MANUAL de Firestore a: ${backupPath}`);

    try {
      const operationName = await exportFirestore(backupPath);
      
      res.status(200).json({
        success: true,
        message: "Backup iniciado correctamente",
        backupPath: backupPath,
        operationName: operationName,
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
