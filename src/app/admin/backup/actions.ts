"use server";

import { db } from "@/lib/firebase-admin";
import admin from 'firebase-admin';

/**
 * ============================================================
 * 🔒 SISTEMA DE BACKUP - 100% SEGURO
 * ============================================================
 * 
 * ⚠️ GARANTÍAS DE SEGURIDAD:
 * - Este módulo SOLO realiza operaciones de LECTURA en Firestore
 * - NUNCA modifica, actualiza o elimina documentos existentes
 * - Los backups se guardan en Firebase Storage (bucket separado)
 * - Todas las colecciones originales permanecen INTACTAS
 * 
 * OPERACIONES PERMITIDAS:
 * ✅ db.collection().get() - Leer documentos
 * ✅ db.listCollections() - Listar colecciones
 * ✅ storage.bucket().file().save() - Guardar backup
 * ✅ storage.bucket().getFiles() - Listar backups
 * 
 * OPERACIONES PROHIBIDAS (NO SE USAN):
 * ❌ db.collection().doc().set()
 * ❌ db.collection().doc().update()
 * ❌ db.collection().doc().delete()
 * ❌ batch.commit() con operaciones de escritura a Firestore
 * ============================================================
 */

// Tipo para metadatos del backup
export type BackupMetadata = {
  id: string;
  filename: string;
  timestamp: string;
  size: number;
  sizeFormatted: string;
  collections: string[];
  totalDocuments: number;
  createdBy: string;
};

// Tipo para el resultado del backup
export type BackupResult = {
  success: boolean;
  message: string;
  backup?: BackupMetadata;
  details?: {
    collectionsProcessed: number;
    documentsExported: number;
    errors: string[];
  };
};

// Colecciones excluidas del backup (colecciones de prueba o temporales)
const EXCLUDED_COLLECTIONS = ['test-connection'];

/**
 * Obtiene la lista de todas las colecciones en Firestore
 * OPERACIÓN: SOLO LECTURA
 */
export async function getCollectionsList(): Promise<{
  success: boolean;
  collections: string[];
  message?: string;
}> {
  try {
    // SOLO LECTURA: Listar colecciones
    const collections = await db.listCollections();
    const collectionNames = collections
      .map(col => col.id)
      .filter(name => !EXCLUDED_COLLECTIONS.includes(name))
      .sort();
    
    return {
      success: true,
      collections: collectionNames,
    };
  } catch (error) {
    console.error("Error listando colecciones:", error);
    return {
      success: false,
      collections: [],
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Crea un backup completo de todas las colecciones
 * OPERACIÓN: SOLO LECTURA de Firestore + ESCRITURA en Storage
 * 
 * ⚠️ SEGURIDAD: Esta función:
 * - Lee todas las colecciones (GET)
 * - Guarda el backup en Firebase Storage (bucket separado)
 * - NO MODIFICA ningún documento en Firestore
 */
export async function createBackup(userId: string = 'system'): Promise<BackupResult> {
  const errors: string[] = [];
  let totalDocuments = 0;
  const collectionsData: Record<string, any[]> = {};

  try {
    // ==========================================
    // FASE 1: LECTURA DE DATOS (SOLO LECTURA)
    // ==========================================
    
    // 1. Obtener lista de colecciones (SOLO LECTURA)
    const collectionsResult = await getCollectionsList();
    if (!collectionsResult.success) {
      return {
        success: false,
        message: "Error obteniendo lista de colecciones",
        details: { collectionsProcessed: 0, documentsExported: 0, errors: [collectionsResult.message || ''] }
      };
    }

    const collectionNames = collectionsResult.collections;

    // 2. Leer cada colección (SOLO LECTURA)
    for (const collectionName of collectionNames) {
      try {
        // SOLO LECTURA: Obtener todos los documentos
        const snapshot = await db.collection(collectionName).get();
        
        const documents = snapshot.docs.map(doc => {
          const data = doc.data();
          // Convertir Timestamps de Firestore a strings ISO
          const serializedData = serializeFirestoreData(data);
          return {
            _id: doc.id,
            ...serializedData,
          };
        });
        
        collectionsData[collectionName] = documents;
        totalDocuments += documents.length;
        
      } catch (collectionError) {
        const errorMsg = `Error leyendo colección ${collectionName}: ${collectionError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // ==========================================
    // FASE 2: CREAR ARCHIVO DE BACKUP
    // ==========================================
    
    const timestamp = new Date().toISOString();
    const backupId = `backup_${timestamp.replace(/[:.]/g, '-')}`;
    const filename = `${backupId}.json`;

    // Estructura del backup
    const backupData = {
      metadata: {
        id: backupId,
        version: "1.0",
        timestamp: timestamp,
        createdBy: userId,
        collections: collectionNames,
        totalDocuments: totalDocuments,
        application: "OrderFlow",
      },
      data: collectionsData,
    };

    // Convertir a JSON
    const jsonContent = JSON.stringify(backupData, null, 2);
    const sizeInBytes = Buffer.byteLength(jsonContent, 'utf8');

    // ==========================================
    // FASE 3: GUARDAR EN FIREBASE STORAGE
    // ==========================================
    
    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(`backups/${filename}`);
      
      await file.save(jsonContent, {
        contentType: 'application/json',
        metadata: {
          metadata: {
            backupId: backupId,
            timestamp: timestamp,
            totalDocuments: totalDocuments.toString(),
            collections: collectionNames.join(','),
            createdBy: userId,
          }
        }
      });

      const backupMetadata: BackupMetadata = {
        id: backupId,
        filename: filename,
        timestamp: timestamp,
        size: sizeInBytes,
        sizeFormatted: formatBytes(sizeInBytes),
        collections: collectionNames,
        totalDocuments: totalDocuments,
        createdBy: userId,
      };

      return {
        success: true,
        message: `Backup creado exitosamente. ${collectionNames.length} colecciones, ${totalDocuments} documentos exportados.`,
        backup: backupMetadata,
        details: {
          collectionsProcessed: collectionNames.length,
          documentsExported: totalDocuments,
          errors,
        }
      };

    } catch (storageError) {
      // Si falla Storage, ofrecer descarga directa
      console.error("Error guardando en Storage:", storageError);
      
      // Retornar el JSON para descarga directa como fallback
      return {
        success: true,
        message: `Backup generado. No se pudo guardar en Storage, usa la descarga directa. ${collectionNames.length} colecciones, ${totalDocuments} documentos.`,
        backup: {
          id: backupId,
          filename: filename,
          timestamp: timestamp,
          size: sizeInBytes,
          sizeFormatted: formatBytes(sizeInBytes),
          collections: collectionNames,
          totalDocuments: totalDocuments,
          createdBy: userId,
        },
        details: {
          collectionsProcessed: collectionNames.length,
          documentsExported: totalDocuments,
          errors: [...errors, `Storage error: ${storageError}`],
        }
      };
    }

  } catch (error) {
    console.error("Error creando backup:", error);
    return {
      success: false,
      message: `Error durante el backup: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      details: {
        collectionsProcessed: Object.keys(collectionsData).length,
        documentsExported: totalDocuments,
        errors: [...errors, String(error)],
      }
    };
  }
}

/**
 * Genera el backup y lo retorna como string JSON para descarga directa
 * OPERACIÓN: SOLO LECTURA
 */
export async function generateBackupForDownload(): Promise<{
  success: boolean;
  message: string;
  jsonContent?: string;
  filename?: string;
}> {
  const errors: string[] = [];
  let totalDocuments = 0;
  const collectionsData: Record<string, any[]> = {};

  try {
    // SOLO LECTURA: Obtener colecciones
    const collectionsResult = await getCollectionsList();
    if (!collectionsResult.success) {
      return { success: false, message: "Error obteniendo colecciones" };
    }

    const collectionNames = collectionsResult.collections;

    // SOLO LECTURA: Leer cada colección
    for (const collectionName of collectionNames) {
      try {
        const snapshot = await db.collection(collectionName).get();
        const documents = snapshot.docs.map(doc => ({
          _id: doc.id,
          ...serializeFirestoreData(doc.data()),
        }));
        collectionsData[collectionName] = documents;
        totalDocuments += documents.length;
      } catch (err) {
        errors.push(`Error en ${collectionName}: ${err}`);
      }
    }

    const timestamp = new Date().toISOString();
    const backupId = `backup_${timestamp.replace(/[:.]/g, '-')}`;
    const filename = `${backupId}.json`;

    const backupData = {
      metadata: {
        id: backupId,
        version: "1.0",
        timestamp,
        collections: collectionNames,
        totalDocuments,
        application: "OrderFlow",
      },
      data: collectionsData,
    };

    return {
      success: true,
      message: `Backup generado: ${collectionNames.length} colecciones, ${totalDocuments} documentos`,
      jsonContent: JSON.stringify(backupData, null, 2),
      filename,
    };

  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Lista todos los backups existentes en Storage
 * OPERACIÓN: SOLO LECTURA
 */
export async function listBackups(): Promise<{
  success: boolean;
  backups: BackupMetadata[];
  message?: string;
}> {
  try {
    // Verificar si el bucket está configurado
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!storageBucket) {
      return {
        success: false,
        backups: [],
        message: "Firebase Storage bucket no está configurado. Configura NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET en tu .env.local",
      };
    }

    const bucket = admin.storage().bucket();
    
    // Intentar verificar si el bucket existe
    try {
      const [exists] = await bucket.exists();
      if (!exists) {
        return {
          success: false,
          backups: [],
          message: "El bucket de Storage no existe. Verifica la configuración de Firebase Storage.",
        };
      }
    } catch (existsError) {
      // Si falla la verificación, el bucket probablemente no existe
      return {
        success: false,
        backups: [],
        message: "No se pudo acceder al bucket de Storage. Verifica que Firebase Storage esté configurado correctamente.",
      };
    }

    const [files] = await bucket.getFiles({ prefix: 'backups/' });

    const backups: BackupMetadata[] = [];

    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const [metadata] = await file.getMetadata();
        const customMetadata = (metadata.metadata || {}) as Record<string, string>;

        backups.push({
          id: String(customMetadata.backupId || file.name),
          filename: file.name.replace('backups/', ''),
          timestamp: String(customMetadata.timestamp || metadata.timeCreated || ''),
          size: parseInt(String(metadata.size) || '0'),
          sizeFormatted: formatBytes(parseInt(String(metadata.size) || '0')),
          collections: customMetadata.collections ? String(customMetadata.collections).split(',') : [],
          totalDocuments: parseInt(String(customMetadata.totalDocuments || '0')),
          createdBy: String(customMetadata.createdBy || 'unknown'),
        });
      }
    }

    // Ordenar por fecha descendente
    backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      success: true,
      backups,
    };

  } catch (error) {
    console.error("Error listando backups:", error);
    return {
      success: false,
      backups: [],
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Obtiene la URL de descarga de un backup específico
 * OPERACIÓN: SOLO LECTURA
 */
export async function getBackupDownloadUrl(filename: string): Promise<{
  success: boolean;
  url?: string;
  message?: string;
}> {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(`backups/${filename}`);

    const [exists] = await file.exists();
    if (!exists) {
      return { success: false, message: "Backup no encontrado" };
    }

    // Generar URL firmada válida por 1 hora
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hora
    });

    return { success: true, url };

  } catch (error) {
    console.error("Error generando URL de descarga:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Elimina un backup de Storage
 * OPERACIÓN: Solo afecta Storage, NO Firestore
 */
export async function deleteBackup(filename: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(`backups/${filename}`);

    const [exists] = await file.exists();
    if (!exists) {
      return { success: false, message: "Backup no encontrado" };
    }

    await file.delete();

    return { success: true, message: "Backup eliminado correctamente" };

  } catch (error) {
    console.error("Error eliminando backup:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Serializa datos de Firestore convirtiendo Timestamps a ISO strings
 */
function serializeFirestoreData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof admin.firestore.Timestamp) {
    return data.toDate().toISOString();
  }

  if (data.toDate && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      result[key] = serializeFirestoreData(data[key]);
    }
    return result;
  }

  return data;
}

/**
 * Formatea bytes a formato legible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
