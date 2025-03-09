const { connectWithRetry, Sensor, Measurement } = require('./database.js');

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function getDependency(dirname) {
    return express.static(path.join(__dirname, '..', dirname));
}

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next(); // Next middleware
});

app.use('/assets', getDependency('assets'));
app.use('/node_modules', getDependency('node_modules'));
app.use('/', getDependency('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server in esecuzione su http://localhost:${port}`);
});

connectWithRetry();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.get('/api/measurements', async (req, res) => {
    try {
        const { startDate, endDate, sensor_id } = req.query;
        const query = {};

        if (sensor_id) query.sensor_id = sensor_id;

        if (startDate && endDate)
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };

        const measurements = await Measurement.find(query)
            .sort({ timestamp: 1 })
            .limit(1000);

        res.json(measurements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sensors', async (req, res) => {
    try {
        connectWithRetry();
        const sensors = await Sensor.find({});
        res.json(sensors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/latest', async (req, res) => {
    try {
        connectWithRetry();
        const latest = await Measurement.findOne().sort({ timestamp: -1 });
        res.json(latest);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
