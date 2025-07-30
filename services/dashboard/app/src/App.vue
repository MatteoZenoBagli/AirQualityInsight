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
      measurementTypes: [
        'pm25',
        'pm10',
        'voc',
        'co2',
        'temperature',
        'humidity',
        'pressure'
      ],
      thresholds: {
        pm25: { good: 15, moderate: 35, poor: 55 },
        pm10: { good: 25, moderate: 50, poor: 90 },
        voc: { good: 1, moderate: 3, poor: 5 },
        co2: { good: 400, moderate: 800, poor: 1200 },
        temperature: { good: [18, 24], moderate: [15, 28], poor: [10, 35] },
        humidity: { good: [40, 60], moderate: [30, 70], poor: [20, 80] },
        pressure: { good: [1013, 1023], moderate: [1005, 1030], poor: [995, 1040] }
      },
      measurements: {
        pm25: [],
        pm10: [],
        voc: [],
        co2: [],
        temperature: [],
        humidity: [],
        pressure: [],
      },
      infoMeasurementColumns: [
        { key: 'measurement', label: 'Measurement' },
        { key: 'measurement_unit', label: 'Measurement unit', center: true },
        { key: 'min', label: 'Min', center: true },
        { key: 'max', label: 'Max', center: true },
        { key: 'threshold_good', label: 'Good', center: true, html: true },
        { key: 'threshold_moderate', label: 'Moderate', center: true, html: true },
        { key: 'threshold_poor', label: 'Poor', center: true, html: true },
        { key: 'info', label: 'Info', center: true, html: true }
      ],
      measurementColumns: [
        { key: "sensor_id", label: "Sensor ID" },
        { key: "timestamp", label: "Timestamp", center: true },
        { key: "temperature", label: "Temperature (°C)", center: true },
        { key: "humidity", label: "Humidity (%)", center: true },
        { key: "pressure", label: "Pressure (hPa)", center: true },
        { key: "pm25", label: "PM25 (µg/m³)", center: true },
        { key: "pm10", label: "PM10 (µg/m³)", center: true },
        { key: "voc", label: "VOC (ppm)", center: true },
        { key: "co2", label: "CO2 (ppm)", center: true },
      ],
      statsMeasurementColumns: [
        { key: 'measurement', label: 'Measurement' },
        { key: 'mean', label: 'Mean', center: true },
        { key: 'median', label: 'Median', center: true },
        { key: 'min', label: 'Min', center: true },
        { key: 'max', label: 'Max', center: true },
        { key: 'range', label: 'Range', center: true },
        { key: 'quality', label: 'Quality', center: true },
      ],
      sensorColumns: [
        { key: 'id', label: 'Sensor ID' },
        { key: 'lat', label: 'Latitude', center: true },
        { key: 'lng', label: 'Longitude', center: true },
        { key: 'status', label: 'Status', center: true },
      ],
      infoMeasurementData: [],
      measurementData: [],
      statsMeasurementData: {},
      sensorData: [],
      map: null,
      activeSensors: true,
    };
  },
  created() {
    this.connectSocket();

    const explainThreshold = (threshold) => {
      if (Array.isArray(threshold)) return `&ge; ${threshold[0]}, &le; ${threshold[1]}`;
      return `&le; ${threshold}`;
    }
    const getInfoMeasurementData = (measurement, measurement_unit, min, max, threshold, info) => {
      return {
        measurement: measurement,
        measurement_unit: measurement_unit,
        min: min,
        max: max,
        threshold_good: explainThreshold(this.thresholds[threshold].good),
        threshold_moderate: explainThreshold(this.thresholds[threshold].moderate),
        threshold_poor: explainThreshold(this.thresholds[threshold].poor),
        info: this.createInfoIcon(info),
      }
    }
    this.infoMeasurementData = [
      getInfoMeasurementData(
        'Temperature',
        '°C',
        -15,
        35,
        'temperature',
        'Measures ambient air temperature, expressed in degrees Celsius, indicating thermal conditions in the monitored environment.',
      ),
      getInfoMeasurementData(
        'Humidity',
        '%',
        30,
        100,
        'humidity',
        'Records relative humidity levels as a percentage, showing the amount of moisture present in the air compared to maximum capacity at current temperature.',
      ),
      getInfoMeasurementData(
        'Pressure',
        'hPa',
        980,
        1020,
        'pressure',
        'Monitors atmospheric pressure, usually measured in hPa (hectopascals), indicating air pressure changes that can affect weather patterns.',
      ),
      getInfoMeasurementData(
        'PM2.5',
        'µg/m³',
        0,
        50,
        'pm25',
        'Detects fine particulate matter with diameter ≤2.5 micrometers, measuring dangerous airborne particles that can penetrate deep into lungs and bloodstream.',
      ),
      getInfoMeasurementData(
        'PM10',
        'µg/m³',
        0,
        100,
        'pm10',
        'Measures coarse particulate matter with diameter ≤10 micrometers, monitoring larger airborne particles that can cause respiratory irritation.',
      ),
      getInfoMeasurementData(
        'VOC',
        'ppm',
        0,
        3,
        'voc',
        'Volatile Organic Compounds detection, measuring gaseous chemicals from various sources that can affect indoor air quality and human health.',
      ),
      getInfoMeasurementData(
        'CO2',
        'ppm',
        400,
        2000,
        'co2',
        'Carbon dioxide concentration measurement in parts per million (ppm), indicating air quality and ventilation effectiveness in enclosed spaces.',
      ),
    ];

    const getStatsMeasurementData = (measurement) => {
      return {
        measurement: measurement,
        mean: 'N/A',
        median: 'N/A',
        min: 'N/A',
        max: 'N/A',
        range: 'N/A',
        quality: 'N/A',
      };
    }
    this.statsMeasurementData = {
      pm25: getStatsMeasurementData('PM2.5'),
      pm10: getStatsMeasurementData('PM10'),
      voc: getStatsMeasurementData('VOC'),
      co2: getStatsMeasurementData('CO2'),
      temperature: getStatsMeasurementData('Temperature'),
      humidity: getStatsMeasurementData('Humidity'),
      pressure: getStatsMeasurementData('Pressure'),
    }
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

        if (!this.sensorData?.size) return;

        const sensor = this.sensorData.get(message.sensor_id);
        if (!sensor) return;

        const limit = 50
        for (const measurementType of this.measurementTypes) {
          const intensity = this.getIntensity(message[measurementType], measurementType);
          let measurement = this.measurements[measurementType];
          measurement.unshift(intensity);
          if (measurement.length > limit)
            measurement = measurement.slice(0, limit);

          const stats = this.calculateStats(measurement);
          this.statsMeasurementData[measurementType].mean = parseFloat(stats.mean).toFixed(2);
          this.statsMeasurementData[measurementType].median = parseFloat(stats.median).toFixed(2);
          this.statsMeasurementData[measurementType].min = parseFloat(stats.min).toFixed(2);
          this.statsMeasurementData[measurementType].max = parseFloat(stats.max).toFixed(2);
          this.statsMeasurementData[measurementType].range = parseFloat(stats.range).toFixed(2);
          this.statsMeasurementData[measurementType].quality = parseFloat(intensity).toFixed(2);
        }
      });

      this.socket.on("connect", () => {
        this.addInfo("Connected to server");
      });

      this.socket.on("disconnect", () => {
        this.addInfo("Disconnected from server");
      });
    },
    calculateStats(values) {
      const sorted = [...values].sort((a, b) => a - b);
      const mean = values.reduce((a, b) => a + b) / values.length;

      return {
        mean: mean.toFixed(2),
        median: sorted[Math.floor(sorted.length / 2)],
        min: Math.min(...values),
        max: Math.max(...values),
        range: Math.max(...values) - Math.min(...values)
      };
    },
    getIntensity(value, parameter) {
      const threshold = this.thresholds[parameter];

      if (Array.isArray(threshold.good)) {
        const [minGood, maxGood] = threshold.good;
        const [minModerate, maxModerate] = threshold.moderate;
        const [minPoor, maxPoor] = threshold.poor;
        if (minGood <= value && maxGood >= value) return 0.2;
        if (minModerate <= value && maxModerate >= value) return 0.4;
        if (minPoor <= value && maxPoor >= value) return 0.7;
        return 1.0;
      }

      if (value <= threshold.good) return 0.2;
      if (value <= threshold.moderate) return 0.4;
      if (value <= threshold.poor) return 0.7;
      return 1.0;
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
          <TableComponent ref="measurementComponent" :data="infoMeasurementData" :columns="infoMeasurementColumns" />
          <p>
            The table above explains what types of measurements are collected and how they are interpreted.
            It shows the measurement name, the unit of measurement, the sampling interval, and 3 indicators that represent the quality of the obtained measurement:
            the closer the measurement value is to the quality thresholds, the better the value.
            If you hover the cursor over the information label, a brief description of the measure is displayed.
          </p>
        </div>
        <div class="how-to-use-it">
          <h2>How to use it</h2>
          <ul>
            <li>The map displays a collection of sensors indicated by red pushpins.</li>
            <li>Clicking on a sensor will show its name.</li>
            <li>Collected live measurements are displayed in a table below the map, and clicking on a row will navigate
              to the corresponding sensor on the map.</li>
            <li>The map shows collected measurements as a heatmap based on the selected measurement type.</li>
            <li>You can choose from available options in the control panel.</li>
            <li>The control panel opens by clicking the red pushpin in the top right corner of the map.</li>
            <li>Opening the panel provides information such as the number of registered sensors and collected
              measurements.</li>
            <li>You can select the measurement type to display and any layers to overlay.</li>
            <li>Data collection can be stopped and resumed at any time using the buttons in the top right corner of the
              map.</li>
            <li>Collected measurements have a limit between 50 and 1000, after which new recordings replace the oldest
              ones following a FIFO (first in, first out) system.</li>
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
        <TableComponent ref="measurementComponent" :data="statsMeasurementData" :columns="statsMeasurementColumns" />
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
        <TableComponent ref="sensorsComponent" :data="Array.from(sensorData.values())" :columns="sensorColumns"
          @row-click="handleSensorRowClick" />
      </div>
    </div>
  </div>
</template>

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

.stats-component-container,
.log-component-container {
  max-height: 450px;
}

.sensors-component-container {
  grid-area: sensors;
}

tbody tr {
  font-family: monospace;
  font-size: 14px;
}

thead tr {
  background-color: #f0f0f0;
}

tbody tr:nth-child(even) {
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