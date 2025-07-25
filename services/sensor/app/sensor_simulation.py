from config import SENSOR_CONFIG
from kafka import KafkaProducer
from pymongo import MongoClient
import random
import json
import logging
import os
import sys
import time
import threading
from air_quality_sensor import AirQualitySensor

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Kafka configuration
KAFKA_BROKER = os.environ.get('KAFKA_BROKER', 'kafka:9092')
KAFKA_TOPIC = os.environ.get('KAFKA_TOPIC', 'messages')

# MongoDB configuration
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://mongodb:27017/')
DB_NAME = os.environ.get('DB_NAME', 'sensordata')
COLLECTION_NAME = os.environ.get('COLLECTION_NAME', 'sensors')

def create_producer():
    """Creates and returns a Kafka producer"""
    try:
        # Note: We use kafka:9092 here because that's the internal Docker network address
        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_BROKER],
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            acks='all',
            retries=5,
            retry_backoff_ms=1000,
            request_timeout_ms=30000
        )

        logger.info(f"Producer connected to Kafka {KAFKA_BROKER}, topic: {KAFKA_TOPIC}")

        return producer
    except Exception as e:
        logger.error(f"Error creating Kafka producer: {e}")
        raise

def send_message(producer, message):
    """Send a message to a Kafka topic"""

    future = producer.send(KAFKA_TOPIC, value=message)

    try:
        # Block until the message is sent (or timeout)
        record_metadata = future.get(timeout=10)
        logger.info(f"Message sent from {message['sensor_id']} to {record_metadata.topic} partition {record_metadata.partition} offset {record_metadata.offset}")
    except Exception as e:
        logger.error(f"Failed to send message from {message.get('sensor_id', 'unknown')}: {e}")

def get_sensors_from_db(limit=None):
    """Obtain all sensors from database"""
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    sensors_collection = db[COLLECTION_NAME]

    count = sensors_collection.count_documents({})

    if count == 0:
        logger.info("The measurements collection is empty.")
        client.close()
        sys.exit(0)

    logger.info(f"Found {count} sensors.")

    query = sensors_collection.find()

    if limit is not None and limit > 0:
        query = query.limit(limit)

    all_sensors = list(query)
    client.close()
    return all_sensors

def read_from_sensor(sensor, producer):
    """Read from a single sensor in a continuous loop"""
    logger.info(f"Starting air quality sensor simulation for sensor «{sensor.get_name()}»...")

    try:
        while True:
            reading = sensor.generate_reading()
            send_message(producer, reading)
            # Adding random seed to mix measurement times
            time.sleep(sensor.config['sampling_rate'] * random.uniform(0, 5))
    except KeyboardInterrupt:
        logger.info(f"Stopping sensor simulation for «{sensor.get_name()}»...")
    except Exception as e:
        logger.error(f"Error in sensor «{sensor.get_name()}»: {e}")

if __name__ == "__main__":
    try:
        # Create a Kafka producer
        producer = create_producer()

        # Get sensor list from db
        all_sensors = get_sensors_from_db()

        # Create and start a thread for each sensor
        threads = []

        for _sensor in all_sensors:
            sensor = AirQualitySensor(_sensor, SENSOR_CONFIG)

            # Create a thread for this sensor
            thread = threading.Thread(
                target=read_from_sensor,
                args=(sensor, producer),
                name=f"Sensor-{sensor.sensor['sensor_id']}"
            )
            thread.daemon = True  # Thread will close when main program closes
            thread.start()
            threads.append(thread)

            logger.info(f"Started thread for sensor «{sensor.get_name()}»")

        # Wait for all threads to complete (they won't unless interrupted)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Shutting down all sensors...")

    except Exception as e:
        logger.error(f"Application error: {e}")
    finally:
        producer.flush()
        producer.close()
        logger.info("Producer closed")