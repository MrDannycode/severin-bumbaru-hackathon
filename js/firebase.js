// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAdvEbQAi1HBbPm7qlaN_06jyZVkM0DeC4",
    authDomain: "galati-city-fix.firebaseapp.com",
    projectId: "galati-city-fix",
    storageBucket: "galati-city-fix.firebasestorage.app",
    messagingSenderId: "279223709756",
    appId: "1:279223709756:web:f0c4b4dc4b7beb0cfa1339"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportăm instanțele de Autentificare, Bază de date și Storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);