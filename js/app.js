// js/app.js
import { auth } from './firebase.js';
import { obtineRolUtilizator } from './auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Actualizează UI-ul navbar în funcție de starea autentificării și rolul utilizatorului
onAuthStateChanged(auth, async (user) => {
    const btnLogin = document.getElementById('btnLogin');
    const btnAdmin = document.getElementById('btnAdmin');

    if (user) {
        // Obținem rolul utilizatorului din Firestore
        const rol = await obtineRolUtilizator(user.uid);

        // Actualizăm butonul de Login → Delogare
        if (btnLogin) {
            btnLogin.textContent = `Delogare (${user.email})`;
            btnLogin.removeAttribute('data-bs-toggle');
            btnLogin.removeAttribute('data-bs-target');
            btnLogin.onclick = async () => {
                await signOut(auth);
            };
        }

        // Afișăm butonul Admin pentru oricare din cele 3 roluri de administrator
        const ADMIN_ROLES = ['SysAdmin', 'GstAdmin', 'DptAdmin'];
        if (btnAdmin) {
            if (ADMIN_ROLES.includes(rol)) {
                btnAdmin.classList.remove('d-none');
            } else {
                btnAdmin.classList.add('d-none');
            }
        }

    } else {
        // Niciun utilizator logat — resetăm butonul Login
        if (btnLogin) {
            btnLogin.textContent = 'Login';
            btnLogin.setAttribute('data-bs-toggle', 'modal');
            btnLogin.setAttribute('data-bs-target', '#loginModal');
            btnLogin.onclick = null;
        }

        // Ascundem Admin și dacă nu e nimeni logat
        if (btnAdmin) {
            btnAdmin.classList.add('d-none');
        }
    }
});
