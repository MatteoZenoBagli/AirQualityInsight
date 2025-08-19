function printSection(title) {
  print("=".repeat(50));
  print(title);
  print("=".repeat(50));
}

const reset = true;

// Sensordata database
db = db.getSiblingDB("sensordata");

printSection("Creating collections");

// Sensors collection
db.createCollection("sensors", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sensor_id", "name", "location", "ip"],
      properties: {
        sensor_id: {
          bsonType: "string",
          description: "Unique identifier for the sensor",
        },
        name: {
          bsonType: "string",
          description: "Name of the sensor",
        },
        location: {
          bsonType: "object",
          required: ["type", "coordinates"],
          properties: {
            type: {
              bsonType: "string",
              enum: ["Point"],
              description: "GeoJSON type",
            },
            coordinates: {
              bsonType: "array",
              minItems: 2,
              maxItems: 2,
              items: {
                bsonType: "double",
                description: "[longitude, latitude]",
              },
            },
          },
        },
        ip: {
          bsonType: "string",
          description: "IP address of the sensor",
        },
        active: {
          bsonType: "bool",
          description: "Whether the sensor is currently active",
        },
        last_seen: {
          bsonType: "date",
          description: "Last time the sensor reported data",
        },
      },
    },
  },
});

// Measurements collection
db.createCollection("measurements", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "sensor_id",
        "timestamp",
        "temperature",
        "humidity",
        "pressure",
        "voc",
        "co2",
        "pm25",
        "pm10",
        "no2",
        "o3",
        "so2",
      ],
      properties: {
        sensor_id: {
          bsonType: "string",
          description: "Reference to the sensor",
        },
        timestamp: {
          bsonType: "date",
          description: "Time of measurement",
        },
        temperature: {
          bsonType: ["double", "int"],
          description: "Temperature in Celsius",
        },
        humidity: {
          bsonType: ["double", "int"],
          description: "Relative humidity percentage",
        },
        pressure: {
          bsonType: ["double", "int"],
          description: "Atmospheric pressure in hPa",
        },
        voc: {
          bsonType: ["double", "int"],
          description: "Volatile Organic Compounds in ppb",
        },
        co2: {
          bsonType: ["double", "int"],
          description: "CO2 concentration in ppm",
        },
        pm25: {
          bsonType: ["double", "int"],
          description: "PM2.5 concentration in µg/m³",
        },
        pm10: {
          bsonType: ["double", "int"],
          description: "PM10 concentration in µg/m³",
        },
        no2: {
          bsonType: ["double", "int"],
          description: "NO2 concentration in µg/m³",
        },
        o3: {
          bsonType: ["double", "int"],
          description: "O3 concentration in µg/m³",
        },
        so2: {
          bsonType: ["double", "int"],
          description: "SO2 concentration in µg/m³",
        },
      },
    },
  },
});

function generateIPAddresses(i) {
  return [
    192, // Math.floor(i / (256**3)) % 256;
    168, // Math.floor(i / (256**2)) % 256;
    Math.floor(i / 256) % 256,
    i % 256,
  ].join('.');
}

function toSensorId(n, digits = 5) {
  return "SENSOR" + n.toString().padStart(digits, "0");
}

function randomHex(length = 16) {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
const fs = require('fs');

if (reset) {
  printSection("Cleaning existing data");
  db.sensors.deleteMany({});
  db.measurements.deleteMany({});

  try {
    print("Loading sensor data...");
    const data = JSON.parse(fs.readFileSync("/docker-entrypoint-initdb.d/sensor_locations.json", "utf8"));
    const sensors = data.elements;
    print(`Found ${sensors.length} sensors in JSON`);

    for (let i = 1; i <= sensors.length; i++) {
      const { lon, lat } = sensors[i];
      const entry = {
        sensor_id: toSensorId(i),
        name: randomHex(),
        location: {
          type: "Point",
          coordinates: [lon, lat],
        },
        ip: generateIPAddresses(i),
        active: true,
      };
      console.log(entry)
      db.sensors.insertOne(entry);
    }
    print(`Inserted ${sensors.length} sensors`);
  } catch (error) {
    print(`Error loading sensors: ${error.message}`);
  }
}

printSection("Creating indexes");

// Indexes
db.sensors.createIndex({ sensor_id: 1 }, { unique: true });
db.sensors.createIndex({ location: "2dsphere" });
db.measurements.createIndex({ sensor_id: 1, timestamp: -1 });
db.measurements.createIndex({ timestamp: -1 });

printSection("Initialization complete");
