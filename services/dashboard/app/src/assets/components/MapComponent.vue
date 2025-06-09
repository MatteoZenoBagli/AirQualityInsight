<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ref } from "vue";

export default {
    name: "MapComponent",
    data() {
        return {
            center: ref({ lng: 11.3426, lat: 44.4939 }), // Piazza Maggiore, Bologna
            zoom: ref(13),
            map: null,
            error: false,
            loading: ref(false),
            show: {
                sensorLocations: false,
                postalCodeBoundaries: false,
                neighborhoods: false,
                zones: false,
            },
            data: {
                sensorLocations: [],
                postalCodeBoundaries: [],
                neighborhoods: [],
                zones: [],
            },
            layers: {
                sensorLocations: [],
                postalCodeBoundaries: [],
                neighborhoods: [],
                zones: [],
            },
        };
    },
    methods: {
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
                        btn.textContent = "Copied!";
                        btn.classList.add("copied");

                        // Ripristino del testo originale dopo 1.5 secondi
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.classList.remove("copied");
                        }, 1.5 * 1000); // ms
                    })
                    .catch((err) => {
                        console.error(
                            "Error copying coordinates: ",
                            err
                        );
                        alert(
                            "Could not copy coordinates. Try doing it manually."
                        );
                    });
            });
        },
        toggleLayer(layer, hideOrEvent = false) {
            const hide = hideOrEvent instanceof Event ? false : hideOrEvent;

            this.show[layer] = !this.show[layer];
            if (hide) this.show[layer] = false;

            const exclusiveGroups = {
                postalCodeBoundaries: ["neighborhoods", "zones"],
                neighborhoods: ["postalCodeBoundaries", "zones"],
                zones: ["postalCodeBoundaries", "neighborhoods"],
            };

            if (this.show[layer]) {
                this.drawLayer(layer);
                if (exclusiveGroups[layer])
                    for (const otherLayer of exclusiveGroups[layer])
                        this.toggleLayer(otherLayer, true);
            } else this.clearLayer(layer);
        },
        clearLayer(layer) {
            for (const l of this.layers[layer])
                if (this.map) this.map.removeLayer(l);

            this.layers[layer] = [];
        },
        async populateLayer(layer) {
            const dataFile = {
                sensorLocations: "sensor_locations.json",
                postalCodeBoundaries: "caps.geojson",
                neighborhoods: "neighborhoods.geojson",
                zones: "zones.geojson",
            };

            const data = await this.loadData(dataFile[layer]);
            if (!data) throw "Data not provided";

            if ("sensorLocations" === layer) {
                this.data[layer] = data.slice(0, 50); // TODO REMOVE LIMIT
                // this.data.sensorLocations = sensorLocations;
                return;
            }

            this.data[layer] = data.features;
        },
        async drawLayer(layer) {
            if (!this.data[layer]) return console.error("Data not provided");

            if ("sensorLocations" === layer) {
                for (const sensorLocation of this.data[layer]) {
                    const marker = L.marker([
                        sensorLocation.lat,
                        sensorLocation.lng,
                    ]);
                    if (sensorLocation.desc)
                        marker.bindPopup(sensorLocation.desc);
                    marker.addTo(this.map);

                    this.layers[layer].push(marker);
                }
                return;
            }

            this.clearLayer(layer);

            let geojsonLayer;

            const highlightFeature = (feature, layer) => {
                if (!feature.properties) return;

                const value = feature.properties[config.propertyKey];
                const displayValue = config.displayKey
                    ? feature.properties[config.displayKey]
                    : value;

                layer
                    .bindPopup(`<b>${config.labelKey}:</b> ${displayValue}`)
                    .openPopup();

                layer.setStyle({
                    color: getColor(value),
                    weight: 3,
                    opacity: 1,
                    fillColor: getColor(value),
                    fillOpacity: 0.5,
                });

                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge)
                    layer.bringToFront();
            };

            const createStyle = (feature) => {
                const value = feature.properties[config.propertyKey];
                return {
                    color: getColor(value),
                    weight: 2,
                    opacity: 0.5,
                    fillColor: getColor(value),
                    fillOpacity: 0.2,
                };
            };

            const pointToLayer = (feature, lat_lng) => {
                const value = feature.properties[config.propertyKey];
                return L.circleMarker(lat_lng, {
                    radius: 8,
                    color: "#000",
                    weight: 3,
                    opacity: 1,
                    fillColor: getColor(value),
                    fillOpacity: 0.5,
                });
            };
            const colors = this.getOrangeColorPalette();
            const config = this.getLayerConfig(layer, colors);
            const getColor = (value) => {
                return config.colorMap[value] || colors.baseOrange;
            };

            const resetFeatureStyle = (layer) => {
                geojsonLayer.resetStyle(layer);
            };

            function onEachFeature(feature, layer) {
                layer.on({
                    mouseover: () => highlightFeature(feature, layer),
                    mouseout: () => resetFeatureStyle(layer),
                    click: () => highlightFeature(feature, layer),
                });
            }

            for (const feature of this.data[layer]) {
                geojsonLayer = L.geoJSON(feature, {
                    style: createStyle,
                    pointToLayer,
                    onEachFeature,
                }).addTo(this.map);

                this.layers[layer].push(geojsonLayer);
            }
        },
        getDisplayName(key) {
            const displayNames = {
                sensorLocations: "Sensors",
                postalCodeBoundaries: "CAPs",
                neighborhoods: "Neighborhoods",
                zones: "Zones",
            };
            return displayNames[key] || key;
        },
        getOrangeColorPalette() {
            return {
                veryLightPeachyOrange: "#ffc499",
                lightPeachyOrange: "#ffb680",
                veryPaleOrange: "#ffac66",
                paleOrange: "#ff9f4c",
                pastelOrange: "#ff9a47",
                lightOrange: "#ff9232",
                softOrange: "#ff8f38",
                slightlyLighter: "#ff8519",
                baseOrange: "#ff7800",
                slightlyDarker: "#ff6a00",
                brightOrangeRed: "#ff6200",
                darkerOrange: "#ff5c00",
                deepOrange: "#ff4e00",
                veryDeepOrange: "#ff4000",
                mutedOrange: "#eb7000",
                earthyOrange: "#e56e00",
                brownishOrange: "#d66600",
                deepEarthyOrange: "#cc6200",
                darkBrownishOrange: "#c25d00",
            };
        },
        getLayerConfig(layer, colors) {
            const configs = {
                // Postal Code Boundaries of the Municipality of Bologna
                postalCodeBoundaries: {
                    propertyKey: "cap",
                    labelKey: "CAP",
                    colorMap: {
                        40121: colors.veryLightPeachyOrange,
                        40122: colors.lightPeachyOrange,
                        40123: colors.veryPaleOrange,
                        40124: colors.paleOrange,
                        40125: colors.pastelOrange,
                        40126: colors.lightOrange,
                        40127: colors.softOrange,
                        40128: colors.slightlyLighter,
                        40129: colors.baseOrange,
                        40131: colors.slightlyDarker,
                        40132: colors.brightOrangeRed,
                        40133: colors.darkerOrange,
                        40134: colors.deepOrange,
                        40135: colors.veryDeepOrange,
                        40136: colors.mutedOrange,
                        40137: colors.earthyOrange,
                        40138: colors.brownishOrange,
                        40139: colors.deepEarthyOrange,
                        40141: colors.darkBrownishOrange,
                    },
                },
                // Neighborhoods of the Municipality of Bologna
                neighborhoods: {
                    propertyKey: "cod_quar",
                    labelKey: "Quartiere",
                    displayKey: "quartiere",
                    colorMap: {
                        11: colors.lightPeachyOrange,
                        12: colors.paleOrange,
                        13: colors.lightOrange,
                        14: colors.slightlyLighter,
                        15: colors.darkerOrange,
                        16: colors.darkBrownishOrange,
                    },
                },
                // Zones of the Municipality of Bologna
                zones: {
                    propertyKey: "numquart",
                    labelKey: "Zona",
                    displayKey: "nomezona",
                    colorMap: {
                        11: colors.veryPaleOrange,
                        12: colors.pastelOrange,
                        13: colors.softOrange,
                        14: colors.baseOrange,
                        15: colors.brightOrangeRed,
                        16: colors.deepOrange,
                    },
                },
            };

            return configs[layer];
        },
    },
    async mounted() {
        this.initMap();

        const layers = [
            "sensorLocations",
            "postalCodeBoundaries",
            "neighborhoods",
            "zones",
        ];

        for (const layer of layers) {
            await this.populateLayer(layer);
            if (this.show[layer]) this.drawLayer(layer);
        }
    },
};
</script>

<template>
    <div class="map">
        <!-- <div
            v-for="(marker, index) in data.sensorLocations"
            :key="index"
            class="map-marker"
            @click="$emit('marker-click', marker)"
        ></div> -->
        <div v-if="data.sensorLocations.length === 0" class="no-data">
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
                    <span>Markers:</span>
                    <span>{{ data.sensorLocations.length }}</span>
                </pre>
                <hr>
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
                    v-for="(value, key) in show"
                    :key="key"
                    class="toggle-btn"
                    @click="toggleLayer(key)"
                    :class="{ active: value }"
                >
                    {{ value ? "Hide" : "Show" }}
                    {{ getDisplayName(key) }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.map {
    height: 100%;
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
    height: 100%;
    width: 100%;

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
    width: 10rem;
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

    hr {
        width: 100%;
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