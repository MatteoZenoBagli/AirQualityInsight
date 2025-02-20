// populate-and-query.js

// Helper functions
function printSection(title) {
    print('\n' + '='.repeat(50));
    print(title);
    print('='.repeat(50) + '\n');
}

function getOSMLink(coordinates) {
    const [long, lat] = coordinates;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${long}&zoom=18`;
}

// Connect to the database
db = db.getSiblingDB('sensordata');

printSection('Cleaning existing data');
db.sensors.deleteMany({});
db.measurements.deleteMany({});

printSection('Inserting sample sensors');
const sensors = [
    {
        sensor_id: 'SENSOR001',
        name: 'Piazza Maggiore Sensor',
        location: {
            type: 'Point',
            coordinates: [11.3426, 44.4939] // Piazza Maggiore, Bologna
        },
        ip: '192.168.1.100',
        active: true,
        last_seen: new Date()
    },
    {
        sensor_id: 'SENSOR002',
        name: 'University Sensor',
        location: {
            type: 'Point',
            coordinates: [11.352, 44.4969] // University of Bologna
        },
        ip: '192.168.1.101',
        active: true,
        last_seen: new Date()
    },
    {
        sensor_id: 'SENSOR003',
        name: 'Central Station Sensor',
        location: {
            type: 'Point',
            coordinates: [11.3419, 44.5066] // Bologna Central Station
        },
        ip: '192.168.1.102',
        active: true,
        last_seen: new Date()
    },
    {
        sensor_id: 'SENSOR004',
        name: 'Two Towers Sensor',
        location: {
            type: 'Point',
            coordinates: [11.3471, 44.4947] // Two Towers
        },
        ip: '192.168.1.103',
        active: true,
        last_seen: new Date()
    },
    {
        sensor_id: 'SENSOR005',
        name: 'Giardini Margherita Sensor',
        location: {
            type: 'Point',
            coordinates: [11.3561, 44.4819] // Giardini Margherita
        },
        ip: '192.168.1.104',
        active: true,
        last_seen: new Date()
    }
];

db.sensors.insertMany(sensors);
print(`Inserted ${sensors.length} sensors`);

printSection('Creating indexes');
db.sensors.createIndex({ location: '2dsphere' });
print('Created geospatial index on location field');

printSection('Generating sample measurements');
let measurements = [];
for (let i = 0; i < 24; i++) {
    measurements.push({
        sensor_id: 'SENSOR001',
        timestamp: new Date(Date.now() - i * 3600000), // Every hour
        temperature: 20 + Math.random() * 5, // 20-25°C
        humidity: 40 + Math.random() * 20, // 40-60%
        pressure: 1010 + Math.random() * 10, // 1010-1020 hPa
        pm25: 5 + Math.random() * 15, // 5-20 µg/m³
        pm10: 10 + Math.random() * 20, // 10-30 µg/m³
        voc: 400 + Math.random() * 200, // 400-600 ppb
        co2: 700 + Math.random() * 300 // 700-1000 ppm
    });

    measurements.push({
        sensor_id: 'SENSOR002',
        timestamp: new Date(Date.now() - i * 3600000),
        temperature: 22 + Math.random() * 6,
        humidity: 45 + Math.random() * 15,
        pressure: 1012 + Math.random() * 8,
        pm25: 8 + Math.random() * 17,
        pm10: 15 + Math.random() * 25,
        voc: 450 + Math.random() * 250,
        co2: 800 + Math.random() * 400
    });
}

db.measurements.insertMany(measurements);
print(`Inserted ${measurements.length} measurements`);

// Queries
printSection('All Sensors');
db.sensors.find().forEach((sensor) => {
    print(`\nSensor: ${sensor.name}`);
    print(`  ID: ${sensor.sensor_id}`);
    print(`  Coordinates: ${sensor.location.coordinates}`);
    print(`  OpenStreetMap: ${getOSMLink(sensor.location.coordinates)}`);
    print(`  IP: ${sensor.ip}`);
    print(`  Active: ${sensor.active}`);
});

printSection('Latest measurements for each sensor');
db.measurements
    .aggregate([
        {
            $sort: { timestamp: -1 }
        },
        {
            $group: {
                _id: '$sensor_id',
                lastMeasurement: { $first: '$$ROOT' }
            }
        }
    ])
    .forEach(printjson);

printSection('Average temperature per sensor (last 6 hours)');
db.measurements
    .aggregate([
        {
            $match: {
                timestamp: { $gte: new Date(Date.now() - 6 * 3600000) }
            }
        },
        {
            $group: {
                _id: '$sensor_id',
                avgTemperature: { $avg: '$temperature' },
                avgHumidity: { $avg: '$humidity' },
                avgCO2: { $avg: '$co2' }
            }
        }
    ])
    .forEach(printjson);

printSection('High CO2 Alerts (>900 ppm) in last hour');
db.measurements
    .find({
        timestamp: { $gte: new Date(Date.now() - 3600000) },
        co2: { $gt: 900 }
    })
    .forEach(printjson);

printSection('Sensor Statistics');
const stats = db.measurements
    .aggregate([
        {
            $group: {
                _id: '$sensor_id',
                measurementCount: { $sum: 1 },
                maxTemp: { $max: '$temperature' },
                minTemp: { $min: '$temperature' },
                maxCO2: { $max: '$co2' },
                maxPM25: { $max: '$pm25' }
            }
        }
    ])
    .toArray();

stats.forEach((stat) => {
    print(`\nSensor: ${stat._id}`);
    print(`  Total Measurements: ${stat.measurementCount}`);
    print(
        `  Temperature Range: ${stat.minTemp.toFixed(
            1
        )}°C - ${stat.maxTemp.toFixed(1)}°C`
    );
    print(`  Max CO2: ${stat.maxCO2.toFixed(1)} ppm`);
    print(`  Max PM2.5: ${stat.maxPM25.toFixed(1)} µg/m³`);
});

// Optional
printSection('Sensors within 1km of Piazza Maggiore');
db.sensors
    .aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [11.3426, 44.4939] // Piazza Maggiore
                },
                distanceField: 'distance',
                maxDistance: 1000, // 1km in meters
                spherical: true
            }
        }
    ])
    .forEach((sensor) => {
        print(`\nSensor: ${sensor.name}`);
        print(`  ID: ${sensor.sensor_id}`);
        print(`  Coordinates: ${sensor.location.coordinates}`);
        print(`  OpenStreetMap: ${getOSMLink(sensor.location.coordinates)}`);
        print(
            `  Distance from Piazza Maggiore: ${sensor.distance.toFixed(
                0
            )} meters`
        );
    });
