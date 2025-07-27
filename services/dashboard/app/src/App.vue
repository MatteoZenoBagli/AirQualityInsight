<template>
  <div class="app">
    <h1>AirQualityInsight - Dashboard</h1>

    <div class="dashboard">
      <div class="dashboard-component info-component-container">
        <div class="description">
          <h2>Description</h2>
          <p>
            Simulation project of a sensor system to monitor air quality,
            with data sent to a server for real-time analysis and visualization.
          </p>
          <p>
            The system simulates a network of sensors,
            such as Raspberry Pi,
            capable of measuring air quality.
            These measurements will be sent to a server,
            which will analyze them
            and present the data in real-time on a dedicated dashboard.
          </p>
          <p>
            The case study subject is the city of Bologna, the sensors are displaced into his boundaries.
          </p>
          <p class="project-link">
            <i class="fa-brands fa-github"></i>
            <a href="https://github.com/MatteoZenoBagli/AirQualityInsight">GitHub's project page link</a>
          </p>
        </div>
        <div class="measurement-ranges">
          <h2>Measurement ranges</h2>
          <TableComponent ref="measurementComponent" :data="infoMeasurementData" :columns="infoMeasurementColumns"></TableComponent>
        </div>
        <div class="how-to-use-it">
          <h2>How to use it</h2>
          <ul>
            <li>The map displays a collection of sensors indicated by red pushpins.</li>
            <li>Clicking on a sensor will show its name.</li>
            <li>Collected live measurements are displayed in a table below the map, and clicking on a row will navigate to the corresponding sensor on the map.</li>
            <li>The map shows collected measurements as a heatmap based on the selected measurement type.</li>
            <li>You can choose from available options in the control panel.</li>
            <li>The control panel opens by clicking the red pushpin in the top right corner of the map.</li>
            <li>Opening the panel provides information such as the number of registered sensors and collected measurements.</li>
            <li>You can select the measurement type to display and any layers to overlay.</li>
            <li>Data collection can be stopped and resumed at any time using the buttons in the top right corner of the map.</li>
            <li>Collected measurements have a limit between 50 and 1000, after which new recordings replace the oldest ones following a FIFO (first in, first out) system.</li>
          </ul>
        </div>
      </div>

      <div class="dashboard-component map-component-container">
        <div class="component-header">
          <h2>Map</h2>
          <div class="component-header-buttons">
            <button @click="refreshSensors" class="btn">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
            <button @click="handleActiveSensors" :class="['btn', { 'btn-danger': this.activeSensors }]">
              <i :class="['fas', { 'fa-stop': this.activeSensors, 'fa-play': !this.activeSensors }]"></i> {{
                this.activeSensors ? 'Stop' : 'Start' }}
            </button>
          </div>
        </div>
        <MapComponent ref="mapComponent" @marker-click="handleMarkerClick" @sensors-loaded="handleSensorsLoaded"
          @measurements-cleared="handleMeasurementsCleared" />
      </div>

      <div class="dashboard-component measurements-component-container">
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

      <div class="dashboard-component stats-component-container">
        <div class="component-header">
          <h2>Statistics</h2>
        </div>
      </div>

      <div class="dashboard-component log-component-container">
        <div class="component-header">
          <h2>
            System Log
            <i class="fas fa-info-circle" :title="'Last ' + this.$refs.logComponent?.maxEntries + ' entries'"></i>
          </h2>
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
          <h2>Registered sensors: {{ this.sensorData.size }}</h2>
          <div>
            <button @click="refreshSensors" class="btn">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
        <TableComponent ref="sensorsComponent" :data="sensorData.values()" :columns="sensorColumns"
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
      infoMeasurementColumns: [
        { key: 'measurement',       label: 'Measurement' },
        { key: 'min',               label: 'Min',               center: true },
        { key: 'max',               label: 'Max',               center: true },
        { key: 'measurement_unit',  label: 'Measurement unit',  center: true,  },
        { key: 'info',              label: 'Info',              center: true, html: true }
      ],
      infoMeasurementData: [
        {
          measurement: 'Temperature',
          min: -15,
          max: 35,
          measurement_unit: '°C',
          info: this.createInfoIcon('Measures ambient air temperature, expressed in degrees Celsius, indicating thermal conditions in the monitored environment.')
        },
        {
          measurement: 'Humidity',
          min: 30,
          max: 100,
          measurement_unit: '%',
          info: this.createInfoIcon('Records relative humidity levels as a percentage, showing the amount of moisture present in the air compared to maximum capacity at current temperature.')
        },
        {
          measurement: 'Pressure',
          min: 980,
          max: 1020,
          measurement_unit: 'hPa',
          info: this.createInfoIcon('Monitors atmospheric pressure, usually measured in hPa (hectopascals), indicating air pressure changes that can affect weather patterns.')
        },
        {
          measurement: 'PM2.5',
          min: 0,
          max: 50,
          measurement_unit: 'µg/m³',
          info: this.createInfoIcon('Detects fine particulate matter with diameter ≤2.5 micrometers, measuring dangerous airborne particles that can penetrate deep into lungs and bloodstream.')
        },
        {
          measurement: 'PM10',
          min: 0,
          max: 100,
          measurement_unit: 'µg/m³',
          info: this.createInfoIcon('Measures coarse particulate matter with diameter ≤10 micrometers, monitoring larger airborne particles that can cause respiratory irritation.')
        },
        {
          measurement: 'VOC',
          min: 0,
          max: 3,
          measurement_unit: 'ppm',
          info: this.createInfoIcon('Volatile Organic Compounds detection, measuring gaseous chemicals from various sources that can affect indoor air quality and human health.')
        },
        {
          measurement: 'CO2',
          min: 400,
          max: 2000,
          measurement_unit: 'ppm',
          info: this.createInfoIcon('Carbon dioxide concentration measurement in parts per million (ppm), indicating air quality and ventilation effectiveness in enclosed spaces.')
          },
      ],
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
        this.$refs.mapComponent?.registerNewMeasurement(message);

        const formattedData = {
          sensor_id: message.sensor_id,
          timestamp: message.timestamp,
          temperature: parseFloat(message.temperature).toFixed(2),
          humidity: parseFloat(message.humidity).toFixed(2),
          pressure: parseFloat(message.pressure).toFixed(2),
          pm25: parseFloat(message.pm25).toFixed(2),
          pm10: parseFloat(message.pm10).toFixed(2),
          voc: parseFloat(message.voc).toFixed(2),
          co2: parseFloat(message.co2).toFixed(2)
        };

        this.measurementData.unshift(formattedData);
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
      if (!marker) return;
      this.centerMapOnSensor(marker);
      this.addInfo(`Selected sensor from map: ${marker.id}`);
    },
    handleMeasurementRowClick(row) {
      // Center map on the sensor that sent this measurement
      const sensor = this.sensorData.get(row.sensor_id);
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
      this.sensorData = sensors;
      this.addInfo(`Loaded ${sensors.size} sensors`);
    },
    refreshSensors() {
      this.$refs.mapComponent?.refreshSensorData();
      this.addInfo('Refreshed sensors');
    },
    refreshTable() {
      this.addInfo('Refreshed measurements table');
    },
    handleMeasurementsCleared(count) {
      this.addInfo(`Cleared ${count} measurements from map`);
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
      this.$refs.mapComponent?.centerOnLocation(sensor.lat, sensor.lng);
    },
    handleSensorRowClick(row) {
      this.addInfo(`Selected sensor: ${row.id}`);
      this.centerMapOnSensor(row);
    },
    createInfoIcon(title) {
      return `<i class="fas fa-info-circle" title="${title}"></i>`
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
    "info info info"
    "map map map"
    "map map map"
    "measurements measurements measurements"
    "measurements measurements measurements"
    "stats stats log"
    "stats stats log"
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

.info-component-container {
  grid-area: info;
  display: flex;
  flex-direction: column;
  gap: 2rem;

  .description,
  .measurement-ranges,
  .how-to-use-it {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    h2 {
      margin-bottom: 0.5rem;
    }
  }

  .description .project-link {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .measurement-ranges .table-wrapper {
    height: auto;
  }

  .how-to-use-it ul {
    margin-left: 1rem;
  }
}

.map-component-container {
  grid-area: map;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
}

.measurements-component-container {
  grid-area: measurements;
  min-width: 0;
  height: 100%;
}

.stats-component-container {
  grid-area: stats;
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

  .fa-info-circle {
    cursor: pointer;
  }
}

.sensors-component-container {
  grid-area: sensors;
}

.info-component-container tbody tr,
.measurements-component-container tbody tr,
.sensors-component-container tbody tr {
  font-family: monospace;
  font-size: 14px;
}

.info-component-container thead tr,
.measurements-component-container thead tr,
.sensors-component-container thead tr {
  background-color: #f0f0f0;
}

.info-component-container tbody tr:nth-child(even),
.measurements-component-container tbody tr:nth-child(even),
.sensors-component-container tbody tr:nth-child(even) {
  background-color: #fafafa;
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
  .measurements-component-container,
  .log-component-container {
    grid-column: 1 / -1;
  }

  .map-component-container {
    grid-row: 1;
  }

  .measurements-component-container {
    grid-row: 2;
  }

  .log-component-container {
    grid-row: 3;
  }
}
</style>