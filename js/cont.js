// js/cont.js – Pagina contului cetățeanului

import { auth, db } from './firebase.js';
import { obtineRolUtilizator, logare, inregistrare } from './auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection, query, where, orderBy, getDocs, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── Navbar sync (btnLogin / btnAdmin) ──────────────────────────────
const btnLogin = document.getElementById('btnLogin');
const btnAdmin = document.getElementById('btnAdmin');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const rol = await obtineRolUtilizator(user.uid);

        if (btnLogin) {
            btnLogin.textContent = `📧 ${user.email}`;
            btnLogin.onclick = null;
            btnLogin.removeAttribute('data-bs-toggle');
            btnLogin.removeAttribute('data-bs-target');
        }

        const adminRoles = ['SysAdmin', 'GstAdmin', 'DptAdmin'];
        if (btnAdmin) {
            if (adminRoles.includes(rol)) {
                btnAdmin.classList.remove('d-none');
                if (rol === 'SysAdmin') {
                    btnAdmin.href = 'sysadmin.html';
                    btnAdmin.textContent = '⚙️ SysAdmin Panel';
                } else {
                    btnAdmin.href = 'admin.html';
                    btnAdmin.textContent = '🛠️ Admin Panel';
                }
            } else {
                btnAdmin.classList.add('d-none');
            }
        }

        // Afișăm dashboard-ul cetățeanului
        showDashboard(user, rol);

    } else {
        if (btnLogin) {
            btnLogin.textContent = 'Login';
            btnLogin.setAttribute('data-bs-toggle', 'modal');
            btnLogin.setAttribute('data-bs-target', '#loginModal');
            btnLogin.onclick = null;
        }
        if (btnAdmin) btnAdmin.classList.add('d-none');

        showAuth();
    }
});

// ──────────────────────────────────────────────
// SHOW / HIDE SECTIONS
// ──────────────────────────────────────────────
function showAuth() {
    document.getElementById('sectiune-auth').style.display = '';
    document.getElementById('sectiune-auth').classList.remove('d-none');
    document.getElementById('sectiune-dashboard').classList.add('d-none');
}

function showDashboard(user, rol) {
    document.getElementById('sectiune-auth').classList.add('d-none');
    document.getElementById('sectiune-dashboard').classList.remove('d-none');

    // Populăm datele profilului
    document.getElementById('dash-email').textContent = user.email;

    const roleLabels = {
        'citizen': '🏙️ Cetățean',
        'GstAdmin': '🛡️ GstAdmin',
        'DptAdmin': '🏢 DptAdmin',
        'SysAdmin': '⚙️ SysAdmin'
    };
    document.getElementById('dash-role-text').textContent = (roleLabels[rol] || rol);

    // Avatar initials
    const initials = user.email[0].toUpperCase();
    document.getElementById('dash-avatar').textContent = initials;

    // Data creare cont (metadata Firebase)
    if (user.metadata && user.metadata.creationTime) {
        const d = new Date(user.metadata.creationTime);
        document.getElementById('dash-since').textContent =
            'Cont creat: ' + d.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Încarcă sesizările utilizatorului
    loadMySesizari(user.uid);
}

// ──────────────────────────────────────────────
// LOAD USER SESIZARI
// ──────────────────────────────────────────────
const catIcon = {
    infrastructura: '🕳️',
    curatenie: '♻️',
    iluminat: '💡',
    parcuri: '🌳',
    altele: '⚙️'
};
const catLabel = {
    infrastructura: 'Infrastructură',
    curatenie: 'Curățenie',
    iluminat: 'Iluminat',
    parcuri: 'Parcuri',
    altele: 'Altele'
};

async function loadMySesizari(uid) {
    const lista = document.getElementById('my-sesizari-list');
    const countEl = document.getElementById('count-sesizari');

    try {
        const q = query(
            collection(db, 'Sesizari'),
            where('creatDe', '==', uid),
            orderBy('creatLa', 'desc')
        );

        onSnapshot(q, (snap) => {
            if (snap.empty) {
                lista.innerHTML = `
                    <div class="dash-empty">
                        <div class="dash-empty-icon">📭</div>
                        Nu ai trimis sesizări încă.<br>
                        <a href="index.html" style="color:#4da6ff;text-decoration:none;margin-top:8px;display:inline-block;">
                            → Adaugă prima sesizare
                        </a>
                    </div>`;
                countEl.textContent = '0';
                updateStats(0, 0, 0, 0);
                return;
            }

            let total = 0, rezolvate = 0, inLucru = 0, noi = 0;
            lista.innerHTML = '';
            countEl.textContent = snap.size;

            snap.forEach(d => {
                const s = d.data();
                total++;
                if (s.status === 'rezolvat') rezolvate++;
                else if (s.status === 'in_lucru') inLucru++;
                else noi++;

                const date = s.creatLa ? new Date(s.creatLa.seconds * 1000).toLocaleDateString('ro-RO') : '—';
                const icon = catIcon[s.categorie] || '📌';
                const label = catLabel[s.categorie] || s.categorie || 'Sesizare';

                const card = document.createElement('div');
                card.className = 'my-sez-card';
                card.innerHTML = `
                    <div class="my-sez-cat-icon">${icon}</div>
                    <div class="my-sez-info">
                        <div class="my-sez-title">${s.titlu || label}</div>
                        <div class="my-sez-meta">📅 ${date} &nbsp;·&nbsp; 📍 ${label}</div>
                    </div>
                    <span class="my-sez-badge badge-${s.status || 'nou'}">
                        ${statusLabel(s.status)}
                    </span>`;
                lista.appendChild(card);
            });

            updateStats(total, rezolvate, inLucru, noi);
        });

    } catch (err) {
        console.error('Eroare la încărcarea sesizărilor:', err);
        lista.innerHTML = `<div class="dash-loading" style="color:#f08080;">❌ Eroare la încărcare.</div>`;
    }
}

function statusLabel(s) {
    const m = { nou: '🔴 Nou', in_lucru: '🔧 În lucru', rezolvat: '✅ Rezolvat', respins: '❌ Respins' };
    return m[s] || s || 'Nou';
}

function updateStats(total, rez, inL, noi) {
    document.getElementById('stat-total').textContent    = total;
    document.getElementById('stat-rezolvate').textContent = rez;
    document.getElementById('stat-in-lucru').textContent  = inL;
    document.getElementById('stat-noi').textContent       = noi;
}

// ──────────────────────────────────────────────
// TAB SWITCH
// ──────────────────────────────────────────────
window.switchTab = function(tab) {
    document.getElementById('panel-login').classList.toggle('active', tab === 'login');
    document.getElementById('panel-register').classList.toggle('active', tab === 'register');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    // Clear messages
    showMsg('l-mesaj', '', '');
    showMsg('r-mesaj', '', '');
};

// ──────────────────────────────────────────────
// PASSWORD TOGGLE
// ──────────────────────────────────────────────
window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁';
    }
};

// ──────────────────────────────────────────────
// PASSWORD STRENGTH
// ──────────────────────────────────────────────
document.getElementById('r-parola').addEventListener('input', function () {
    const val = this.value;
    const bar = document.getElementById('strength-bar');
    const lbl = document.getElementById('strength-label');

    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
        { w: '0%', bg: 'transparent', txt: '' },
        { w: '25%', bg: '#dc3545', txt: '⚠️ Parolă slabă' },
        { w: '50%', bg: '#fd7e14', txt: '🔶 Parolă mediocră' },
        { w: '75%', bg: '#ffc107', txt: '🔷 Parolă bună' },
        { w: '100%', bg: '#28a745', txt: '✅ Parolă puternică' },
    ];
    const lvl = levels[Math.min(score, 4)];
    bar.style.width = lvl.w;
    bar.style.background = lvl.bg;
    lbl.textContent = lvl.txt;
});

// ──────────────────────────────────────────────
// MESSAGE HELPER
// ──────────────────────────────────────────────
function showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!text) { el.classList.add('d-none'); return; }
    el.className = `auth-msg ${type}`;
    el.textContent = text;
    el.classList.remove('d-none');
}

// ──────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────
window.doLogin = async function () {
    const email  = document.getElementById('l-email').value.trim();
    const parola = document.getElementById('l-parola').value;

    if (!email || !parola) {
        showMsg('l-mesaj', '⚠️ Completează email și parola!', 'error');
        return;
    }

    const btn = document.getElementById('btn-login');
    const txt = document.getElementById('btn-login-text');
    btn.disabled = true;
    txt.textContent = '⏳ Se conectează...';

    const r = await logare(email, parola);

    if (r.success) {
        showMsg('l-mesaj', '✅ Autentificare reușită!', 'success');
        // onAuthStateChanged va face tranziția automată
    } else {
        btn.disabled = false;
        txt.textContent = 'Intră în cont →';
        const errMap = {
            'auth/invalid-credential':  '❌ Email sau parolă incorectă.',
            'auth/user-not-found':       '❌ Contul nu există.',
            'auth/wrong-password':       '❌ Parolă incorectă.',
            'auth/too-many-requests':    '🔒 Prea multe încercări. Încearcă mai târziu.',
            'auth/invalid-email':        '❌ Email invalid.',
        };
        // Găsim codul din mesajul de eroare Firebase
        const code = Object.keys(errMap).find(k => r.message.includes(k));
        showMsg('l-mesaj', code ? errMap[code] : '❌ ' + r.message, 'error');
    }
};

// ──────────────────────────────────────────────
// REGISTER
// ──────────────────────────────────────────────
window.doRegister = async function () {
    const email   = document.getElementById('r-email').value.trim();
    const parola  = document.getElementById('r-parola').value;
    const confirm = document.getElementById('r-confirm').value;

    if (!email || !parola || !confirm) {
        showMsg('r-mesaj', '⚠️ Completează toate câmpurile!', 'error'); return;
    }
    if (parola.length < 6) {
        showMsg('r-mesaj', '⚠️ Parola trebuie să aibă minim 6 caractere!', 'error'); return;
    }
    if (parola !== confirm) {
        showMsg('r-mesaj', '⚠️ Parolele nu coincid!', 'error'); return;
    }

    const btn = document.getElementById('btn-register');
    const txt = document.getElementById('btn-register-text');
    btn.disabled = true;
    txt.textContent = '⏳ Se creează contul...';

    const r = await inregistrare(email, parola);

    if (r.success) {
        showMsg('r-mesaj', '🎉 Cont creat cu succes! Bun venit!', 'success');
    } else {
        btn.disabled = false;
        txt.textContent = 'Creează cont →';
        const errMap = {
            'auth/email-already-in-use': '❌ Adresa de email este deja folosită.',
            'auth/invalid-email':        '❌ Email invalid.',
            'auth/weak-password':        '❌ Parola este prea slabă.',
        };
        const code = Object.keys(errMap).find(k => r.message.includes(k));
        showMsg('r-mesaj', code ? errMap[code] : '❌ ' + r.message, 'error');
    }
};

// ──────────────────────────────────────────────
// LOGOUT
// ──────────────────────────────────────────────
window.doLogout = async function () {
    await signOut(auth);
    // onAuthStateChanged va afișa automat secțiunea de auth
};
