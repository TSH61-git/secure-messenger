"""
broadcaster.py — Real-time message fan-out using asyncio queues.

HOW IT WORKS:
  Every client that connects to GET /stream gets a personal asyncio.Queue.
  When a message is sent via POST /messages, publish() copies it into
  every connected client's queue. Each client reads from its own queue
  independently — a slow client never blocks a fast one.

  subscribe()   → register a new client, returns their personal queue
  unsubscribe() → remove the queue when the client disconnects
  publish()     → push a message into every connected client's queue
"""

import asyncio
from typing import Any


class Broadcaster:

    def __init__(self):
        # { username: [queue, queue, ...] }
        # A user can be connected from multiple terminals simultaneously.
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    def subscribe(self, username: str) -> asyncio.Queue:
        """Register a new SSE client. Returns their personal message queue."""
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(username, []).append(queue)
        return queue

    def unsubscribe(self, username: str, queue: asyncio.Queue) -> None:
        """Remove a client's queue when they disconnect."""
        queues = self._subscribers.get(username, [])
        if queue in queues:
            queues.remove(queue)
        if not queues:
            self._subscribers.pop(username, None)

    async def publish(self, message: dict[str, Any]) -> None:
        """Push a message into every connected client's queue."""
        for queues in self._subscribers.values():
            for queue in queues:
                await queue.put(message)


broadcaster = Broadcaster()
