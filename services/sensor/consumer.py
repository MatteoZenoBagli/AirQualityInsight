from kafka import KafkaConsumer
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def json_deserializer(data):
    """Deserializes JSON data"""
    return json.loads(data.decode('utf-8'))

def create_consumer(topic_name="test-topic"):
    """Creates and returns a Kafka consumer"""
    try:
        # Note: We use kafka:29092 here because that's the internal Docker network address
        consumer = KafkaConsumer(
            topic_name,
            bootstrap_servers=['kafka:29092'],
            value_deserializer=json_deserializer,
            auto_offset_reset='earliest',
            group_id='my-consumer-group',
            api_version=(0, 10, 1)
        )
        return consumer
    except Exception as e:
        logger.error(f"Error creating Kafka consumer: {e}")
        raise

def consume_messages(consumer):
    """Consumes messages from the Kafka topic"""
    try:
        logger.info("Starting to consume messages...")
        for message in consumer:
            logger.info(f"Received message: {message.value}")
            logger.info(f"From partition: {message.partition}, offset: {message.offset}")
    except KeyboardInterrupt:
        logger.info("Consumer interrupted by user")
    except Exception as e:
        logger.error(f"Error consuming messages: {e}")
    finally:
        # Close the consumer
        consumer.close()
        logger.info("Consumer closed")

if __name__ == "__main__":
    logger.info("Starting Kafka consumer")
    try:
        # Create consumer
        consumer = create_consumer()
        
        # Consume messages
        consume_messages(consumer)
    except Exception as e:
        logger.error(f"Application error: {e}")