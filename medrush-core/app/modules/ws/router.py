from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.modules.ws.manager import manager

router = APIRouter()


@router.websocket("/orders/{order_id}")
async def order_ws(order_id: str, ws: WebSocket) -> None:
    """Customer / pharmacy / rider subscribe to a single order's status stream."""
    room = f"order:{order_id}"
    await manager.connect(ws, room)
    try:
        while True:
            # Keep connection alive; client can send pings
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(ws, room)


@router.websocket("/pharmacy/{pharmacy_id}")
async def pharmacy_ws(pharmacy_id: str, ws: WebSocket) -> None:
    """Pharmacy dashboard listens for new incoming orders."""
    room = f"pharmacy:{pharmacy_id}"
    await manager.connect(ws, room)
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(ws, room)


@router.websocket("/rider/{rider_id}")
async def rider_ws(rider_id: str, ws: WebSocket) -> None:
    """Rider app listens for new assignment notifications."""
    room = f"rider:{rider_id}"
    await manager.connect(ws, room)
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(ws, room)
