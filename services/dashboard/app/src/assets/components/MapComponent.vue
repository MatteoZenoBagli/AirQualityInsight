<script>
import L from "leaflet";
import 'leaflet.heat';
import "leaflet/dist/leaflet.css";
import { ref } from "vue";
import pushpinSvg from '@/assets/pushpin.svg';

export default {
  name: "MapComponent",
  data() {
    return {
      center: ref({ lng: '11.3426000', lat: '44.4939000' }), // Piazza Maggiore, Bologna
      zoom: ref(13),
      map: null,
      measurements: ['pm25', 'pm10', 'voc', 'co2'],
      heatLayer: null,
      selectedMeasurement: 'pm25',
      maxHeatLatLng: 250,
      error: false,
      loading: ref(false),
      show: {
        sensorLocations: true,
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
      gridType: 'none',
      isHovered: ref(false),
      isPinned: ref(false),
      thresholds: {
        pm25: { good: 15, moderate: 35, poor: 55 },
        pm10: { good: 25, moderate: 50, poor: 90 },
        voc: { good: 1, moderate: 3, poor: 5 },
        co2: { good: 400, moderate: 800, poor: 1200 }
      },
      heatLatLng: {
        pm25: [],
        pm10: [],
        voc: [],
        co2: [],
      }
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
        currentLat = newCenter.lat.toFixed(7);
        currentLng = newCenter.lng.toFixed(7);
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
            // Visual feedback that copying has occurred
            const btn = coordinatesCopyBtn;
            const originalText = btn.textContent;
            btn.textContent = "Copied!";
            btn.classList.add("copied");

            // Restore original text after 1.5 seconds
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

      // Leaflet caches on the parent container may result in a misaligned center
      this.map.whenReady(() => {
        setTimeout(() => {
          this.map.invalidateSize();
        }, 100);
      });
      window.addEventListener('resize', () => {
        this.map.invalidateSize();
      });

      this.heatLayer = L.heatLayer([], {
        radius: 30,
        blur: 25,
        maxZoom: 17,
        gradient: {
          0.2: '#00ff00',  // Green - good quality
          0.4: '#ffff00',  // Yellow - moderate
          0.6: '#ff8000',  // Orange - low
          1.0: '#ff0000'   // Red - bad
        }
      }).addTo(this.map);
    },
    getIntensity(value, parameter) {
      const threshold = this.thresholds[parameter]

      if (value <= threshold.good) return 0.2
      if (value <= threshold.moderate) return 0.4
      if (value <= threshold.poor) return 0.7
      return 1.0
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
    registerNewMeasurement(data) {
      if (!this.data.sensorLocations?.length) return;

      for (const sensor of this.data.sensorLocations)
        if (data.sensor_id === sensor.id) {
          this.highlightSensor(sensor);

          for (const measurement of this.measurements) {
            const intensity = this.getIntensity(data[measurement], measurement);
            const latLng = [sensor.lat, sensor.lng, intensity];
            this.heatLatLng[measurement].unshift(latLng);
            if (this.heatLatLng[measurement].length > this.maxHeatLatLng)
              this.heatLatLng[measurement] = this.heatLatLng[measurement].slice(0, this.maxHeatLatLng);
          }
          this.updateHeatmap();
          break;
        }
    },
    updateHeatmap() {
      this.heatLayer.setLatLngs(this.heatLatLng[this.selectedMeasurement]);
    },
    highlightSensor(sensor) {
      sensor.marker?.setOpacity(0.75);
      setTimeout(() => {
        sensor.marker?.setOpacity(1);
      }, 250);
    },
    async fetchSensorDataFromAPI() {
      try {
        const apiUrl = import.meta.env.VITE_SOCKET_SERVER_URL;
        const jsonResponse = await fetch(`${apiUrl}/api/sensors`);

        if (!jsonResponse.ok)
          throw new Error(`HTTP error! status: ${jsonResponse.status}`);

        const response = await jsonResponse.json();
        if (!response)
          throw new Error(response || 'API request failed');

        const sensors = response.map(sensor => ({
          id: sensor.sensor_id,
          lat: sensor.location.coordinates[1], // latitude
          lng: sensor.location.coordinates[0], // longitude
          desc: sensor.sensor_id, //sensor.name,
          active: sensor.active,
          ip: sensor.ip,
          last_seen: sensor.last_seen
        }));

        this.$emit('sensors-loaded', sensors);
        console.log(`Loaded ${sensors.length} sensors from API`);
        return sensors;
      } catch (error) {
        console.error('Unable to fetch sensors from API:', error);
      }
    },
    async populateLayer(layer) {
      const dataFile = {
        sensorLocations: null,
        postalCodeBoundaries: "caps.geojson",
        neighborhoods: "neighborhoods.geojson",
        zones: "zones.geojson",
      };

      let data;

      if ("sensorLocations" === layer) {
        data = await this.fetchSensorDataFromAPI();
        if (!data) throw "Data not provided";
        this.data[layer] = data;
      } else {
        data = await this.loadData(dataFile[layer]);
        if (!data) throw "Data not provided";
        this.data[layer] = data.features;
      }
    },
    async refreshSensorData() {
      this.data.sensorLocations = null;
      const data = await this.fetchSensorDataFromAPI();
      if (!data) throw "Data not provided";
      this.data.sensorLocations = data;
    },
    async drawLayer(layer) {
      if (!this.data[layer]) return console.error("Data not provided");
      const pushpinIcon = L.icon({
        iconUrl: pushpinSvg,
        iconSize: [24, 24],
        iconAnchor: [12, 20],
        popupAnchor: [0, -20],
      });

      if ("sensorLocations" === layer) {
        for (const sensorLocation of this.data[layer]) {
          const marker = L.marker([
            sensorLocation.lat,
            sensorLocation.lng,
          ],
            { icon: pushpinIcon }
          );
          if (sensorLocation.desc)
            marker.bindPopup(sensorLocation.desc);
          marker.addTo(this.map);
          marker.on('click', () => {
            this.$emit('marker-click', sensorLocation);
          });

          this.layers[layer].push(marker);
          sensorLocation.marker = marker;
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
    centerOnLocation(lat, lng, zoom = 16) {
      if (!this.map) throw 'Map not initialized';

      this.map.flyTo([lat, lng], zoom, {
        animate: true,
        duration: 1.5 // sec
      });
    },
    onGridChange() {
      const mapContainer = document.querySelector('.map-container');
      if (!mapContainer) return;
      mapContainer.classList.remove(
        'grid-simple',
        'grid-dark',
        'grid-fine',
        'grid-coordinate',
        'grid-crosshair',
        'grid-dashed',
        'grid-dots',
        'grid-animated'
      );
      if (this.gridType !== 'none') mapContainer.classList.add(`grid-${this.gridType}`);
    }
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
    <!--
    <div
      v-for="(marker, index) in data.sensorLocations"
      :key="index"
      class="map-marker"
      @click="$emit('marker-click', marker)"
    ></div>
    <div v-if="data.sensorLocations.length === 0" class="no-data">
      No markers to display
    </div>
    -->

    <div class="map-container">
      <div v-if="loading" class="loading-overlay">
        <img src="../loading-spinner.svg" alt="Loading..." class="loading-gif" />
      </div>
      <div id="map"></div>
      <div v-if="gridType === 'gray'" class="map-grid-overlay map-grid-overlay--gray"></div>
      <div v-if="gridType === 'red'" class="map-grid-overlay map-grid-overlay--red"></div>
      <div v-if="gridType === 'crosshair'" class="map-grid-overlay map-grid-overlay--crosshair"></div>
      <div class="center-marker">
        <div class="icon"></div>
      </div>
      <div :class="['controls', { pinned: isPinned }]" :aria-expanded="isHovered" @mouseover="isHovered = true"
        @mouseleave="isHovered = false">
        <div class="tools">
          <h2>Controls</h2>
          <div class="pushpin" @click="isPinned = !isPinned" title="Pin / Unpin"></div>
        </div>
        <pre>
          <span>Markers:</span>
          <span>{{ this.data.sensorLocations?.length }}</span>
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
        <pre>
          <span>Zoom:</span>
          <span>{{ this.zoom }}</span>
        </pre>
        <button class="copy-btn" id="coordinates-copy-btn">
          Copy
        </button>
        <button v-for="(value, key) in show" :key="key" class="toggle-btn" @click="toggleLayer(key)"
          :class="{ active: value }">
          {{ value ? "Hide" : "Show" }}
          {{ getDisplayName(key) }}
        </button>
        <hr>
        <div class="measurements-controls">
          <label><strong>Measurement:</strong></label>
          <select v-model="selectedMeasurement" @change="updateHeatmap">
            <option value="pm25">PM2.5</option>
            <option value="pm10">PM10</option>
            <option value="voc">VOC</option>
            <option value="co2">CO2</option>
          </select>
        </div>
        <p>Limit of measurements:</p>
        <div class="measurements-controls">
          <input
            id="parameter-slider"
            type="range"
            v-model="this.maxHeatLatLng"
            :min="50"
            :max="1000"
            step="10"
          />
          <span class="help" title="The higher the limit, the more accurate the measurements.">{{ this.maxHeatLatLng }}</span>
        </div>
          <div class="measurements-controls">
            <p>Current measurements:</p>
            <p>{{ this.heatLatLng[this.selectedMeasurement].length }}</p>
          </div>
        <hr>
        <div class="grid-controls">
          <label><strong>Grid:</strong></label>
          <select id="grid-select" v-model="gridType" class="grid-select" @change="onGridChange">
            <option value="none">None</option>
            <option value="gray">Gray</option>
            <option value="red">Red</option>
            <option value="crosshair">Crosshair</option>
          </select>
        </div>
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

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 1px, transparent 1px);
    background-size: 30px 30px;
    pointer-events: none;
    z-index: 400;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &.show-grid::before {
    opacity: 1;
  }
}

.map-grid-overlay {
  --red-line-color: rgba(255, 0, 0, 0.5);
  --gray-line-color: rgba(0, 0, 0, 0.25);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 400;

  &--gray {
    border-bottom: solid 1px var(--gray-line-color);
    border-right: solid 1px var(--gray-line-color);
    background-image:
      linear-gradient(to right, var(--gray-line-color) 1px, transparent 1px),
      linear-gradient(to bottom, var(--gray-line-color) 1px, transparent 1px);
    background-size: 5% 5%;
  }

  &--red {
    border-bottom: solid 2px var(--red-line-color);
    border-right: solid 2px var(--red-line-color);
    background-image:
      linear-gradient(to right, var(--red-line-color) 2px, transparent 2px),
      linear-gradient(to bottom, var(--red-line-color) 2px, transparent 2px);
    background-size: 10% 10%;
  }

  &--crosshair {
    border: solid 2px var(--red-line-color);

    &::before,
    &::after {
      content: '';
      position: absolute;
      background: var(--red-line-color);
    }

    &::before {
      top: 50%;
      left: 0;
      right: 0;
      height: 2px;
      transform: translateY(-50%);
    }

    &::after {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-50%);
    }
  }
}

.controls {
  width: 44px;
  height: 44px;
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 999;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  transition: all 250ms ease-in-out;
  border: 2px solid rgba(0, 0, 0, 0.2);
  overflow-x: hidden;

  background-color: white;
  background-clip: padding-box;
  background-size: 24px 24px;
  background-image: url('../pushpin.svg');
  background-repeat: no-repeat;
  background-position-x: center;
  background-position-y: center;

  & * {
    display: none;
    opacity: 0;
    visibility: hidden;
  }

  &[aria-expanded="true"],
  &.pinned {
    background: white;
    width: 15rem;
    height: auto;

    & * {
      display: inherit;
      opacity: 1;
      visibility: visible;
    }
  }

  &.pinned .pushpin {
    background-color: #f0f0f0 !important;
    transform: scale(1.1) rotate(30deg);
  }

  .tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    width: 100%;

    .pushpin {
      background-clip: padding-box;
      background-size: 24px 24px;
      background-image: url('../pushpin.svg');
      background-repeat: no-repeat;
      background-position-x: center;
      background-position-y: center;
      width: 40px;
      height: 40px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 50%;

      &:hover {
        background-color: #f0f0f0;
        transform: scale(1.1) rotate(30deg);
      }
    }
  }

  pre {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  hr {
    width: 100%;
    margin: 0.5rem 0;
  }

  .measurements-controls + p {
    margin-top: 1rem;
  }

  .measurements-controls .help {
    cursor: help;
  }

  .measurements-controls,
  .grid-controls {
    display: flex;
    justify-content: space-between;
    width: 100%;

    select {
      padding: 0 0.25rem;
    }
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
  z-index: 998;
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
  background-color: rgba(0, 0, 0, 0.5);
  /* Semi-transparent background */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-gif {
  width: 80px;
  height: 80px;
}

.pulsing-marker {
  background: transparent;
  border: none;
}

.pulse {
  --bg-color: #ff4444;
  width: 20px;
  height: 20px;
  background-color: var(--bg-color);
  border-radius: 50%;
  position: relative;
  animation: pulse 2s infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--bg-color);
    border-radius: 50%;
    animation: pulse-ring 2s infinite;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }

  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}
</style>