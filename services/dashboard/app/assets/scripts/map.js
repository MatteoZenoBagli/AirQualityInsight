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
                    // sensor_locations = data;
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
                    .bindPopup(sensor_location.description);

            // Update map's coordinates on move
            map.on('moveend', () => {
                const newCenter = map.getCenter();
                center.value = {
                    lat: newCenter.lat,
                    lng: newCenter.lng
                };
                zoom.value = map.getZoom();
            });

            // Boundaries of Bologna Province
            fetch('/data/amministrative_boundaries.geojson')
                .then((response) => response.json())
                .then((data) => {
                    L.geoJSON(data, {
                        style: function (feature) {
                            return {
                                color: '#ff7800',
                                weight: 2,
                                opacity: 0.65
                            };
                        },
                        onEachFeature: function (feature, layer) {
                            layer.bindPopup(feature.properties.nome_campo);
                        }
                    }).bindPopup(function (layer) {
                        return layer.feature.properties.description;
                    }).addTo(map);
                });
            // const boundaryCoords = [
            //     [44.7264, 11.1378], // Northwest (near Galliera)
            //     [44.7264, 11.8128], // Northeast (near Mordano)
            //     [44.1456, 11.8128], // Southeast (near Alto Reno Terme)
            //     [44.1456, 10.9], // Southwest (near Lizzano in Belvedere)
            //     [44.7264, 11.1378] // Back to start to close the polygon
            // ];

            // // Create a polygon for the province boundary
            // const boundaryPolygon = L.polygon(boundaryCoords, {
            //     color: 'red',
            //     weight: 3,
            //     fillColor: '#fd8d3c',
            //     fillOpacity: 0.2
            // }).addTo(map);

            // boundaryPolygon.bindPopup(
            //     '<b>Bologna Province</b><br>Emilia-Romagna, Italy'
            // );

            // // Add a legend
            // const legend = L.control({ position: 'bottomright' });
            // legend.onAdd = function (map) {
            //     const div = L.DomUtil.create('div', 'info legend');
            //     div.innerHTML =
            //         '<h4>Bologna Province</h4>' +
            //         '<i style="background: #fd8d3c"></i> Province Boundary<br>' +
            //         '<i style="background: blue"></i> City Locations';
            //     return div;
            // };
            // legend.addTo(map);

            // // Add information control
            // const info = L.control();
            // info.onAdd = function (map) {
            //     this._div = L.DomUtil.create('div', 'info');
            //     this.update();
            //     return this._div;
            // };
            // info.update = function () {
            //     this._div.innerHTML =
            //         '<h4>Bologna Province, Italy</h4>' +
            //         'The province contains ' +
            //         cities.length +
            //         ' municipalities';
            // };
            // info.addTo(map);
        }

        return {
            center,
            zoom
        };
    }
});

document.addEventListener('DOMContentLoaded', () => {
    app.mount('#app');
});
