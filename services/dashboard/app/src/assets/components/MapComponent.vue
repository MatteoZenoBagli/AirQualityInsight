<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ref } from "vue";

export default {
    name: "MapComponent",
    props: {
        markers: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            center: ref({ lng: 11.3426, lat: 44.4939 }), // Piazza Maggiore, Bologna
            zoom: ref(13),
            map: null,
            error: false,
            loading: ref(false),
            show: {
                postalCodeBoundaries: false,
            },
            data: {
                sensorLocations: [],
                postalCodeBoundaries: [],
            },
            geojsonLayers: {
                postalCodeBoundaries: [],
            },
        };
    },
    methods: {
        // Initialization of OpenStreetMap's map
        initMap() {
            // Leaflet's interactive map
            this.map = L.map("map").setView(
                [this.center.lat, this.center.lng],
                this.zoom
            );

            // OpenStreetMap's layer
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(this.map);

            let currentLat, currentLng;

            const updateCurrentCoordinates = () => {
                const newCenter = this.map.getCenter();
                currentLat = newCenter.lat.toFixed(4);
                currentLng = newCenter.lng.toFixed(4);
            };

            updateCurrentCoordinates();

            // Update map's coordinates on move
            this.map.on("moveend", () => {
                updateCurrentCoordinates();
                this.center = {
                    lat: currentLat,
                    lng: currentLng,
                };
                this.zoom = this.map.getZoom();
            });

            const coordinatesCopyBtn = document.getElementById(
                "coordinates-copy-btn"
            );
            if (!coordinatesCopyBtn) return;

            coordinatesCopyBtn.addEventListener("click", () => {
                const coordText = `${currentLat}\t${currentLng}`;

                navigator.clipboard
                    .writeText(coordText)
                    .then(() => {
                        // Feedback visivo che la copia è avvenuta
                        const btn = coordinatesCopyBtn;
                        const originalText = btn.textContent;
                        btn.textContent = "Copiato!";
                        btn.classList.add("copied");

                        // Ripristino del testo originale dopo 1.5 secondi
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.classList.remove("copied");
                        }, 1.5 * 1000); // ms
                    })
                    .catch((err) => {
                        console.error(
                            "Errore nella copia delle coordinate: ",
                            err
                        );
                        alert(
                            "Non è stato possibile copiare le coordinate. Prova a farlo manualmente."
                        );
                    });
            });
        },
        async populateSensorLocations() {
            const sensorLocations = await this.loadData(
                "sensor_locations.json"
            );
            if (!sensorLocations) throw "Data not provided";
            this.data.sensorLocations = sensorLocations;
            // for (const sensorLocation of sensorLocations)
            //     L.marker([sensorLocation.lat, sensorLocation.lng])
            //         .addTo(map)
            //         .bindPopup(sensorLocation.desc);
        },
        async populatePostalCodeBoundaries() {
            const postalCodeBoundaries = await this.loadData("caps.geojson");
            if (!postalCodeBoundaries) throw "Data not provided";
            this.data.postalCodeBoundaries = postalCodeBoundaries.features;
        },
        async drawPostalCodeBoundaries() {
            // Postal Code Boundaries of the Municipality of Bologna
            if (!this.data.postalCodeBoundaries)
                return console.error("Data not provided");

            this.clearPostalCodeBoundaries();

            let geojsonLayer;

            function getColor(cap) {
                const colors = {
                    40121: "#ff7800", // Pure FF7800 (Base Color)
                    40122: "#ff8519", // Slightly lighter
                    40123: "#ff9232", // Light orange
                    40124: "#ff9f4c", // Pale orange
                    40125: "#ffac66", // Very pale orange
                    40126: "#ff6a00", // Slightly darker
                    40127: "#ff5c00", // Darker orange
                    40128: "#ff4e00", // Deep orange
                    40129: "#ff4000", // Very deep orange
                    40131: "#eb7000", // Muted orange
                    40132: "#d66600", // Brownish orange
                    40133: "#c25d00", // Dark brownish orange
                    40134: "#ffb680", // Light peachy orange
                    40135: "#ffc499", // Very light peachy orange
                    40136: "#ff8f38", // Soft orange
                    40137: "#ff6200", // Bright orange-red
                    40138: "#e56e00", // Earthy orange
                    40139: "#ff9a47", // Pastel orange
                    40141: "#cc6200", // Deep earthy orange
                };
                return colors[cap] || "#ff7800";
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
                    fillOpacity: 0.5,
                });

                /** @see https://leafletjs.com/reference.html#divoverlay-bringtofront */
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge)
                    layer.bringToFront();
            }

            const resetFeatureStyle = (layer) => {
                geojsonLayer.resetStyle(layer);
            };

            function style(feature) {
                const cap = feature.properties.cap;

                return {
                    color: getColor(cap),
                    weight: 2,
                    opacity: 0.5,
                    fillColor: getColor(cap),
                    fillOpacity: 0.2,
                };
            }

            function pointToLayer(feature, latlng) {
                const cap = feature.properties.cap;
                return L.circleMarker(latlng, {
                    radius: 8,
                    color: "#000",
                    weight: 3,
                    opacity: 1,
                    fillColor: getColor(cap),
                    fillOpacity: 0.5,
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
                    },
                });
            }

            for (const feature of this.data.postalCodeBoundaries) {
                geojsonLayer = L.geoJSON(feature, {
                    style,
                    pointToLayer,
                    onEachFeature,
                }).addTo(this.map);

                this.geojsonLayers.postalCodeBoundaries.push(geojsonLayer);
            }
        },
        async loadData(filename) {
            this.loading = true;

            try {
                const path = `/data/${filename}`;
                const response = await fetch(path);
                if (!response.ok) throw new Error("Failed to load data");
                return response.json();
            } catch (err) {
                console.error(err);
            } finally {
                this.loading = false;
            }
        },
        clearPostalCodeBoundaries() {
            for (const layer of this.geojsonLayers.postalCodeBoundaries) {
                if (!this.map) continue;

                this.map.removeLayer(layer);
            }

            this.geojsonLayers.postalCodeBoundaries = [];
        },
        togglePostalCodeBoundaries() {
            this.show.postalCodeBoundaries = !this.show.postalCodeBoundaries;
            if (this.show.postalCodeBoundaries) this.drawPostalCodeBoundaries();
            else this.clearPostalCodeBoundaries();
        },
    },
    async mounted() {
        this.initMap();
        // this.populateSensorLocations();
        await this.populatePostalCodeBoundaries();
        if (this.show.postalCodeBoundaries) this.drawPostalCodeBoundaries();
    },
};
</script>

<template>
    <div class="map">
        <div
            v-for="(marker, index) in markers"
            :key="index"
            class="map-marker"
            @click="$emit('marker-click', marker)"
        ></div>
        <div class="map-overlay">
            <strong>Markers: {{ markers.length }}</strong>
        </div>
        <div v-if="markers.length === 0" class="no-data">
            No markers to display
        </div>

        <div class="map-container">
            <div v-if="loading" class="loading-overlay">
                <img
                    src="../loading-spinner.svg"
                    alt="Loading..."
                    class="loading-gif"
                />
            </div>
            <div id="map"></div>
            <div class="center-marker">
                <div class="icon"></div>
            </div>
            <div class="controls">
                <pre>
                    <span>Latitude:</span>
                    <span>{{ this.center.lat }}</span>
                </pre>
                <pre>
                    <span>Longitude:</span>
                    <span>{{ this.center.lng }}</span>
                </pre>
                <button class="copy-btn" id="coordinates-copy-btn">
                    Copia
                </button>
                <button
                    class="toggle-btn"
                    @click="togglePostalCodeBoundaries"
                    :class="{ active: show.postalCodeBoundaries }"
                >
                    {{
                        show.postalCodeBoundaries
                            ? "Nascondi CAP"
                            : "Mostra CAP"
                    }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.map {
    height: 450px;
    background-color: #e9f7fe;
    border-radius: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;

    &-overlay {
        position: absolute;
        top: 10px;
        right: 10px;
        background: white;
        padding: 8px;
        border-radius: 4px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }

    &-marker {
        width: 20px;
        height: 20px;
        background-color: red;
        border-radius: 50%;
        position: absolute;
        cursor: pointer;
        transition: transform 0.2s ease;

        &:hover {
            transform: scale(1.2);
        }
    }
}

.no-data {
    color: #666;
    font-style: italic;
}
.map-container {
    height: 800px; // 100%;
    width: 800px; // 100%;

    #map {
        height: 100%;
        width: 100%;
    }
}

.controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 999;
    background: white;
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 0 1rem rgba(0, 0, 0, 0.1);
    width: 9rem;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;

    pre {
        width: 100%;
        display: flex;
        justify-content: space-between;
        margin: 0.25rem 0;
    }
}

.info {
    padding: 0.5rem;
    font: 14px/16px Arial, Helvetica, sans-serif;
    background: white;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 1rem rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;

    h4 {
        margin: 0 0 0.5rem;
        color: #777;
    }
}

.legend {
    line-height: 1.5rem;
    color: #555;
}

.center-marker {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    pointer-events: none;

    .icon {
        width: 25px;
        height: 25px;
        background-color: rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;

        &::before {
            content: "+";
            font-size: 1.75rem;
            color: #e74c3c;
            font-weight: bold;
        }
    }
}

@mixin button-base {
    width: 100%;
    border: none;
    border-radius: 0.25rem;
    margin-top: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    transition: background-color 0.3s;
}

// Button hover effect
@mixin button-hover {
    &:hover {
        background-color: #dfdfdf;
    }
}

// Basic toggle button
.toggle-btn {
    @include button-base;
    @include button-hover;
}

// Copy button with additional states
.copy-btn {
    @include button-base;
    @include button-hover;

    background-color: #4caf50;
    color: white;

    &:hover {
        background-color: #45a049;
    }

    &:active {
        background-color: #3e8e41;
    }

    &.copied {
        background-color: #45a049;
    }
}

.content-frozen {
    pointer-events: none;
    filter: blur(2px);
    opacity: 0.7;
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.loading-gif {
    width: 80px;
    height: 80px;
}
</style>