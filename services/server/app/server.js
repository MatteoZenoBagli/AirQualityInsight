const {
    connectWithRetry,
    Sensor,
    Measurement,
    saveMeasurement
} = require('./database.js');
const { Kafka } = require('kafkajs');
const socketIo = require('socket.io');
const http = require('http');

const cors = require('cors');
const express = require('express');

const app = express();
const server = http.createServer(app);

const corsOrigin = "*"; // process.env.CORS_ORIGIN || 'http://localhost:5173';

const io = socketIo(server, { cors: { origin: corsOrigin } });

app.use(
    cors({
        origin: corsOrigin,
        credentials: true
    })
);

const port = process.env.PORT || 3000;

const kafka_broker = process.env.KAFKA_BROKER || 'kafka:9092';
const kafka_topic = process.env.KAFKA_TOPIC || 'messages';

const kafka = new Kafka({
    clientId: 'node-consumer',
    brokers: [kafka_broker]
});

const consumer = kafka.consumer({
    groupId: 'message-consumer-group',
    sessionTimeout: 45000,
    heartbeatInterval: 15000
});

// WebSocket connections handler
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next(); // Next middleware
});

const runConsumer = async () => {
    try {
        await consumer.connect();
        console.log(`Kafka consumer connected to ${kafka_broker}`);

        await consumer.subscribe({ topic: kafka_topic, fromBeginning: false });
        console.log(`Subscribed to topic: ${kafka_topic}`);

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const measurement = JSON.parse(message.value.toString());
                    console.log('Received message:', measurement);
                    saveMeasurement(measurement);

                    // Emit message to all connected clients
                    io.emit('kafka-message', measurement);
                } catch (error) {
                    console.error(
                        `Error during message elaboration: ${error.message}`
                    );
                }
            }
        });
    } catch (error) {
        console.error(`Error on Kafka consumer: ${error.message}`);
    }
};

server.listen(port, () => {
    console.log(`Server in execution on http://localhost:${port}`);
    runConsumer().catch((error) => {
        console.error(`Impossible to start Kafka consumer: ${error.message}`);
    });
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
