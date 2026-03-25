// js/map.js

// Inițializăm harta pe coordonatele Galațiului
const map = L.map('map').setView([45.4353, 28.0073], 13);

// Adăugăm layer-ul vizual de la OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Culori marker în funcție de status
function culoareStatus(status) {
    const culori = {
        'nou': 'blue',
        'in_lucru': 'orange',
        'rezolvat': 'green',
        'respins': 'red'
    };
    return culori[status] || 'blue';
}

// Funcție apelată de app.js pentru fiecare sesizare din Firestore
function adaugaMarkerPeHarta(lat, lng, titlu, status, descriere) {
    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`
        <strong>${titlu}</strong><br>
        <em>${descriere || ''}</em><br>
        Status: <strong>${status}</strong>
    `);
}

// Expunem funcția global
window.adaugaMarkerPeHarta = adaugaMarkerPeHarta;
