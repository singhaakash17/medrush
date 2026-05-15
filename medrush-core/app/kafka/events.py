import json
import logging
import ssl
from app.settings import settings

logger = logging.getLogger(__name__)

_producer = None


def _build_ssl_context() -> ssl.SSLContext | None:
    """
    Build an SSL context for Aiven Kafka.

    Aiven uses one of two auth modes depending on what you configure:
      1. mTLS  — CA cert + client cert + client key  (KAFKA_CA_CERT set)
      2. SASL  — username / password over TLS         (KAFKA_USERNAME set)

    Returns None for a plain local broker (nothing set).
    """
    if not settings.KAFKA_CA_CERT and not settings.KAFKA_USERNAME:
        return None

    ctx = ssl.create_default_context()

    if settings.KAFKA_CA_CERT:
        ctx.load_verify_locations(cafile=settings.KAFKA_CA_CERT)

    # mTLS: load client cert+key when both are provided
    if settings.KAFKA_SSL_CERT and settings.KAFKA_SSL_KEY:
        ctx.load_cert_chain(
            certfile=settings.KAFKA_SSL_CERT,
            keyfile=settings.KAFKA_SSL_KEY,
        )

    return ctx


async def get_producer():
    global _producer
    if _producer is None:
        from aiokafka import AIOKafkaProducer

        ssl_context = _build_ssl_context()
        extra: dict = {}

        if ssl_context and settings.KAFKA_USERNAME:
            # SASL_SSL (username + password, TLS-verified with CA cert)
            extra = {
                "security_protocol": "SASL_SSL",
                "sasl_mechanism": "SCRAM-SHA-256",
                "sasl_plain_username": settings.KAFKA_USERNAME,
                "sasl_plain_password": settings.KAFKA_PASSWORD,
                "ssl_context": ssl_context,
            }
        elif ssl_context:
            # Pure mTLS (Aiven default — client cert + key)
            extra = {
                "security_protocol": "SSL",
                "ssl_context": ssl_context,
            }
        # else: plain local broker, no extra kwargs

        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode(),
            **extra,
        )
        await _producer.start()
        logger.info("[kafka] producer connected to %s", settings.KAFKA_BROKERS)
    return _producer


async def close_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
        logger.info("[kafka] producer closed")


async def publish_event(topic: str, event: dict) -> None:
    if not settings.KAFKA_ENABLED:
        logger.debug("[kafka-stub] %s: %s", topic, event)
        return
    producer = await get_producer()
    await producer.send_and_wait(topic, event)
    logger.debug("[kafka] published to %s", topic)
