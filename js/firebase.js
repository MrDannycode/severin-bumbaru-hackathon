// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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

// 4. Exportăm instanțele de Bază de date și Autentificare pentru a le folosi în auth.js și app.js
export const db = getFirestore(app);
export const auth = getAuth(app);