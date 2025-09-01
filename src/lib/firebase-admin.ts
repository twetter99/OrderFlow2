
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
  
  console.log("Firebase Admin SDK - Project ID loaded:", !!projectId);
  console.log("Firebase Admin SDK - Client Email loaded:", !!clientEmail);
  console.log("Firebase Admin SDK - Private Key loaded:", !!privateKey);


  if (!projectId || !clientEmail || !privateKey) {
    let missingVars = [];
    if (!projectId) missingVars.push("FIREBASE_PROJECT_ID");
    if (!clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missingVars.push("FIREBASE_PRIVATE_KEY");
    throw new Error(`Faltan las siguientes credenciales de Firebase Admin en las variables de entorno: ${missingVars.join(', ')}`);
  }

  // Format the private key
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const credentials = {
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  } as admin.ServiceAccount;

  try {
    // Initialize the app
    const app = admin.initializeApp({
      credential: admin.credential.cert(credentials),
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
