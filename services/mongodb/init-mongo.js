// Funzione helper
function printSection(title) {
    print('='.repeat(50));
    print(title);
    print('='.repeat(50));
}

const reset = true;

// Sensordata database
db = db.getSiblingDB('sensordata');

printSection('Creating collections');

// Sensors collection
db.createCollection("sensors", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["sensor_id", "name", "location", "ip"],
         properties: {
            sensor_id: {
               bsonType: "string",
               description: "Unique identifier for the sensor"
            },
            name: {
               bsonType: "string",
               description: "Name of the sensor"
            },
            location: {
               bsonType: "object",
               required: ["type", "coordinates"],
               properties: {
                  type: {
                     bsonType: "string",
                     enum: ["Point"],
                     description: "GeoJSON type"
                  },
                  coordinates: {
                     bsonType: "array",
                     minItems: 2,
                     maxItems: 2,
                     items: {
                        bsonType: "double",
                        description: "[longitude, latitude]"
                     }
                  }
               }
            },
            ip: {
               bsonType: "string",
               description: "IP address of the sensor"
            },
            active: {
               bsonType: "bool",
               description: "Whether the sensor is currently active"
            },
            last_seen: {
               bsonType: "date",
               description: "Last time the sensor reported data"
            }
         }
      }
   }
});

// Measurements collection
db.createCollection("measurements", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["sensor_id", "timestamp", "temperature", "humidity", "pressure", "pm25", "pm10", "voc", "co2"],
         properties: {
            sensor_id: {
               bsonType: "string",
               description: "Reference to the sensor"
            },
            timestamp: {
               bsonType: "date",
               description: "Time of measurement"
            },
            temperature: {
               bsonType: "double",
               description: "Temperature in Celsius"
            },
            humidity: {
               bsonType: "double",
               description: "Relative humidity percentage"
            },
            pressure: {
               bsonType: "double",
               description: "Atmospheric pressure in hPa"
            },
            pm25: {
               bsonType: "double",
               description: "PM2.5 concentration in µg/m³"
            },
            pm10: {
               bsonType: "double",
               description: "PM10 concentration in µg/m³"
            },
            voc: {
               bsonType: "double",
               description: "Volatile Organic Compounds in ppb"
            },
            co2: {
               bsonType: "double",
               description: "CO2 concentration in ppm"
            }
         }
      }
   }
});

if (reset) {
   printSection('Cleaning existing data');
   db.sensors.deleteMany({});
   db.measurements.deleteMany({});

   try {
      print('Loading sensor data...');
      const sensors = JSON.parse(fs.readFileSync('sensor_locations.json', 'utf8'));
      print(`Found ${sensors.length} sensors in JSON`);

       db.sensors.insertMany(sensors);
       print(`Inserted ${sensors.length} sensors`);
   } catch (error) {
       print(`Error loading sensors: ${error.message}`);
   }
}

printSection('Creating indexes');

// Indexes
db.sensors.createIndex({ "sensor_id": 1 }, { unique: true });
db.sensors.createIndex({ "location": "2dsphere" });
db.measurements.createIndex({ "sensor_id": 1, "timestamp": -1 });
db.measurements.createIndex({ "timestamp": -1 });

printSection('Initialization complete');