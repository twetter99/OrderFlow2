
import admin from 'firebase-admin';

// Define the shape of your service account credentials
interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

// Function to safely initialize and get the Firebase Admin app
const initializeFirebaseAdmin = (): admin.app.App => {
  // Check if an app is already initialized
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  // Check for environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  
  // Solo loguear en desarrollo para no exponer información en producción
  if (process.env.NODE_ENV === 'development') {
    console.log("Firebase Admin SDK - Project ID loaded:", !!projectId);
    console.log("Firebase Admin SDK - Client Email loaded:", !!clientEmail);
    console.log("Firebase Admin SDK - Private Key loaded:", !!privateKey);
    console.log("Firebase Admin SDK - Storage Bucket loaded:", !!storageBucket);
  }

  if (!projectId || !clientEmail || !privateKey) {
    const missingVars = [];
    if (!projectId) missingVars.push("FIREBASE_PROJECT_ID");
    if (!clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missingVars.push("FIREBASE_PRIVATE_KEY");
    
    const errorMsg = `Firebase Admin: Faltan variables de entorno: ${missingVars.join(', ')}. ` +
      `Verifica que los secretos estén configurados en Google Secret Manager y que el backend de App Hosting tenga acceso a ellos.`;
    
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Format the private key - handle both escaped and unescaped newlines
  let formattedPrivateKey = privateKey;
  if (privateKey.includes('\\n')) {
    formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  // Validar que la clave privada tenga el formato correcto
  if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('Firebase Admin: La clave privada no tiene el formato correcto. Debe comenzar con "-----BEGIN PRIVATE KEY-----"');
    throw new Error('Firebase Admin: Formato de clave privada inválido');
  }

  const credentials = {
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  } as admin.ServiceAccount;

  try {
    // Initialize the app with Storage bucket
    const app = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      storageBucket: storageBucket || `${projectId}.appspot.com`,
    });
    console.log("Firebase Admin SDK inicializado correctamente.");
    return app;
  } catch (error: any) {
    console.error('Error en la inicialización de Firebase Admin SDK:', error);
    // If initialization fails, we throw the error to prevent the app from running in a broken state
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
};

// Call the function to get the initialized app
const app = initializeFirebaseAdmin();

// Export auth and firestore services from the initialized app
const auth = admin.auth(app);
const db = admin.firestore(app);


export { auth, db, admin };
