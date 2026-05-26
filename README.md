# secure-messenger

A secure, privacy-first messaging backend built with FastAPI, AES-256-GCM encryption, JWT authentication, and real-time event streaming. It keeps credentials safe, encrypts stored messages, and isolates message access so only authorized senders and recipients can decrypt content.

---

## Key Features

- **Password security**
  - `bcrypt` hashing for user passwords
  - one-way credential storage
  - no plain-text password persistence

- **JWT authentication**
  - stateless bearer tokens
  - signed `HS256` tokens with expiry
  - FastAPI dependency-based route protection

- **End-to-end encrypted message storage**
  - AES-256-GCM encryption for message payloads
  - per-message random nonce for ciphertext uniqueness
  - tamper-evident integrity protection

- **Secure message isolation**
  - users only see messages where they are sender or recipient
  - decrypted content returned only after authentication

- **Real-time delivery support**
  - Server-Sent Events (`/stream`)
  - per-user asyncio queue subscription model
  - non-blocking fanout to connected clients

- **Clean separation of concerns**
  - modular auth, crypto, routes, models, and streaming
  - SQLAlchemy ORM for safe DB access
  - Pydantic schemas for request/response validation

---

## Architecture & Design

### High-level flow

1. **User registration**
   - `POST /register`
   - password hashed with `bcrypt`
   - user record persisted in SQLite

2. **User login**
   - `POST /login`
   - password verified against stored hash
   - signed JWT returned

3. **Sending a message**
   - `POST /messages`
   - authenticated via JWT
   - message content encrypted with AES-256-GCM
   - ciphertext stored in DB, plain text never persisted

4. **Fetching messages**
   - `GET /messages`
   - authenticated via JWT
   - only sender/recipient messages returned
   - ciphertext decrypted on-demand before response

5. **Real-time updates**
   - `GET /stream`
   - authenticated Server-Sent Events connection
   - connected clients receive published messages instantly

### Core components

- `server/auth.py`
  - password hashing, token creation, token validation, auth dependency
- `server/crypto.py`
  - AES-256-GCM encryption/decryption
  - secret key loaded from `.env`
- `server/models.py`
  - SQLAlchemy `User` and `Message` models
  - request-scoped DB session lifecycle
- `server/schemas.py`
  - Pydantic request/response models
  - separation of API contract from persistence schema
- `server/routes.py`
  - secure REST endpoints for registration, login, messaging
  - message filtering and publish logic
- `server/broadcaster.py`
  - async SSE fan-out with per-user queues

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python |
| API | FastAPI |
| Authentication | `python-jose`, JWT |
| Password hashing | `bcrypt` |
| Encryption | `cryptography` AES-256-GCM |
| DB / ORM | SQLite, SQLAlchemy |
| Validation | Pydantic |
| Real-time | SSE via `sse-starlette` |
| Testing | `pytest`, `pytest-asyncio` |
| ASGI server | `uvicorn` |

---

## Getting Started

### Prerequisites

- Python 3.11+ (recommended)
- Git

### Install

```bash
git clone https://example.com/secure-messenger.git
cd secure-messenger-stage1
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```

### Configure

Create a `.env` file in the repository root:

```env
SECRET_KEY=your-32-byte-secret-key-string
```

> `SECRET_KEY` must be a secure random value and should remain private. It is used to derive the AES-256-GCM key for encrypting and decrypting messages.

### Run locally

```bash
uvicorn server.main:app --reload
```

Open:

- `http://localhost:8000/docs`
- `http://localhost:8000/stream`

### Run tests

```bash
pytest tests/ -v
```

---

## Security Considerations

- `bcrypt` prevents password extraction from the database.
- JWT tokens are signed and expire after 24 hours.
- AES-GCM provides confidentiality and tamper detection for stored messages.
- Random nonces ensure identical messages encrypt differently every time.
- Message queries are filtered to authenticated senders and recipients only.
- SSE subscription state is isolated per user and per client connection.
- Password hashes and ciphertext are never exposed in API responses.

---

## Contribution

Contributions are welcome.

- Fork the repository
- Create a feature branch
- Open a pull request with a clear description
- Keep changes secure and well-tested
- Add or update tests for all new behavior

> Prioritize secure defaults, explicit validation, and minimal trust assumptions.
