from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    ENV: Literal["development", "test", "production"] = "development"
    PORT: int = 3001
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"
    IDEMPOTENCY_TTL: int = 86400
    KAFKA_ENABLED: bool = False
    KAFKA_BROKERS: str = "localhost:9092"
    ENABLE_RX_VERIFICATION: bool = False
    ENABLE_PAYMENT_GATEWAY: bool = False
    RAZORPAY_KEY_ID: str = "rzp_test_placeholder"
    RAZORPAY_KEY_SECRET: str = "rzp_secret_placeholder"
    S3_BUCKET_RX: str = "medrush-rx-vault"
    S3_REGION: str = "ap-south-1"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    model_config = {"env_file": ".env", "extra": "ignore"}

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
