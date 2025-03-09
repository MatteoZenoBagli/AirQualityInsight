const { createApp, ref, onMounted } = Vue;

const app = createApp({
    setup() {
        const center = ref({ lng: 11.3426, lat: 44.4939 }); // Piazza Maggiore, Bologna
        const zoom = ref(13);
        let map = null;
        let error = false;
        const loading = ref(false);

        onMounted(async () => {
            initMap();
            // await populateSensorLocations();
            // await drawPostalCodeBoundaries();
        });

        async function loadData(filename) {
            loading.value = true;

            try {
                const path = `/data/${filename}`;
                const response = await fetch(path);
                if (!response.ok) throw new Error('Failed to load data');
                return response.json();
            } catch (err) {
                console.error(err);
            } finally {
                loading.value = false;
            }
        }

        async function populateSensorLocations() {
            const sensorLocations = await loadData('sensor_locations.json');
            if (!sensorLocations) throw 'Data not provided';

            for (const sensorLocation of sensorLocations)
                L.marker([sensorLocation.lat, sensorLocation.lng])
                    .addTo(map)
                    .bindPopup(sensorLocation.desc);
        }

        async function drawPostalCodeBoundaries() {
            // Postal Code Boundaries of the Municipality of Bologna
            const postalCodeBoundaries = await loadData('caps.geojson');
            if (!postalCodeBoundaries) throw 'Data not provided';

            let geojsonLayer;

            function getColor(cap) {
                const colors = {
                    40121: '#ff7800', // Pure FF7800 (Base Color)
                    40122: '#ff8519', // Slightly lighter
                    40123: '#ff9232', // Light orange
                    40124: '#ff9f4c', // Pale orange
                    40125: '#ffac66', // Very pale orange
                    40126: '#ff6a00', // Slightly darker
                    40127: '#ff5c00', // Darker orange
                    40128: '#ff4e00', // Deep orange
                    40129: '#ff4000', // Very deep orange
                    40131: '#eb7000', // Muted orange
                    40132: '#d66600', // Brownish orange
                    40133: '#c25d00', // Dark brownish orange
                    40134: '#ffb680', // Light peachy orange
                    40135: '#ffc499', // Very light peachy orange
                    40136: '#ff8f38', // Soft orange
                    40137: '#ff6200', // Bright orange-red
                    40138: '#e56e00', // Earthy orange
                    40139: '#ff9a47', // Pastel orange
                    40141: '#cc6200' // Deep earthy orange
                };
                return colors[cap] || '#ff7800';
            }

            function highlightFeature(feature, layer) {
                if (!feature.properties) return;
                if (!feature.properties.cap) return;

                const cap = feature.properties.cap;
                layer.bindPopup(`<b>CAP:</b> ${cap}`).openPopup();

                layer.setStyle({
                    color: getColor(cap),
                    weight: 3,
                    opacity: 1,
                    fillColor: getColor(cap),
                    fillOpacity: 0.5
                });

                /** @see https://leafletjs.com/reference.html#divoverlay-bringtofront */
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge)
                    layer.bringToFront();
            }

            function resetFeatureStyle(layer) {
                geojsonLayer.resetStyle(layer);
            }

            function style(feature) {
                const cap = feature.properties.cap;

                return {
                    color: getColor(cap),
                    weight: 2,
                    opacity: 0.5,
                    fillColor: getColor(cap),
                    fillOpacity: 0.2
                };
            }

            function pointToLayer(feature, latlng) {
                const cap = feature.properties.cap;
                return L.circleMarker(latlng, {
                    radius: 8,
                    color: '#000',
                    weight: 3,
                    opacity: 1,
                    fillColor: getColor(cap),
                    fillOpacity: 0.5
                });
            }

            function onEachFeature(feature, layer) {
                layer.on({
                    mouseover: function () {
                        highlightFeature(feature, layer);
                    },
                    mouseout: function () {
                        resetFeatureStyle(layer);
                    },
                    click: function () {
                        highlightFeature(feature, layer);

                        /**
                         * Sets a map view that contains the given geographical bounds with the maximum zoom level possible.
                         * @see https://leafletjs.com/reference.html#map-fitbounds
                         */
                        // map.fitBounds(layer.getBounds());
                    }
                });
            }

            for (const feature of postalCodeBoundaries.features) {
                geojsonLayer = L.geoJSON(feature, {
                    style,
                    pointToLayer,
                    onEachFeature
                }).addTo(map);
            }
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

            let currentLat, currentLng;

            function updateCurrentCoordinates() {
                const newCenter = map.getCenter();
                currentLat = newCenter.lat.toFixed(4);
                currentLng = newCenter.lng.toFixed(4);
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
            loading,
            center,
            zoom
        };
    }
});

document.addEventListener('DOMContentLoaded', () => {
    app.mount('#app');
});
