from config import SENSOR_CONFIG
from datetime import datetime
from kafka import KafkaProducer
from pymongo import MongoClient
import json
import logging
import numpy as np
import os
import random
import sys
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

kafka_broker = os.environ.get('KAFKA_BROKER', 'kafka:9092')
kafka_topic = os.environ.get('KAFKA_TOPIC', 'messages')

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
            'sensor_id': self.sensor['sensor_id'],
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
        logger.info(f"Starting air quality sensor simulation for sensor «{self.sensor['name']}»...")

        try:
            while True:
                reading = self.generate_reading()
                # TODO Insert into db
                send_message(producer, reading)
                time.sleep(self.config['sampling_rate'])
        except KeyboardInterrupt:
            logger.error("\nStopping sensor simulation...")

def create_producer():
    """Creates and returns a Kafka producer"""
    try:
        # Note: We use kafka:9092 here because that's the internal Docker network address
        producer = KafkaProducer(
            bootstrap_servers=[kafka_broker],
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            acks='all',
            retries=5,
            retry_backoff_ms=1000,
            request_timeout_ms=30000
        )

        logger.info(f"Producer connected to Kafka {kafka_broker}, topic: {kafka_topic}")

        return producer
    except Exception as e:
        logger.error(f"Error creating Kafka producer: {e}")
        raise

def send_message(producer, message):
    """Send a message to a Kafka topic"""

    future = producer.send(kafka_topic, value=message)

    try:
        # Block until the message is sent (or timeout)
        record_metadata = future.get(timeout=10)
        logger.info(f"Message sent to {record_metadata.topic} partition {record_metadata.partition} offset {record_metadata.offset}")
    except Exception as e:
        logger.error(f"Failed to send message: {e}")

def get_sensors_from_db():
    """ Obtain all sensors from database """
    client = MongoClient('mongodb://mongodb:27017/')
    db = client['sensordata']
    sensors_collection = db['sensors']

    count = sensors_collection.count_documents({})

    if count == 0:
        logger.info("The measurements collection is empty.")
        client.close()
        sys.exit(0)

    all_sensors = list(sensors_collection.find().limit(5))

    client.close()

    return all_sensors

if __name__ == "__main__":
    try:
        # Create a Kafka producer
        producer = create_producer()

        # Get sensor list from db
        all_sensors = get_sensors_from_db()

        # TODO Make measurement for each sensor as container
        for _sensor in all_sensors:
            sensor = AirQualitySensor(_sensor, SENSOR_CONFIG)
            sensor.run()
    except Exception as e:
        logger.error(f"Application error: {e}")
    finally:
        producer.flush()
        producer.close()
        logger.info("Producer closed")
