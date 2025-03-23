from kafka import KafkaProducer
import json
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def json_serializer(data):
    """Serializes data to JSON format"""
    return json.dumps(data).encode('utf-8')

def create_producer():
    """Creates and returns a Kafka producer"""
    try:
        # Note: We use kafka:29092 here because that's the internal Docker network address
        producer = KafkaProducer(
            bootstrap_servers=['kafka:29092'],
            value_serializer=json_serializer,
            api_version=(0, 10, 1)
        )
        return producer
    except Exception as e:
        logger.error(f"Error creating Kafka producer: {e}")
        raise

def produce_messages(producer, topic_name="test-topic"):
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

if __name__ == "__main__":
    logger.info("Starting Kafka producer")
    # Wait a bit for Kafka to be ready
    time.sleep(15)

    try:
        # Create producer
        producer = create_producer()

        # Produce messages
        produce_messages(producer)
    except Exception as e:
        logger.error(f"Application error: {e}")