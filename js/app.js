// js/app.js
import { auth, db, storage } from './firebase.js';
import { obtineRolUtilizator, inregistrare, logare } from './auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Actualizează UI-ul navbar (butonul Admin) în funcție de starea autentificării
// Autentificarea cetățenilor este gestionată de cont.html
onAuthStateChanged(auth, async (user) => {
    const btnLogin = document.getElementById('btnLogin');
    const btnAdmin = document.getElementById('btnAdmin');

    if (user) {
        const rol = await obtineRolUtilizator(user.uid);

        // Butonul Login → Delogare
        if (btnLogin) {
            btnLogin.textContent = `⚙ ${user.email}`;
            btnLogin.removeAttribute('data-bs-toggle');
            btnLogin.removeAttribute('data-bs-target');
            btnLogin.onclick = async () => { await signOut(auth); };
        }

        // Butonul Admin
        if (btnAdmin) {
            const adminRoles = ['SysAdmin', 'GstAdmin', 'DptAdmin'];
            if (adminRoles.includes(rol)) {
                btnAdmin.classList.remove('d-none');
                if (rol === 'SysAdmin') {
                    btnAdmin.href = 'sysadmin.html';
                    btnAdmin.textContent = '⚙️ SysAdmin Panel';
                } else if (rol === 'DptAdmin') {
                    btnAdmin.href = 'dptadmin.html';
                    btnAdmin.textContent = '🏢 Panoul Meu';
                } else {
                    btnAdmin.href = 'admin.html';
                    btnAdmin.textContent = '🛠️ Admin Panel';
                }
            } else {
                btnAdmin.classList.add('d-none');
            }
        }

    } else {
        // Niciun utilizator logat — resetăm butonul Login
        if (btnLogin) {
            btnLogin.textContent = '⚙ Cont';
            btnLogin.setAttribute('data-bs-toggle', 'modal');
            btnLogin.setAttribute('data-bs-target', '#loginModal');
            btnLogin.onclick = null;
        }
        if (btnAdmin) btnAdmin.classList.add('d-none');
    }
});


// ==========================================
// ====== HARTA PRINCIPALA & SESIZARI =======
// ==========================================

const badge = {
    'nou':      '<span class="badge bg-primary" style="font-size:.7rem;">Nou</span>',
    'in_lucru': '<span class="badge bg-warning text-dark" style="font-size:.7rem;">În lucru</span>',
    'rezolvat': '<span class="badge bg-success" style="font-size:.7rem;">Rezolvat</span>',
    'respins':  '<span class="badge bg-danger" style="font-size:.7rem;">Respins</span>'
};
const catLabel = {
    infrastructura:'🕳️ Infrastructură', curatenie:'♻️ Curățenie',
    iluminat:'💡 Iluminat', parcuri:'🌳 Parcuri', altele:'⚙️ Altele'
};

// Încărcare live a sesizărilor doar dacă suntem pe index.html (există lista-sesizari)
if (document.getElementById('lista-sesizari')) {
    const q = query(collection(db, 'Sesizari'), orderBy('creatLa', 'desc'));
    onSnapshot(q, (snap) => {
        const lista = document.getElementById('lista-sesizari');
        lista.innerHTML = '';
        if (snap.empty) {
            lista.innerHTML = '<p style="font-size:.8rem;color:rgba(255,255,255,.35);text-align:center;padding:20px 0;">Nicio sesizare înregistrată.</p>';
            return;
        }
        const tickerItems = [];
        snap.forEach(d => {
            const s = d.data();
            const card = document.createElement('div');
            card.className = 'sez-card';
            card.innerHTML = `<h6>${s.titlu || catLabel[s.categorie] || 'Sesizare'}</h6>
                <div class="d-flex justify-content-between align-items-center">
                    <small style="color:rgba(255,255,255,.4);font-size:.74rem;">${catLabel[s.categorie] || s.categorie}</small>
                    ${badge[s.status] || s.status}
                </div>`;
            lista.appendChild(card);
            const ico = s.status === 'rezolvat' ? '✅' : s.status === 'in_lucru' ? '🔧' : '🔴';
            tickerItems.push(`<span class="ticker-item">${ico} ${s.titlu || 'Sesizare'}</span>`);
            if (s.latitudine && s.longitudine && typeof window.adaugaMarkerPeHarta === 'function') {
                window.adaugaMarkerPeHarta(s.latitudine, s.longitudine, s.titlu, s.status, s.descriere);
            }
        });
        const t = document.getElementById('ticker-content');
        if (t && tickerItems.length) t.innerHTML = tickerItems.slice(0, 5).join('');
    });
}


// ==========================================
// ====== SESIZARE RAPIDA (MODAL GPS) =======
// ==========================================

/* ── State ── */
let srMap = null;
let srMarker = null;
let srLat = null;
let srLng = null;
let srCategorie = '';
let gpsWatcher = null;
let srPozaBase64 = null;

/* ── Helpers ── */
function setGpsBanner(state, text) {
    const dot  = document.getElementById('gps-dot');
    const span = document.getElementById('gps-text');
    if(dot) dot.className = `gps-dot ${state}`;
    if(span) span.textContent = text;
}

function plaseazaPin(lat, lng, zoom) {
    srLat = lat; srLng = lng;
    if (!srMarker) {
        srMarker = L.marker([lat, lng], { draggable: true }).addTo(srMap);
        srMarker.on('dragend', e => {
            const p = e.target.getLatLng();
            srLat = p.lat; srLng = p.lng;
            updateLocConfirmed();
        });
    } else {
        srMarker.setLatLng([lat, lng]);
    }
    if (zoom && srMap) srMap.setView([lat, lng], 17);
    updateLocConfirmed();
}

function updateLocConfirmed() {
    const box = document.getElementById('sr-loc-confirmed');
    const txt = document.getElementById('sr-loc-text');
    if (srLat && srLng && box && txt) {
        txt.textContent = `📌 ${srLat.toFixed(5)}, ${srLng.toFixed(5)} (trage pinul pentru a ajusta)`;
        box.style.display = 'flex';
        const hint = document.getElementById('sr-pin-hint');
        if(hint) hint.style.display = 'none';
    }
}

/* ── openQuickReport — apelat din butoanele HTML ── */
window.openQuickReport = function(categorie, titluCat, icon, bgColor) {
    srCategorie = categorie;
    srLat = null; srLng = null; srPozaBase64 = null;
    if (srMarker) { srMarker.remove(); srMarker = null; }

    // Resetare UI
    document.getElementById('sr-icon').textContent = icon;
    document.getElementById('sr-title').textContent = titluCat;
    document.getElementById('sr-header-bg').style.background = `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`;
    document.getElementById('sr-titlu').value = '';
    document.getElementById('sr-descriere').value = '';
    document.getElementById('sr-prioritate').value = 'normala';
    document.getElementById('sr-poza').value = '';
    document.getElementById('sr-preview-container').classList.add('d-none');
    document.getElementById('sr-eroare').classList.add('d-none');
    document.getElementById('sr-loc-confirmed').style.display = 'none';
    document.getElementById('sr-pin-hint').style.display = 'block';
    
    const btnSubmit = document.getElementById('btn-sr-submit');
    if(btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '🚀 Trimite Sesizarea la Administrator';
    }
    document.getElementById('sr-success').style.display = 'none';
    
    // Închide opționale
    document.getElementById('sr-optional').classList.remove('open');
    document.getElementById('sr-toggle-btn').classList.remove('open');

    setGpsBanner('', 'Se detectează locația...');
    const btnUseGps = document.getElementById('btn-use-gps');
    if(btnUseGps) {
        btnUseGps.disabled = false;
        btnUseGps.innerHTML = '📍 Folosește locația mea';
    }

    const modalEl = document.getElementById('sesizareModal');
    if(modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Init hartă la prima deschidere sau reinit
        modalEl.addEventListener('shown.bs.modal', function initMap() {
            modalEl.removeEventListener('shown.bs.modal', initMap);

            if (srMap) {
                srMap.invalidateSize();
            } else {
                srMap = L.map('sr-map', { zoomControl: true }).setView([45.4353, 28.0073], 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(srMap);

                // Click pe hartă → plasează pin manual
                srMap.on('click', function(e) {
                    plaseazaPin(e.latlng.lat, e.latlng.lng, false);
                    setGpsBanner('found', 'Locație plasată manual');
                    const gpsBtn = document.getElementById('btn-use-gps');
                    if(gpsBtn) {
                        gpsBtn.innerHTML = '🔄 Redetectează GPS';
                        gpsBtn.disabled = false;
                    }
                });
            }

            // Pornim auto-GPS imediat la deschidere
            autoDetectGPS();
        }, { once: true });
    }

    // Dacă harta e deja inițializată, forțăm refresh și GPS
    if (srMap) {
        setTimeout(() => {
            srMap.invalidateSize();
            autoDetectGPS();
        }, 300);
    }
};

/* ── Auto-detect GPS la deschidere ── */
function autoDetectGPS() {
    const btnUseGps = document.getElementById('btn-use-gps');
    if (!navigator.geolocation) {
        setGpsBanner('error', 'GPS indisponibil – apasă pe hartă');
        return;
    }
    setGpsBanner('', 'Se detectează locația...');
    if(btnUseGps) {
        btnUseGps.disabled = true;
        btnUseGps.innerHTML = '⏳ Detectez locația...';
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            plaseazaPin(lat, lng, true);
            setGpsBanner('found', 'Locație GPS detectată ✓');
            if(btnUseGps) {
                btnUseGps.disabled = false;
                btnUseGps.innerHTML = '🔄 Redetectează GPS';
            }
        },
        (err) => {
            setGpsBanner('error', 'Activează GPS sau apasă pe hartă');
            if(btnUseGps) {
                btnUseGps.disabled = false;
                btnUseGps.innerHTML = '📍 Încearcă din nou GPS';
            }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

/* ── Buton manual "Folosește locația mea" ── */
window.useMyLocation = function() {
    autoDetectGPS();
};

/* ── Toggle opționale ── */
window.toggleOptional = function() {
    const body = document.getElementById('sr-optional');
    const btn  = document.getElementById('sr-toggle-btn');
    if(body) body.classList.toggle('open');
    if(btn) btn.classList.toggle('open');
};

/* ── Autocompresie Imagine pe Client ── */
function compressImage(file, maxSize, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                    type: "image/jpeg", lastModified: Date.now()
                });
                callback(newFile, canvas.toDataURL('image/jpeg', 0.8));
            }, 'image/jpeg', 0.8);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/* ── Preview poză + Compresie la selectare ── */
const pozaInput = document.getElementById('sr-poza');
if (pozaInput) {
    pozaInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Afișăm un feedback vizual
        document.getElementById('sr-poza-preview').src = '';
        document.getElementById('sr-preview-container').classList.remove('d-none');
        document.getElementById('btn-sr-submit').disabled = true;
        
        compressImage(file, 900, (compressedFile, dataUrl) => {
            srPozaBase64 = dataUrl; // Salvăm direct Base64-ul!
            document.getElementById('sr-poza-preview').src = dataUrl;
            document.getElementById('btn-sr-submit').disabled = false;
        });
    });
}

const btnSterge = document.getElementById('sr-btn-sterge');
if (btnSterge) {
    btnSterge.addEventListener('click', () => {
        srPozaBase64 = null;
        document.getElementById('sr-poza').value = '';
        document.getElementById('sr-preview-container').classList.add('d-none');
    });
}

/* ── Submit Sesizare ── */
window.submitSesizare = async function() {
    const eroare = document.getElementById('sr-eroare');
    eroare.classList.add('d-none');

    if (!srLat || !srLng) {
        eroare.textContent = '⚠️ Plasează locația pe hartă sau activează GPS-ul!';
        eroare.classList.remove('d-none');
        return;
    }

    const btn = document.getElementById('btn-sr-submit');
    btn.disabled = true;
    btn.textContent = '⏳ Se trimite...';

    try {
        btn.textContent = '⏳ Se salvează datele...';
        const titlu    = document.getElementById('sr-titlu').value.trim();
        const descriere = document.getElementById('sr-descriere').value.trim();
        const prioritate = document.getElementById('sr-prioritate').value;

        await addDoc(collection(db, 'Sesizari'), {
            titlu:      titlu || `Sesizare – ${document.getElementById('sr-title').textContent}`,
            categorie:  srCategorie || 'altele',
            descriere:  descriere,
            prioritate: prioritate,
            status:     'nou',
            pozaURL:    srPozaBase64, // Salvat direct codat din imagine!
            latitudine:  srLat,
            longitudine: srLng,
            creatDe:    auth.currentUser ? auth.currentUser.uid : 'anonim',
            creatLa:    serverTimestamp()
        });

        // Afișăm success overlay
        document.getElementById('sr-success').style.display = 'flex';
        setTimeout(() => {
            const m = bootstrap.Modal.getInstance(document.getElementById('sesizareModal'));
            if (m) m.hide();
        }, 2500);

    } catch (err) {
        console.error(err);
        eroare.textContent = '❌ ' + err.message;
        eroare.classList.remove('d-none');
        btn.disabled = false;
        btn.textContent = '🚀 Trimite Sesizarea la Administrator';
    }
};


// ==========================================
// ====== AUTENTIFICARE LOGARE/CREARE =======
// ==========================================

function msg(id, text, tip='danger') {
    const d = document.getElementById(id);
    if(d) {
        d.textContent = text; 
        d.className = `alert alert-${tip}`;
        d.classList.remove('d-none');
    }
}

const btnIntraCont = document.getElementById('btn-intra-cont');
if (btnIntraCont) {
    btnIntraCont.addEventListener('click', async () => {
        const email = document.getElementById('emailAuth').value.trim();
        const parola = document.getElementById('parolaAuth').value;
        if (!email || !parola) { msg('auth-mesaj','Completează email și parola!'); return; }
        const r = await logare(email, parola);
        if (r.success) {
            msg('auth-mesaj','Logare reușită! 🎉','success');
            // Redirecționăm în funcție de rol
            const rol = await obtineRolUtilizator(r.user.uid);
            setTimeout(() => {
                if (rol === 'DptAdmin') {
                    window.location.href = 'dptadmin.html';
                } else if (rol === 'GstAdmin') {
                    window.location.href = 'admin.html';
                } else if (rol === 'SysAdmin') {
                    window.location.href = 'sysadmin.html';
                } else {
                    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                }
            }, 1200);
        } else { 
            msg('auth-mesaj','Eroare: ' + r.message); 
        }
    });
}

const btnCreeazaCont = document.getElementById('btn-creeaza-cont');
if (btnCreeazaCont) {
    btnCreeazaCont.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        setTimeout(() => new bootstrap.Modal(document.getElementById('registerModal')).show(), 300);
    });
}

const btnBackLogin = document.getElementById('btn-back-login');
if (btnBackLogin) {
    btnBackLogin.addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
        setTimeout(() => new bootstrap.Modal(document.getElementById('loginModal')).show(), 300);
    });
}

const btnConfirmReg = document.getElementById('btn-confirm-register');
if (btnConfirmReg) {
    btnConfirmReg.addEventListener('click', async () => {
        const email   = document.getElementById('emailRegister').value.trim();
        const parola  = document.getElementById('parolaRegister').value;
        const confirm = document.getElementById('parolaConfirm').value;
        if (!email||!parola||!confirm) { msg('register-mesaj','Completează toate câmpurile!'); return; }
        if (parola.length<6) { msg('register-mesaj','Parola – minim 6 caractere!'); return; }
        if (parola!==confirm) { msg('register-mesaj','Parolele nu coincid!'); return; }
        const r = await inregistrare(email, parola);
        if (r.success) {
            msg('register-mesaj','Cont creat! 🎉','success');
            setTimeout(() => bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide(), 1500);
        } else { 
            msg('register-mesaj','Eroare: ' + r.message); 
        }
    });
}
