"""
main.py — Application entry point.

╔══════════════════════════════════════════════════════════════╗
║  THIS FILE IS COMPLETE — you do not need to change anything. ║
╚══════════════════════════════════════════════════════════════╝

This file does three things only:
  1. Creates the FastAPI app
  2. Sets up logging
  3. Registers the router from routes.py

All actual route logic lives in routes.py.
This separation is the standard pattern in production FastAPI projects.

HOW TO RUN:
  uvicorn server.main:app --reload

  Then open: http://localhost:8000/docs
"""

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from .models import create_tables, get_db
from .routes import router
from .auth import require_auth
from .broadcaster import broadcaster


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Secure Messenger — Stage 2",
    description="Authenticated, encrypted REST API with real-time SSE messaging",
    version="2.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/stream")
async def stream(
    db: Session = Depends(get_db),
    username: str = Depends(require_auth),
) -> EventSourceResponse:
    """SSE stream — client holds open connection, receives messages in real time."""
    queue = await broadcaster.subscribe(username)

    async def event_generator():
        try:
            while True:
                message = await queue.get()
                yield {"data": json.dumps(message)}
        finally:
            await broadcaster.unsubscribe(username, queue)

    return EventSourceResponse(event_generator())
