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