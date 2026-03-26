// js/auth.js

// 1. Importăm instanțele pe care le-am exportat din firebase.js
import { auth, db } from './firebase.js';

// 2. Importăm funcțiile necesare din SDK-urile Firebase (Autentificare și Bază de Date)
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Funcție pentru Înregistrare (Creare cont nou)
 * @param {string} email 
 * @param {string} parola 
 */
export async function inregistrare(email, parola) {
    try {
        // A. Creăm contul în Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, parola);
        const user = userCredential.user;

        // B. Creăm automat documentul în colecția 'Users' cu rolul default "citizen"
        await setDoc(doc(db, "Users", user.uid), {
            email: email,
            role: "citizen",
            createdAt: new Date().toISOString()
        });

        console.log("Cont creat cu succes pentru:", user.email);
        return { success: true, user: user };
    } catch (error) {
        console.error("Eroare la înregistrare:", error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Funcție pentru Logare
 * @param {string} email 
 * @param {string} parola 
 */
export async function logare(email, parola) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, parola);
        console.log("Logare reușită:", userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Eroare la logare:", error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Funcție pentru Delogare
 */
export async function delogare() {
    try {
        await signOut(auth);
        console.log("Utilizator delogat.");
        return { success: true };
    } catch (error) {
        console.error("Eroare la delogare:", error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Funcție utilitară pentru a afla rolul utilizatorului curent
 * Roluri posibile: "citizen", "SysAdmin", "GstAdmin", "DptAdmin"
 * @param {string} uid - ID-ul utilizatorului logat
 */
export async function obtineRolUtilizator(uid) {
    try {
        const docRef = doc(db, "Users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().role; // Va returna "citizen", "SysAdmin", "GstAdmin" sau "DptAdmin"
        } else {
            return "citizen"; // Fallback de siguranță
        }
    } catch (error) {
        console.error("Eroare la verificarea rolului:", error.message);
        return "citizen";
    }
}