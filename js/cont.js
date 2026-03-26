// js/cont.js – Pagina contului cetățeanului

import { auth, db } from './firebase.js';
import { obtineRolUtilizator, logare, inregistrare } from './auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection, query, where, orderBy, onSnapshot, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── Navbar sync ──────────────────────────────────────────────────────
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
                btnAdmin.href = rol === 'SysAdmin' ? 'sysadmin.html' : 'admin.html';
                btnAdmin.textContent = rol === 'SysAdmin' ? '⚙️ SysAdmin Panel' : '🛠️ Admin Panel';
            } else {
                btnAdmin.classList.add('d-none');
            }
        }

        showDashboard(user, rol);
    } else {
        if (btnLogin) {
            btnLogin.textContent = '⚙ Cont';
        }
        if (btnAdmin) btnAdmin.classList.add('d-none');
        showAuth();
    }
});

// ──────────────────────────────────────────────
// SHOW / HIDE SECTIONS
// ──────────────────────────────────────────────
function showAuth() {
    document.getElementById('sectiune-auth').classList.remove('d-none');
    document.getElementById('sectiune-dashboard').classList.add('d-none');
}

function showDashboard(user, rol) {
    document.getElementById('sectiune-auth').classList.add('d-none');
    document.getElementById('sectiune-dashboard').classList.remove('d-none');

    document.getElementById('dash-email').textContent = user.email;

    const roleLabels = {
        citizen: '🏙️ Cetățean',
        GstAdmin: '🛡️ GstAdmin',
        DptAdmin: '🏢 DptAdmin',
        SysAdmin: '⚙️ SysAdmin'
    };
    document.getElementById('dash-role-text').textContent = roleLabels[rol] || rol;
    document.getElementById('dash-avatar').textContent = user.email[0].toUpperCase();

    if (user.metadata?.creationTime) {
        const d = new Date(user.metadata.creationTime);
        document.getElementById('dash-since').textContent =
            'Cont creat: ' + d.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    loadMySesizari(user.uid);
}

// ──────────────────────────────────────────────
// LOAD USER SESIZARI + MESAJE
// ──────────────────────────────────────────────
const catIcon  = { infrastructura:'🕳️', curatenie:'♻️', iluminat:'💡', parcuri:'🌳', altele:'⚙️' };
const catLabel = { infrastructura:'Infrastructură', curatenie:'Curățenie', iluminat:'Iluminat', parcuri:'Parcuri', altele:'Altele' };

// Track already-opened message listeners so we don't duplicate
const sesizareListeners = {};

function loadMySesizari(uid) {
    const lista = document.getElementById('my-sesizari-list');
    const countEl = document.getElementById('count-sesizari');

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
            const sesId = d.id;
            total++;
            if (s.status === 'rezolvat') rezolvate++;
            else if (s.status === 'in_lucru') inLucru++;
            else noi++;

            const date = s.creatLa
                ? new Date(s.creatLa.seconds * 1000).toLocaleDateString('ro-RO')
                : '—';
            const icon = catIcon[s.categorie] || '📌';
            const label = catLabel[s.categorie] || s.categorie || 'Sesizare';

            // Wrapper card
            const card = document.createElement('div');
            card.className = 'my-sez-card';
            card.id = `sez-${sesId}`;
            card.innerHTML = `
                <div class="my-sez-cat-icon">${icon}</div>
                <div class="my-sez-info">
                    <div class="my-sez-title">${s.titlu || label}</div>
                    <div class="my-sez-meta">📅 ${date} &nbsp;·&nbsp; 📍 ${label}</div>
                    <div class="my-sez-msg-badge d-none" id="msg-badge-${sesId}">
                        📨 <span id="msg-badge-count-${sesId}">1</span> mesaj nou de la administrator
                    </div>
                </div>
                <div class="d-flex flex-column align-items-end gap-2">
                    <span class="my-sez-badge badge-${s.status || 'nou'}">${statusLabel(s.status)}</span>
                    <button class="btn-toggle-msgs" id="btn-msgs-${sesId}" onclick="toggleMesaje('${sesId}')">
                        💬 Mesaje
                    </button>
                </div>`;

            // Thread container (hidden by default)
            const thread = document.createElement('div');
            thread.className = 'my-sez-thread d-none';
            thread.id = `thread-${sesId}`;
            thread.innerHTML = `
                <div class="my-sez-thread-inner" id="thread-inner-${sesId}">
                    <div class="thread-loading">⏳ Se încarcă mesajele...</div>
                </div>`;

            lista.appendChild(card);
            lista.appendChild(thread);

            // Start message listener for this sesizare
            startMesajeListener(sesId);
        });

        updateStats(total, rezolvate, inLucru, noi);
    }, err => {
        console.error('Eroare la încărcarea sesizărilor:', err);
        lista.innerHTML = `<div class="dash-loading" style="color:#f08080;">❌ Eroare la încărcare: ${err.message}</div>`;
    });
}

// ──────────────────────────────────────────────
// MESAJE – listener per sesizare
// ──────────────────────────────────────────────
function startMesajeListener(sesId) {
    // Evităm dubluri
    if (sesizareListeners[sesId]) return;

    const qM = query(
        collection(db, 'Sesizari', sesId, 'Mesaje'),
        orderBy('trimisLa', 'asc')
    );

    sesizareListeners[sesId] = onSnapshot(qM, async (snap) => {
        const threadInner = document.getElementById(`thread-inner-${sesId}`);
        const badgeEl    = document.getElementById(`msg-badge-${sesId}`);
        const badgeCount = document.getElementById(`msg-badge-count-${sesId}`);

        if (!threadInner) return;

        if (snap.empty) {
            threadInner.innerHTML = '<div class="thread-empty">📭 Niciun mesaj de la administrator încă.</div>';
            if (badgeEl) badgeEl.classList.add('d-none');
            return;
        }

        // Numărăm necitite
        const necitite = snap.docs.filter(d => !d.data().cititDeCetatan);

        if (badgeEl && necitite.length > 0) {
            badgeEl.classList.remove('d-none');
            if (badgeCount) badgeCount.textContent = necitite.length;
        } else if (badgeEl) {
            badgeEl.classList.add('d-none');
        }

        // Render thread
        threadInner.innerHTML = '';
        snap.forEach(d => {
            const m = d.data();
            const data = m.trimisLa
                ? new Date(m.trimisLa.seconds * 1000).toLocaleString('ro-RO')
                : '';
            const bubble = document.createElement('div');
            bubble.className = `citizen-msg-bubble ${m.trimisDeAdmin ? 'from-admin' : 'from-citizen'}`;
            bubble.innerHTML = `
                <div class="cmsg-text">${escapeHtml(m.text)}</div>
                <div class="cmsg-meta">
                    ${m.trimisDeAdmin ? '🏛️ Administrator' : '👤 Tu'} &nbsp;·&nbsp; ${data}
                </div>`;
            threadInner.appendChild(bubble);
        });

        // Scroll to bottom
        threadInner.scrollTop = threadInner.scrollHeight;
    });
}

// ── Escape HTML safely ──
function escapeHtml(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>');
}

// ── Toggle visibility of message thread ──
window.toggleMesaje = function(sesId) {
    const thread = document.getElementById(`thread-${sesId}`);
    const btn    = document.getElementById(`btn-msgs-${sesId}`);
    if (!thread) return;

    const isOpen = !thread.classList.contains('d-none');
    if (isOpen) {
        thread.classList.add('d-none');
        btn.textContent = '💬 Mesaje';
    } else {
        thread.classList.remove('d-none');
        btn.textContent = '▲ Ascunde';
        // Scroll into view
        thread.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Marchează mesajele ca citite
        marheazaCitite(sesId);
    }
};

// ── Mark all admin messages as read ──
async function marheazaCitite(sesId) {
    try {
        const qM = query(
            collection(db, 'Sesizari', sesId, 'Mesaje'),
            where('cititDeCetatan', '==', false)
        );
        // We use getDocs here since we only need a one-time read to update
        const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const snap = await getDocs(qM);
        snap.forEach(async d => {
            await updateDoc(doc(db, 'Sesizari', sesId, 'Mesaje', d.id), {
                cititDeCetatan: true
            });
        });
    } catch (e) {
        console.warn('Nu s-au putut marca mesajele ca citite:', e.message);
    }
}

// ──────────────────────────────────────────────
// TAB SWITCH (Login ↔ Register)
// ──────────────────────────────────────────────
window.switchTab = function(tab) {
    document.getElementById('panel-login').classList.toggle('active', tab === 'login');
    document.getElementById('panel-register').classList.toggle('active', tab === 'register');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    showMsg('l-mesaj', '', '');
    showMsg('r-mesaj', '', '');
};

// ──────────────────────────────────────────────
// PASSWORD TOGGLE
// ──────────────────────────────────────────────
window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
    else { input.type = 'password'; btn.textContent = '👁'; }
};

// ── Password strength ──
document.getElementById('r-parola')?.addEventListener('input', function () {
    const val = this.value;
    const bar = document.getElementById('strength-bar');
    const lbl = document.getElementById('strength-label');
    let score = 0;
    if (val.length >= 6)  score++;
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
    if (bar) { bar.style.width = lvl.w; bar.style.background = lvl.bg; }
    if (lbl) lbl.textContent = lvl.txt;
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
window.doLogin = async function() {
    const email  = document.getElementById('l-email').value.trim();
    const parola = document.getElementById('l-parola').value;
    if (!email || !parola) { showMsg('l-mesaj', '⚠️ Completează email și parola!', 'error'); return; }

    const btn = document.getElementById('btn-login');
    const txt = document.getElementById('btn-login-text');
    btn.disabled = true;
    txt.textContent = '⏳ Se conectează...';

    const r = await logare(email, parola);

    if (r.success) {
        showMsg('l-mesaj', '✅ Autentificare reușită!', 'success');
    } else {
        btn.disabled = false;
        txt.textContent = 'Intră în cont →';
        const errMap = {
            'auth/invalid-credential':  '❌ Email sau parolă incorectă.',
            'auth/user-not-found':      '❌ Contul nu există.',
            'auth/wrong-password':      '❌ Parolă incorectă.',
            'auth/too-many-requests':   '🔒 Prea multe încercări. Încearcă mai târziu.',
            'auth/invalid-email':       '❌ Email invalid.',
        };
        const code = Object.keys(errMap).find(k => r.message.includes(k));
        showMsg('l-mesaj', code ? errMap[code] : '❌ ' + r.message, 'error');
    }
};

// ──────────────────────────────────────────────
// REGISTER
// ──────────────────────────────────────────────
window.doRegister = async function() {
    const email   = document.getElementById('r-email').value.trim();
    const parola  = document.getElementById('r-parola').value;
    const confirm = document.getElementById('r-confirm').value;

    if (!email || !parola || !confirm) { showMsg('r-mesaj', '⚠️ Completează toate câmpurile!', 'error'); return; }
    if (parola.length < 6) { showMsg('r-mesaj', '⚠️ Parola trebuie să aibă minim 6 caractere!', 'error'); return; }
    if (parola !== confirm) { showMsg('r-mesaj', '⚠️ Parolele nu coincid!', 'error'); return; }

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
window.doLogout = async function() {
    await signOut(auth);
};

// ──────────────────────────────────────────────
// STATS
// ──────────────────────────────────────────────
function statusLabel(s) {
    const m = { nou:'🔴 Nou', in_lucru:'🔧 În lucru', rezolvat:'✅ Rezolvat', respins:'❌ Respins' };
    return m[s] || s || 'Nou';
}

function updateStats(total, rez, inL, noi) {
    document.getElementById('stat-total').textContent    = total;
    document.getElementById('stat-rezolvate').textContent = rez;
    document.getElementById('stat-in-lucru').textContent  = inL;
    document.getElementById('stat-noi').textContent       = noi;
}
