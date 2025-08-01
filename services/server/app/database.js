const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
  sensor_id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  ip: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  last_seen: {
    type: Date,
    default: Date.now,
  },
});
sensorSchema.index({ location: "2dsphere" });

const Sensor = mongoose.model("Sensor", sensorSchema);

const measurementSchema = new mongoose.Schema({
  sensor_id: String,
  timestamp: Date,
  temperature: Number,
  humidity: Number,
  pressure: Number,
  pm25: Number,
  pm10: Number,
  voc: Number,
  co2: Number,
});
const Measurement = mongoose.model("Measurement", measurementSchema);

const connectWithRetry = async () => {
  const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://mongodb:27017/sensordata";

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      connectTimeoutMS: 10000, // Give up initial connection after 10s
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.log("Retrying in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};

const saveMeasurement = async (measurement) => {
  new Measurement(measurement)
    .save()
    .then((result) => {
      console.log("Measurement saved successfully:", result);
    })
    .catch((err) => {
      console.error("Error saving measurement:", err);
    });
};

module.exports = {
  Sensor,
  Measurement,
  connectWithRetry,
  saveMeasurement,
};
