// js/app.js
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Actualizează butonul de Login din navbar în funcție de starea autentificării
onAuthStateChanged(auth, (user) => {
    const btnLogin = document.getElementById('btnLogin');
    if (!btnLogin) return;

    if (user) {
        // Utilizator logat — afișăm emailul și opțiunea de delogare
        btnLogin.textContent = `Delogare (${user.email})`;
        btnLogin.removeAttribute('data-bs-toggle');
        btnLogin.removeAttribute('data-bs-target');
        btnLogin.onclick = async () => {
            await signOut(auth);
        };
    } else {
        // Niciun utilizator — afișăm butonul de Login normal
        btnLogin.textContent = 'Login';
        btnLogin.setAttribute('data-bs-toggle', 'modal');
        btnLogin.setAttribute('data-bs-target', '#loginModal');
        btnLogin.onclick = null;
    }
});
