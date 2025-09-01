
"use server"

import { auth, db, admin } from "@/lib/firebase-admin";

// NOTE: This file must use the Firebase Admin SDK
// to be able to create users without being authenticated.

export async function createUser(userData: any) {
  const { email, password, name, phone, permissions, personId } = userData;
  
  if (!email || !password) {
    return { success: false, message: "El correo y la contraseña son obligatorios." };
  }

  try {
    // 1. Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Create user document in Firestore using Admin SDK
    const userDocRef = db.collection("usuarios").doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid, 
      personId,
      name,
      email,
      phone: phone || '',
      permissions,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: null,
      providerId: 'password'
    });

    return { success: true, message: `Usuario ${name} creado exitosamente.` };

  } catch (error: any) {
    console.error("Error creating user:", error);
    let message = "Ocurrió un error inesperado.";
    if (error.code === 'auth/email-already-exists') {
        message = "Este correo electrónico ya está en uso por otro usuario.";
    } else if (error.code === 'auth/invalid-password') {
        message = `La contraseña no cumple con los requisitos de seguridad: ${error.message}`;
    }
    return { success: false, message };
  }
}

export async function updateUser(uid: string, userData: any) {
  const { password, name, phone, permissions, personId } = userData;

  try {
    const updateAuthData: any = {};
    if (password) {
        updateAuthData.password = password;
    }
    if (name) {
        updateAuthData.displayName = name;
    }
    
    if (Object.keys(updateAuthData).length > 0) {
        await auth.updateUser(uid, updateAuthData);
    }
    
    const userDocRef = db.collection("usuarios").doc(uid);
    await userDocRef.set({
      name,
      phone: phone || '',
      permissions,
      personId,
    }, { merge: true });

    return { success: true, message: "Usuario actualizado correctamente." };

  } catch (error: any) {
    console.error("Error updating user:", error);
    let message = "Ocurrió un error inesperado al actualizar.";
     if (error.code === 'auth/user-not-found') {
        message = "El usuario que intentas actualizar no existe en Firebase Authentication.";
    }
    return { success: false, message };
  }
}

export async function deleteUser(uid: string) {
    try {
        await auth.deleteUser(uid);
        const userDocRef = db.collection("usuarios").doc(uid);
        await userDocRef.delete();
        return { success: true, message: "Usuario eliminado." };
    } catch(error: any) {
        console.error("Error deleting user:", error);
        let message = "No se pudo eliminar el usuario.";
        if (error.code === 'auth/user-not-found') {
            message = "El usuario ya no existe en Firebase Authentication. Se procederá a limpiar los datos locales.";
             const userDocRef = db.collection("usuarios").doc(uid);
             await userDocRef.delete();
             return { success: true, message };
        }
        return { success: false, message };
    }
}
