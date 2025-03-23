from config import SENSOR_CONFIG
from datetime import datetime
from pymongo import MongoClient
import numpy as np
import random
import sys
from kafka import KafkaProducer
import json
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AirQualitySensor:
    def __init__(self, sensor, config):
        self.sensor = sensor
        self.config = config

    def generate_reading(self):
        """Generate a realistic sensor reading with some correlation between values"""

        # Base temperature affects humidity
        temp = random.uniform(*self.config['temperature_range'])

        # Higher temperature generally means lower humidity
        humidity_max = self.config['humidity_range'][1] - (temp - self.config['temperature_range'][0])
        humidity = random.uniform(self.config['humidity_range'][0], humidity_max)

        # Pressure varies slowly over time
        if not hasattr(self, 'last_pressure'):
            self.last_pressure = np.mean(self.config['pressure_range'])

        pressure = self.last_pressure + random.uniform(-1, 1)
        pressure = np.clip(pressure, *self.config['pressure_range'])
        self.last_pressure = pressure

        # PM2.5 and PM10 are correlated
        pm25 = random.uniform(*self.config['pm25_range'])
        pm10 = pm25 + random.uniform(0, self.config['pm10_range'][1] - pm25)

        # VOC levels
        voc = random.uniform(*self.config['voc_range'])

        # CO2 levels - tends to build up and then decrease
        if not hasattr(self, 'last_co2'):
            self.last_co2 = 400  # Starting with typical outdoor CO2 level

        # CO2 changes more dramatically in enclosed spaces
        co2_change = random.uniform(-50, 100)
        new_co2 = self.last_co2 + co2_change
        new_co2 = np.clip(new_co2, *self.config['co2_range'])
        self.last_co2 = new_co2

        return {
            'timestamp': datetime.now().isoformat(),
            'temperature': round(temp, 2),
            'humidity': round(humidity, 2),
            'pressure': round(pressure, 2),
            'pm25': round(pm25, 2),
            'pm10': round(pm10, 2),
            'voc': round(voc, 3),
            'co2': round(new_co2, 1)
        }

    def run(self):
        print(f"Starting air quality sensor simulation for sensor «{self.sensor['name']}»...")

        try:
            while True:
                reading = self.generate_reading()
                print(f"Recorded: Temp: {reading['temperature']}°C, "
                      f"Humidity: {reading['humidity']}%, "
                      f"CO2: {reading['co2']} ppm, "
                      f"PM2.5: {reading['pm25']} µg/m³")
                time.sleep(self.config['sampling_rate'])
        except KeyboardInterrupt:
            print("\nStopping sensor simulation...")

def json_serializer(data):
    """Serialize data to JSON format"""
    return json.dumps(data).encode('utf-8')

def create_producer():
    """Creates and returns a Kafka producer"""
    try:
        # Note: We use kafka:29092 here because that's the internal Docker network address
        producer = KafkaProducer(
            bootstrap_servers=['kafka:29092'],
            value_serializer=json_serializer,
            acks='all',               # Wait for all replicas to acknowledge
            retries=3,                # Number of retries if produce request fails
            batch_size=16384,         # Batch size in bytes
            linger_ms=10,             # Wait time to batch messages
            request_timeout_ms=30000  # Request timeout
        )
        return producer
    except Exception as e:
        logger.error(f"Error creating Kafka producer: {e}")
        raise

def send_message(producer, topic, message, key=None):
    """Send a message to a Kafka topic"""
    # Send the message to the specified topic
    # If key is provided, it will be used for partitioning
    future = producer.send(topic, value=message, key=key.encode() if key else None)

    try:
        # Block until the message is sent (or timeout)
        record_metadata = future.get(timeout=10)
        print(f"Message sent to {record_metadata.topic} partition {record_metadata.partition} offset {record_metadata.offset}")
    except Exception as e:
        print(f"Failed to send message: {e}")

def produce_messages(producer, topic_name="measurements"):
    """Produces sample messages to the specified Kafka topic"""
    try:
        for i in range(1, 11):
            data = {
                "message_id": i,
                "content": f"This is message {i}",
                "timestamp": time.time()
            }

            # Send data to Kafka
            future = producer.send(topic_name, value=data)

            # Wait for the message to be delivered
            record_metadata = future.get(timeout=10)

            logger.info(f"Message {i} sent to {record_metadata.topic} at partition {record_metadata.partition}, offset {record_metadata.offset}")

            # Sleep for a second
            time.sleep(1)
    except Exception as e:
        logger.error(f"Error producing messages: {e}")
    finally:
        # Flush and close the producer
        producer.flush()
        producer.close()
        logger.info("Producer closed")

def get_sensors_from_db():
    """ Obtain all sensors from database """
    client = MongoClient('mongodb://mongodb:27017/')
    db = client['sensordata']
    sensors_collection = db['sensors']

    count = sensors_collection.count_documents({})

    if count == 0:
        print("The measurements collection is empty.")
        client.close()
        sys.exit(0)

    all_sensors = list(sensors_collection.find().limit(5))

    client.close()

    return all_sensors

if __name__ == "__main__":

    try:
        # Create a Kafka producer
        producer = create_producer()
        produce_messages(producer)
    except Exception as e:
        logger.error(f"Application error: {e}")

    # all_sensors = get_sensors_from_db()
    # for _sensor in all_sensors:
    #     sensor = AirQualitySensor(_sensor, SENSOR_CONFIG)
    #     sensor.run()