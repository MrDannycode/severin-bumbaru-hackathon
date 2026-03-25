// js/map.js

// Inițializăm harta pe coordonatele Galațiului
const map = L.map('map').setView([45.4353, 28.0073], 13);

// Adăugăm layer-ul vizual de la OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Punem un marker de probă ca să ne asigurăm că funcționează
L.marker([45.4353, 28.0073]).addTo(map)
    .bindPopup('Primăria Galați')
    .openPopup();

// Funcție pe care o va apela Programatorul 2 după ce citește din Firebase
function adaugaMarkerPeHarta(lat, lng, titlu, status) {
    // Punem un pin nou pe hartă
    const marker = L.marker([lat, lng]).addTo(map);

    // Adăugăm un popup care apare când dai click pe pin
    marker.bindPopup(`
        <strong>${titlu}</strong><br>
        Status: ${status}
    `);
}

// Expunem funcția global pentru a putea fi folosită în app.js de colegul tău
window.adaugaMarkerPeHarta = adaugaMarkerPeHarta;
