import logging
from app.settings import settings

logger = logging.getLogger(__name__)

_producer = None


async def get_producer():
    global _producer
    if _producer is None:
        from aiokafka import AIOKafkaProducer
        import json
        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        await _producer.start()
    return _producer


async def close_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None


async def publish_event(topic: str, event: dict) -> None:
    if not settings.KAFKA_ENABLED:
        logger.debug("[kafka-stub] %s: %s", topic, event)
        return
    producer = await get_producer()
    await producer.send_and_wait(topic, event)
