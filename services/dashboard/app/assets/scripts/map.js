const { createApp, ref, onMounted } = Vue;

const app = createApp({
    setup() {
        const center = ref({ lng: 11.3426, lat: 44.4939 }); // Piazza Maggiore, Bologna
        const zoom = ref(13);
        let map = null;
        let error = false;
        let loading = false;
        let sensor_locations = [];

        onMounted(async () => {
            await populateSensorLocations();
            initMap();
        });

        async function populateSensorLocations() {
            loading = true;
            await fetch('/data/sensor_locations.json')
                .then((response) => {
                    if (!response.ok)
                        throw new Error('Network response was not ok');
                    return response.json();
                })
                .then((data) => {
                    sensor_locations = data;
                    loading = false;
                })
                .catch((err) => {
                    error = 'Failed to load sensor_locations';
                    loading = false;
                    console.error('Error fetching JSON:', err);
                });
        }

        // Initialization of OpenStreetMap's map
        function initMap() {
            // Leaflet's interactive map
            map = L.map('map').setView(
                [center.value.lat, center.value.lng],
                zoom.value
            );

            // OpenStreetMap's layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            for (const sensor_location of sensor_locations)
                L.marker([sensor_location.lat, sensor_location.lng])
                    .addTo(map)
                    .bindPopup(sensor_location.desc);

            let currentLat, currentLng;

            function updateCurrentCoordinates () {
                const newCenter = map.getCenter();
                currentLat = newCenter.lat.toFixed(6);
                currentLng = newCenter.lng.toFixed(6);
            }

            updateCurrentCoordinates();

            // Update map's coordinates on move
            map.on('moveend', () => {
                updateCurrentCoordinates();
                center.value = {
                    lat: currentLat,
                    lng: currentLng
                };
                zoom.value = map.getZoom();
            });

            // Boundaries of Bologna Province
            fetch('/data/amministrative_boundaries.geojson')
                .then((response) => response.json())
                .then((data) => {
                    const administrativeBoundariesLayer = L.geoJSON(data, {
                        style(feature) {
                            return {
                                color: '#ff7800',
                                weight: 2,
                                opacity: 0.65
                            };
                        },
                        pointToLayer(feature, latlng) {
                            return L.circleMarker(latlng, {
                                radius: 8,
                                fillColor: '#ff7800',
                                color: '#000',
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            });
                        }
                    }).addTo(map);
                });

            const coordinatesCopyBtn = document.getElementById(
                'coordinates-copy-btn'
            );
            if (coordinatesCopyBtn)
                coordinatesCopyBtn.addEventListener('click', function () {
                    const coordText = `${currentLat}\t${currentLng}`;

                    navigator.clipboard
                        .writeText(coordText)
                        .then(() => {
                            // Feedback visivo che la copia è avvenuta
                            const btn = this;
                            const originalText = btn.textContent;
                            btn.textContent = 'Copiato!';
                            btn.style.backgroundColor = '#2196F3';

                            // Ripristino del testo originale dopo 1.5 secondi
                            setTimeout(() => {
                                btn.textContent = originalText;
                                btn.style.backgroundColor = '';
                            }, 1.5 * 1000); // ms
                        })
                        .catch((err) => {
                            console.error(
                                'Errore nella copia delle coordinate: ',
                                err
                            );
                            alert(
                                'Non è stato possibile copiare le coordinate. Prova a farlo manualmente.'
                            );
                        });
                });
        }

        return {
            center,
            zoom
        };
    }
});

document.addEventListener('DOMContentLoaded', () => {
    app.mount('#app');
    // sensors-list
});
