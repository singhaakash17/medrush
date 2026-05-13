"""
Notification service — push via Expo Push API + delivery logging.
Uses the Expo Push API (https://docs.expo.dev/push-notifications/sending-notifications/)
which works for both iOS (APNs) and Android (FCM) through a single endpoint.
"""
import logging
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notification.repository import (
    list_by_recipient,
    upsert_device_token,
    get_active_tokens_for_user,
    log_delivery,
)
from app.modules.notification.schemas import DeliveryLogOut, RegisterDeviceTokenIn, DeviceTokenOut

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Human-readable status messages for order status changes
STATUS_MESSAGES: dict[str, tuple[str, str]] = {
    "confirmed":  ("Order Confirmed ✅",   "Your order has been confirmed and is being packed."),
    "packed":     ("Order Ready 📦",        "Your order is packed and a rider is on the way."),
    "dispatched": ("Rider Picked Up 🛵",    "Your order is out for delivery! Track it live."),
    "delivered":  ("Order Delivered 🎉",    "Your order has been delivered. Enjoy your medicines!"),
    "cancelled":  ("Order Cancelled ❌",    "Your order has been cancelled."),
}


async def get_user_notifications(session: AsyncSession, principal_id: str) -> list[DeliveryLogOut]:
    return await list_by_recipient(session, principal_id)


async def register_device_token(
    session: AsyncSession,
    principal_id: str,
    payload: RegisterDeviceTokenIn,
) -> DeviceTokenOut:
    device = await upsert_device_token(
        session,
        principal_id=principal_id,
        token=payload.token,
        platform=payload.platform,
    )
    return DeviceTokenOut.model_validate(device)


async def send_order_status_push(
    session: AsyncSession,
    principal_id: str,
    order_id: str,
    order_short_code: str,
    new_status: str,
) -> None:
    """
    Fire-and-forget push notification when an order status changes.
    Fetches active Expo push tokens for the user and sends via Expo Push API.
    Logs the delivery result (success/failure) to delivery_log.
    """
    title, body_template = STATUS_MESSAGES.get(new_status, ("Order Update", f"Your order is now {new_status}."))
    body = body_template

    tokens = await get_active_tokens_for_user(session, principal_id)
    if not tokens:
        logger.debug("No active push tokens for principal %s — skipping push", principal_id)
        return

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": {"order_id": order_id, "short_code": order_short_code, "status": new_status},
            "sound": "default",
            "priority": "high",
        }
        for token in tokens
    ]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
            response.raise_for_status()
            result = response.json()

        # Log each ticket
        tickets = result.get("data", [])
        for i, ticket in enumerate(tickets):
            token = tokens[i] if i < len(tokens) else "unknown"
            status = "sent" if ticket.get("status") == "ok" else "failed"
            provider_id = ticket.get("id")
            await log_delivery(
                session,
                principal_id=principal_id,
                channel="push",
                destination=token,
                body=body,
                status=status,
                provider="expo",
                provider_message_id=provider_id,
            )

        logger.info("Push sent for order %s status=%s to %d devices", order_id, new_status, len(tokens))

    except Exception as exc:
        logger.warning("Failed to send push for order %s: %s", order_id, exc)
        # Log failure without re-raising — push is best-effort
        for token in tokens:
            try:
                await log_delivery(
                    session,
                    principal_id=principal_id,
                    channel="push",
                    destination=token,
                    body=body,
                    status="failed",
                    provider="expo",
                )
            except Exception:
                pass
