// server.js
const {
  connectWithRetry,
  Sensor,
  Measurement,
  saveMeasurement,
} = require("./database.js");
const { Kafka } = require("kafkajs");
const socketIo = require("socket.io");
const http = require("http");

const cors = require("cors");
const express = require("express");

const app = express();
const server = http.createServer(app);

const corsOrigin = "*"; // process.env.CORS_ORIGIN || 'http://localhost:5173';

const io = socketIo(server, { cors: { origin: corsOrigin } });

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

const port = process.env.PORT || 3000;

const kafka_broker = process.env.KAFKA_BROKER || "kafka:9092";
const kafka_topic = process.env.KAFKA_TOPIC || "measurements";

const kafka = new Kafka({
  clientId: "node-consumer",
  brokers: [kafka_broker],
});

const consumer = kafka.consumer({
  groupId: "message-consumer-group",
  sessionTimeout: 45000,
  heartbeatInterval: 15000,
});

// WoT Gateway state
let registeredSensors = new Map();
let latestMeasurements = new Map();

// WebSocket connections handler
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.emit("wot-directory", Array.from(registeredSensors.values()));

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // Next middleware
});

// WoT Gateway functions
function createThingDescription(sensor) {
  const baseUrl = `http://localhost:${port}/wot/things/${sensor.sensor_id}`;

  /** @see https://www.w3.org/TR/wot-thing-description11/#introduction-td */
  return {
    "@context": [
      "https://www.w3.org/2022/wot/td/v1.1",
      {
        saref: "https://saref.etsi.org/core/",
      },
    ],
    "@type": ["Thing", "saref:Sensor"],
    id: `urn:sensor:air-quality:${sensor.sensor_id}`,
    title: sensor.name || `Air Quality Sensor ${sensor.sensor_id}`,
    description: `Air Quality Sensor monitoring environmental parameters at ${sensor.location?.coordinates || 'Unknown location'}`,
    base: baseUrl,
    securityDefinitions: {
      nosec_sc: { scheme: "nosec" },
    },
    security: ["nosec_sc"],
    /** @see https://www.w3.org/TR/wot-thing-description11/#property-serialization-json */
    properties: {
      temperature: {
        type: "number",
        title: "Temperature",
        description: "Ambient temperature in Celsius",
        unit: "°C",
        minimum: -15,
        maximum: 35,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/temperature`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      humidity: {
        type: "number",
        title: "Humidity",
        description: "Relative humidity percentage",
        unit: "%",
        minimum: 0,
        maximum: 100,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/humidity`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      pressure: {
        type: "number",
        title: "Atmospheric Pressure",
        description: "Atmospheric pressure in hectopascals",
        unit: "hPa",
        minimum: 980,
        maximum: 1020,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/pressure`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      voc: {
        type: "number",
        title: "VOC",
        description: "Volatile Organic Compounds concentration",
        unit: "ppm",
        minimum: 0,
        maximum: 3,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/voc`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      co2: {
        type: "number",
        title: "CO2",
        description: "Carbon dioxide concentration",
        unit: "ppm",
        minimum: 400,
        maximum: 2000,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/co2`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      pm25: {
        type: "number",
        title: "PM2.5",
        description: "Fine particulate matter (≤2.5μm)",
        unit: "μg/m³",
        minimum: 0,
        maximum: 150,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/pm25`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      pm10: {
        type: "number",
        title: "PM10",
        description: "Coarse particulate matter (≤10μm)",
        unit: "μg/m³",
        minimum: 0,
        maximum: 300,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/pm10`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      no2: {
        type: "number",
        title: "NO2",
        description: "Nitrogen dioxide concentration",
        unit: "μg/m³",
        minimum: 0,
        maximum: 200,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/no2`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      o3: {
        type: "number",
        title: "O3",
        description: "Ozone concentration",
        unit: "μg/m³",
        minimum: 0,
        maximum: 200,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/o3`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      so2: {
        type: "number",
        title: "SO2",
        description: "Sulfur dioxide concentration",
        unit: "μg/m³",
        minimum: 0,
        maximum: 300,
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/so2`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      status: {
        type: "string",
        title: "Status",
        description: "Current sensor status",
        enum: ["active", "inactive"],
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/status`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
      location: {
        type: "object",
        title: "Location",
        description: "Sensor geographical location",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
        },
        readOnly: true,
        observable: false,
        forms: [
          {
            href: `${baseUrl}/properties/location`,
            contentType: "application/json",
            op: ["readproperty"],
          },
        ],
      },
    },
    /** @see https://www.w3.org/TR/wot-thing-description11/#action-serialization-json */
    actions: {
      getLatestMeasurement: {
        title: "Get Latest Measurement",
        description: "Get the latest complete measurement from this sensor",
        forms: [
          {
            href: `${baseUrl}/actions/getLatestMeasurement`,
            contentType: "application/json",
            op: ["invokeaction"],
          },
        ],
      },
    },
  };
}

async function initializeWoTGateway() {
  try {
    const sensors = await Sensor.find({});
    console.log(`Loading ${sensors.length} sensors for WoT Gateway...`);

    for (const sensor of sensors) {
      const thingDescription = createThingDescription(sensor);

      registeredSensors.set(sensor.sensor_id, {
        id: sensor.sensor_id,
        sensor: sensor,
        thingDescription: thingDescription,
        status: "active",
        lastContact: new Date(),
      });
    }

    console.log(
      `WoT Gateway initialized with ${registeredSensors.size} Things`
    );

    io.emit("wot-directory", Array.from(registeredSensors.values()));
  } catch (error) {
    console.error("Error initializing WoT Gateway:", error);
  }
}

// Get all Things (WoT Directory)
app.get("/wot/things", (req, res) => {
  const directory = Array.from(registeredSensors.values()).map((thing) => ({
    id: thing.id,
    title: thing.thingDescription.title,
    description: thing.thingDescription.description,
    base: thing.thingDescription.base,
    status: thing.status,
    lastContact: thing.lastContact,
    properties: Object.keys(thing.thingDescription.properties),
    actions: Object.keys(thing.thingDescription.actions),
  }));

  res.json(directory);
});

app.get("/wot/things/:sensorId", (req, res) => {
  const thing = registeredSensors.get(req.params.sensorId);
  if (!thing) return res.status(404).json({ error: "Thing not found" });

  res.json(thing.thingDescription);
});

app.get("/wot/things/:sensorId/properties/:propertyName", (req, res) => {
  const { sensorId, propertyName } = req.params;
  const thing = registeredSensors.get(sensorId);

  if (!thing) return res.status(404).json({ error: "Thing not found" });

  const measurement = latestMeasurements.get(sensorId);
  if (!measurement)
    return res.status(404).json({ error: "No measurements available" });

  let value = measurement[propertyName];

  if ("location" === propertyName) {
    value = null;

    if (thing.sensor.location && thing.sensor.location.coordinates)
      value = {
        latitude: thing.sensor.location.coordinates[0],
        longitude: thing.sensor.location.coordinates[1],
      };
  }

  if ("status" === propertyName) value = thing.status;

  if (value === undefined)
    return res.status(404).json({ error: "Property not found" });

  res.json({ value });
});

app.get("/wot/things/:sensorId/properties", (req, res) => {
  const sensorId = req.params.sensorId;
  const thing = registeredSensors.get(sensorId);

  if (!thing) return res.status(404).json({ error: "Thing not found" });

  const measurement = latestMeasurements.get(sensorId);
  if (!measurement)
    return res.status(404).json({ error: "No measurements available" });

  const properties = {
    temperature: { value: measurement.temperature },
    humidity: { value: measurement.humidity },
    pressure: { value: measurement.pressure },
    voc: { value: measurement.voc },
    co2: { value: measurement.co2 },
    pm25: { value: measurement.pm25 },
    pm10: { value: measurement.pm10 },
    no2: { value: measurement.no2 },
    o3: { value: measurement.o3 },
    so2: { value: measurement.so2 },
    status: { value: thing.status },
  };

  if (thing.sensor.location && thing.sensor.location.coordinates)
    properties.location = {
      value: {
        latitude: thing.sensor.location.coordinates[0],
        longitude: thing.sensor.location.coordinates[1],
      },
    };

  res.json(properties);
});

app.post("/wot/things/:sensorId/actions/:actionName", (req, res) => {
  const { sensorId, actionName } = req.params;
  const thing = registeredSensors.get(sensorId);

  if (!thing) return res.status(404).json({ error: "Thing not found" });

  if ("getLatestMeasurement" === actionName) {
    const measurement = latestMeasurements.get(sensorId);
    if (!measurement)
      return res.status(404).json({ error: "No measurements available" });
    res.json({ result: measurement });
  }

  res.status(404).json({ error: "Action not found" });
});

const runConsumer = async () => {
  try {
    await consumer.connect();
    console.log(`Kafka consumer connected to ${kafka_broker}`);

    const admin = kafka.admin();
    await admin.connect();

    const topics = await admin.listTopics();
    console.log("Available topics:", topics);

    if (!topics.includes(kafka_topic)) {
      console.error(
        `Topic '${kafka_topic}' does not exist. Available topics:`,
        topics
      );
      await admin.disconnect();
      return;
    }

    await admin.disconnect();

    await consumer.subscribe({ topic: kafka_topic, fromBeginning: false });
    console.log(`Subscribed to topic: ${kafka_topic}`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const measurement = JSON.parse(message.value.toString());
          console.log("Received message:", measurement);
          saveMeasurement(measurement);

          latestMeasurements.set(measurement.sensor_id, measurement);

          const thing = registeredSensors.get(measurement.sensor_id);
          if (thing) {
            thing.lastContact = new Date();
            thing.status = "active";
          }

          io.emit("kafka-message", measurement);
        } catch (error) {
          console.error(`Error during message elaboration: ${error.message}`);
        }
      },
    });
  } catch (error) {
    console.error(`Error on Kafka consumer: ${error.message}`);
  }
};

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    wot_things: registeredSensors.size,
    active_measurements: latestMeasurements.size,
  });
});

app.get("/api/measurements", async (req, res) => {
  try {
    const { startDate, endDate, sensorId } = req.query;
    const query = {};

    if (sensorId) query.sensor_id = sensorId;

    if (startDate && endDate)
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };

    const measurements = await Measurement.find(query)
      .sort({ timestamp: 1 })
      .limit(1000);

    res.json(measurements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sensors", async (req, res) => {
  const { sensorId } = req.query;
  const query = {};

  if (sensorId) query.sensor_id = sensorId;

  try {
    connectWithRetry();
    const sensors = await Sensor.find(query);
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/latest", async (req, res) => {
  try {
    connectWithRetry();
    const latest = await Measurement.findOne().sort({ timestamp: -1 });
    res.json(latest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(port, async () => {
  console.log(`Server with WoT Gateway running on http://localhost:${port}`);
  await connectWithRetry();
  await initializeWoTGateway();
  runConsumer().catch((error) => {
    console.error(`Impossible to start Kafka consumer: ${error.message}`);
  });
});
