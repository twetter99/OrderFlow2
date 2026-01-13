# 🔒 Configuración de Backups Automáticos de Firestore

Este documento explica cómo configurar los backups automáticos semanales de la base de datos.

## 📋 Resumen

- **Frecuencia:** Todos los domingos a las 3:00 AM (hora de Madrid)
- **Almacenamiento:** Google Cloud Storage
- **Funciones creadas:**
  - `scheduledFirestoreBackup` - Backup automático semanal
  - `manualFirestoreBackup` - Backup manual vía HTTP

---

## 🚀 Pasos de Configuración

### Paso 1: Obtener el ID de tu proyecto Firebase

```bash
firebase projects:list
```

Anota el ID del proyecto (ej: `orderflow-xxxxx`).

### Paso 2: Crear el bucket de Cloud Storage para backups

Ve a la consola de Google Cloud:
1. Abre https://console.cloud.google.com/storage
2. Selecciona tu proyecto Firebase
3. Click en "Crear bucket"
4. **Nombre del bucket:** `{TU_PROJECT_ID}-backups` (ej: `orderflow-xxxxx-backups`)
5. **Ubicación:** `europe-west1` (Bélgica) - más cercano a Madrid
6. **Clase de almacenamiento:** Standard
7. **Control de acceso:** Uniforme
8. Click en "Crear"

### Paso 3: Dar permisos a la cuenta de servicio

La cuenta de servicio de Cloud Functions necesita permisos para escribir en el bucket y exportar Firestore.

1. Ve a https://console.cloud.google.com/iam-admin/iam
2. Busca la cuenta de servicio: `{PROJECT_ID}@appspot.gserviceaccount.com`
3. Click en "Editar" (icono lápiz)
4. Añade estos roles:
   - `Cloud Datastore Import Export Admin`
   - `Storage Admin` (o `Storage Object Admin` si prefieres más restrictivo)
5. Guarda los cambios

### Paso 4: Desplegar las funciones

```bash
cd functions
npm run deploy
```

O desde la raíz del proyecto:

```bash
firebase deploy --only functions
```

### Paso 5: Verificar el despliegue

1. Ve a https://console.firebase.google.com/project/{TU_PROJECT}/functions
2. Deberías ver las dos funciones:
   - `scheduledFirestoreBackup` (tipo: Scheduled)
   - `manualFirestoreBackup` (tipo: HTTP)

---

## 🧪 Probar el Backup Manual

Una vez desplegadas las funciones, puedes probar el backup manual:

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://europe-west1-{TU_PROJECT_ID}.cloudfunctions.net/manualFirestoreBackup
```

O desde PowerShell:

```powershell
$token = gcloud auth print-identity-token
Invoke-RestMethod -Method POST `
  -Headers @{"Authorization" = "Bearer $token"} `
  -Uri "https://europe-west1-{TU_PROJECT_ID}.cloudfunctions.net/manualFirestoreBackup"
```

---

## 📁 Estructura de Backups

Los backups se guardan en el bucket con esta estructura:

```
gs://{PROJECT_ID}-backups/
├── automatic/
│   ├── 2026-01-12/          # Backup del domingo 12 enero
│   │   ├── all_namespaces/
│   │   │   └── kind_*/      # Datos por colección
│   │   └── metadata file
│   └── 2026-01-19/          # Backup del domingo 19 enero
│       └── ...
└── manual/
    └── 2026-01-13T10-30-00Z/  # Backups manuales con timestamp
        └── ...
```

---

## 🔄 Restaurar un Backup

Para restaurar un backup, usa el siguiente comando:

```bash
gcloud firestore import gs://{PROJECT_ID}-backups/automatic/2026-01-12
```

⚠️ **IMPORTANTE:** La restauración sobrescribe los datos existentes. Usa con cuidado.

---

## 💰 Costos Estimados

| Concepto | Costo aproximado |
|----------|------------------|
| Cloud Storage (Standard) | ~$0.02/GB/mes |
| Cloud Function (1 ejecución/semana) | ~$0.00 |
| Exportación Firestore | Gratis (primeras 50GB/día) |
| **Total mensual estimado** | **< $1** |

---

## 🔧 Personalización

### Cambiar la frecuencia del backup

Edita el cron en `functions/src/index.ts`:

```typescript
schedule: "0 3 * * 0"  // Domingos 3AM
// Ejemplos:
// "0 3 * * *"      - Diario a las 3AM
// "0 3 * * 1,4"    - Lunes y jueves a las 3AM
// "0 3 1 * *"      - Día 1 de cada mes a las 3AM
```

### Exportar solo algunas colecciones

Descomenta y edita en `functions/src/index.ts`:

```typescript
collectionIds: ["clients", "projects", "purchaseOrders", "inventory", "suppliers"],
```

---

## 📊 Monitorización

Puedes ver los logs de las funciones en:
- Firebase Console > Functions > Logs
- O ejecutando: `firebase functions:log`

También recibirás alertas por email si el backup falla (configurable en Cloud Monitoring).

---

## ✅ Checklist Final

- [ ] Bucket creado con nombre `{PROJECT_ID}-backups`
- [ ] Permisos IAM configurados
- [ ] Funciones desplegadas
- [ ] Backup manual probado
- [ ] Verificar primer backup automático el próximo domingo
