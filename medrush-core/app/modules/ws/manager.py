"""
WebSocket connection manager.
Rooms:  order:{order_id}        — customer + pharmacy + rider tracking
        pharmacy:{pharmacy_id}  — incoming order notifications for pharmacy dashboard
        rider:{rider_id}        — new assignment notifications
"""
import json
import logging
from collections import defaultdict
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # room → set of websockets
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, ws: WebSocket, room: str) -> None:
        await ws.accept()
        self._rooms[room].add(ws)
        logger.debug("WS connected room=%s total=%d", room, len(self._rooms[room]))

    def disconnect(self, ws: WebSocket, room: str) -> None:
        self._rooms[room].discard(ws)
        if not self._rooms[room]:
            del self._rooms[room]

    async def broadcast(self, room: str, payload: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._rooms.get(room, [])):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._rooms[room].discard(ws)

    async def send_to_room(self, room: str, event_type: str, data: dict) -> None:
        await self.broadcast(room, {"type": event_type, "data": data})


manager = ConnectionManager()
