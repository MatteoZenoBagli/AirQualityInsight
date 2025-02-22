const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection with retry logic
const connectWithRetry = async () => {
    const MONGODB_URI =
        process.env.MONGODB_URI || 'mongodb://mongodb:27017/sensor_db';

    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();

const measurementSchema = new mongoose.Schema({
    sensor_id: String,
    timestamp: Date,
    temperature: Number,
    humidity: Number,
    pressure: Number,
    pm25: Number,
    pm10: Number,
    voc: Number,
    co2: Number
});

const Measurement = mongoose.model('Measurement', measurementSchema);

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
        const sensors = await Measurement.distinct('sensor_id');
        res.json(sensors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/latest', async (req, res) => {
    try {
        const latest = await Measurement.findOne().sort({ timestamp: -1 });
        res.json(latest);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
