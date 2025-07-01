const fs = require('fs');
const originalData = JSON.parse(fs.readFileSync('sensor_locations.json', 'utf8'));

const HEX_LENGTH = 16;
const SENSOR_LIMIT = 500;
const hexSet = new Set();

function generateHexName(index, length) {
    return Array.from({length: length}, (_, i) => {
        const seed = (index + i) * 0.12345 + Math.random();
        return Math.floor(seed * 16 % 16).toString(length);
    }).join('');
}

function generateUniqueIP(index) {
    const subnet = Math.floor(index / 255) + 1;
    const host = (index % 255) + 1;
    return `192.168.${subnet}.${host.toString().padStart(3, '0')}`;
}

const transformedSensors = originalData.slice(0, SENSOR_LIMIT).map((sensor, index) => {
    let hex;
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    do {
        hex = generateHexName(index, HEX_LENGTH);
        attempts++;
    } while (hexSet.has(hex));
    hexSet.add(hex);

    if (maxAttempts < attempts) return console.log(`Cannot create hex name for sensor #${id}`);

    return {
        sensor_id: `SENSOR${(index + 1).toString().padStart(5, '0')}`,
        name: hex,
        location: {
            type: "Point",
            coordinates: [sensor.lat, sensor.lng]
        },
        ip: generateUniqueIP(index),
        active: true, // Math.random() > 0.1, // activates 90% of the sensors
        last_seen: new Date().toISOString()
    };
});

fs.writeFileSync('transformed_sensors.json', JSON.stringify(transformedSensors, null, 2));

console.log(`Transformation completed: ${transformedSensors.length} sensori`);
console.log('First 5 transformed sensors:');
console.log(JSON.stringify(transformedSensors.slice(0, 5), null, 2));

module.exports = transformedSensors;