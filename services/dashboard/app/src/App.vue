<template>
  <div class="app">
    <h1>Dashboard</h1>

    <div class="dashboard">
      <div class="dashboard-component map-component-container">
        <div class="component-header">
          <h2>Map</h2>
          <div class="component-header-buttons">
            <button @click="refreshSensors" class="btn">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
            <button @click="handleActiveSensors" :class="['btn', { 'btn-danger': this.activeSensors }]">
              <i :class="['fas', { 'fa-stop': this.activeSensors, 'fa-play': !this.activeSensors}]"></i> {{ this.activeSensors ? 'Stop' : 'Start' }}
            </button>
          </div>
        </div>
        <MapComponent ref="mapComponent" @marker-click="handleMarkerClick" @sensors-loaded="handleSensorsLoaded" />
      </div>

      <div class="dashboard-component table-component-container">
        <div class="component-header">
          <h2>Last {{ this.maxMessages }} measurements received</h2>
          <div>
            <button @click="refreshTable" class="btn">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
        <TableComponent ref="measurementComponent" :data="measurementData" :columns="measurementColumns"
          @row-click="handleMeasurementRowClick" />
      </div>

      <div class="dashboard-component log-component-container">
        <div class="component-header">
          <h2>System Log</h2>
          <div>
            <button @click="clearLog" class="btn btn-danger">
              <i class="fas fa-trash"></i> Clear
            </button>
          </div>
        </div>
        <LogComponent ref="logComponent" />
      </div>

      <div class="dashboard-component sensors-component-container">
        <div class="component-header">
          <h2>Registered sensors: {{ this.sensorData.length }}</h2>
          <div>
            <button @click="refreshSensors" class="btn">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
        <TableComponent ref="sensorsComponent" :data="sensorData" :columns="sensorColumns"
          @row-click="handleSensorRowClick" />
      </div>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";

import MapComponent from "./assets/components/MapComponent.vue";
import TableComponent from "./assets/components/TableComponent.vue";
import LogComponent from "./assets/components/LogComponent.vue";

export default {
  name: "App",
  components: {
    MapComponent,
    TableComponent,
    LogComponent,
  },
  data() {
    return {
      socket: null,
      maxMessages: 50,
      measurementColumns: [
        { key: "sensor_id", label: "Sensor ID" },
        { key: "timestamp", label: "Timestamp" },
        { key: "temperature", label: "Temperature (°C)" },
        { key: "humidity", label: "Humidity (%)" },
        { key: "pressure", label: "Pressure (hPa)" },
        { key: "pm25", label: "PM25 (µg/m³)" },
        { key: "pm10", label: "PM10 (µg/m³)" },
        { key: "voc", label: "VOC (ppm)" },
        { key: "co2", label: "CO2 (ppm)" },
      ],
      sensorColumns: [
        { key: 'id', label: 'ID' },
        { key: 'lat', label: 'Latitude' },
        { key: 'lng', label: 'Longitude' },
        { key: 'status', label: 'Status' },
      ],
      measurementData: [],
      sensorData: [],
      map: null,
      activeSensors: true,
    };
  },
  created() {
    this.connectSocket();
  },
  beforeDestroy() {
    this.disconnectSocket();
  },
  methods: {
    connectSocket() {
      const serverUrl = import.meta.env.VITE_SOCKET_SERVER_URL;
      this.socket = io(serverUrl);

      this.socket.on("kafka-message", (message) => {
        if (!this.activeSensors) return;
        this.addInfo("Received new measurement");

        message.timestamp = this.formatTimestamp(
          message.timestamp || new Date()
        );
        this.measurementData.unshift(message);
        this.$refs.mapComponent.registerNewMeasurement(message);

        if (this.measurementData.length > this.maxMessages)
          this.measurementData = this.measurementData.slice(0, this.maxMessages);
      });

      this.socket.on("connect", () => {
        this.addInfo("Connected to server");
      });

      this.socket.on("disconnect", () => {
        this.addInfo("Disconnected from server");
      });
    },
    disconnectSocket() {
      if (!this.socket) return;

      this.socket.disconnect();
      this.socket = null;
    },
    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    },
    handleMarkerClick(marker) {
      const sensor = this.sensorData.find(s =>
        s.lat === marker.lat && s.lng === marker.lng
      );
      if (!sensor) return;
      this.centerMapOnSensor(sensor);
      this.addInfo(`Selected sensor from map: ${sensor.id}`);
    },
    handleMeasurementRowClick(row) {
      // Center map on the sensor that sent this measurement
      const sensor = this.sensorData.find(s => s.id === row.sensor_id);
      if (!sensor) return this.addWarning(`Sensor ${row.sensor_id} not found in registered sensors`);
      this.centerMapOnSensor(sensor);
      this.addInfo(`Selected sensor: ${row.sensor_id}`);
    },
    addInfo(msg) {
      this.$refs.logComponent?.addInfo(msg);
    },
    addWarning(msg) {
      this.$refs.logComponent?.addWarning(msg);
    },
    addError(msg) {
      this.$refs.logComponent?.addError(msg);
    },
    clearLog() {
      this.$refs.logComponent?.clearLog();
    },
    handleSensorsLoaded(sensors) {
      this.sensorData = sensors.map(sensor => ({
        ...sensor,
        status: 'Active'
      }));
      this.addInfo(`Loaded ${sensors.length} sensors`);
    },
    refreshSensors() {
      this.$refs.mapComponent.refreshSensorData();
      this.addInfo('Refreshed sensors');
    },
    refreshTable() {
      this.addInfo('Refreshed measurements table');
    },

    handleActiveSensors() {
      if (this.activeSensors) this.addInfo('Stopped sensors data reception');
      else this.addInfo('Started sensors data reception');
      this.activeSensors = !this.activeSensors;
    },
    centerMapOnSensor(sensor) {
      if (!this.$refs.mapComponent) return
      if (!sensor.lat) return;
      if (!sensor.lng) return;

      const mapContainer = document.querySelector('.dashboard-component.map-component-container');
      mapContainer?.scrollIntoView({ behavior: 'smooth' });
      this.$refs.mapComponent.centerOnLocation(sensor.lat, sensor.lng);
    },
    handleSensorRowClick(row) {
      this.addInfo(`Selected sensor: ${row.id}`);
      this.centerMapOnSensor(row);
    }
  },
};
</script>

<style lang="scss">
body {
  font-family: "Arial", sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard {
  display: grid;
  grid-template-areas:
    "map map map"
    "map map map"
    "measurements measurements log"
    "measurements measurements log"
    "sensors sensors sensors"
    "sensors sensors sensors";
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  &-component {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 1rem;
  }
}

.map-component-container {
  grid-area: map;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
}

.table-component-container {
  grid-area: measurements;
  min-width: 0;
  height: 100%;
}

.log-component-container {
  grid-area: log;
  overflow-y: hidden;
  height: 600px;

  .log-container {
    margin-bottom: 1rem;
    max-height: 100%;
  }
}

.sensors-component-container {
  grid-area: sensors;
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.component-header-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background-color: #45a049;
  }

  &-danger {
    background-color: #f44336;

    &:hover {
      background-color: #d32f2f;
    }
  }
}

@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: 1fr;
  }

  .map-component-container,
  .table-component-container,
  .log-component-container {
    grid-column: 1 / -1;
  }

  .map-component-container {
    grid-row: 1;
  }

  .table-component-container {
    grid-row: 2;
  }

  .log-component-container {
    grid-row: 3;
  }
}
</style>