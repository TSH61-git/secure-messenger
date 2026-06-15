# Secure Messenger with Real-Time Smart Emotion AI

An end-to-end encrypted messaging platform integrated with real-time face expression AI to dynamically enrich user interaction. Messages are encrypted at rest using AES-256-GCM, identities are authenticated via signed JWT tokens, and every session is enriched by a live emotion detection engine that suggests contextual emoji responses as you type.

---

## 🚀 Project Overview

Secure Messenger is a full-stack, privacy-first communication platform that combines enterprise-grade security with an immersive, AI-enhanced chat experience.

On the security side, all message payloads are encrypted before they touch the database, passwords are stored as one-way bcrypt hashes, and every protected route is gated behind a stateless JWT bearer token. On the intelligence side, a `face-api.js`-powered emotion engine runs directly in the browser, reads the user's facial expressions through the device camera, and injects contextually appropriate emoji suggestions into the message input — making the conversation feel alive without compromising privacy.

The frontend is built on Angular 19 with Angular Signals for fine-grained reactive state, styled with TailwindCSS, and proxied transparently to a Python FastAPI backend serving both a REST API and a real-time Server-Sent Events (SSE) stream.

---

## 🧠 Key Features

### Smart Face Emotion AI
- Real-time facial expression detection powered by `@vladmandic/face-api` (SSD MobileNet v1 + 68-point landmark + expression models).
- Runs on a **1-second self-scheduling interval** (`setInterval`) managed inside `FaceEmotionService` — efficient and non-blocking.
- Emotion results are exposed through an **Angular Signal** (`suggestedEmoji`), ensuring zero-overhead reactive propagation to the UI without zone.js change detection pressure.
- Confidence/intensity tier mapping: high-confidence detections (score > 0.75) emit a stronger emoji variant (e.g. `😁` vs `😊` for happy, `😢` vs `😔` for sad).
- Supports `happy`, `surprised`, `sad`, and `angry` expression families; neutral/low-confidence results produce no suggestion, keeping the UI clean.
- **Tab-key autocomplete injection**: pressing Tab while a suggestion is active inserts the emoji directly into the message input.
- The camera video element runs as an **invisible background stream** — it is never rendered visibly in the layout, preserving the clean chat interface.

### Enterprise Security
- **AES-256-GCM** encryption for all stored message payloads — per-message random nonces guarantee ciphertext uniqueness; GCM authentication tags provide tamper detection.
- **bcrypt** password hashing — credentials are never stored or returned in plain text.
- **JWT authentication** — signed HS256 tokens with 24-hour expiry; all sensitive routes protected via FastAPI dependency injection.
- **Route guards** — Angular `AuthGuard` blocks chat access until a valid token is present in session state.
- **Message isolation** — database queries are strictly filtered so users only ever receive messages where they are the authenticated sender or recipient.

### Real-Time Communication
- **Server-Sent Events (SSE)** via `sse-starlette`: the `/stream` endpoint fans out new messages to all connected clients in real time using per-user `asyncio` queues.
- **Angular chat service** maintains a persistent `EventSource` connection; incoming `data:` events are parsed and merged into the reactive message feed automatically.
- **Optimistic UI** — sent messages are rendered in the feed immediately on the client while network delivery completes in the background.

### Immersive UI/UX
- Angular 19 standalone components with TailwindCSS utility styling and custom CSS layers.
- Responsive chat layout with distinct visual treatment for sent vs received messages.
- Login and registration forms with inline validation feedback.
- Background camera stream is deliberately hidden from the layout — emotion AI operates silently without visual noise.

---

## 🏗️ Architecture & Tech Stack

### Full-Stack Data Flow

```
Client (Angular 19)              FastAPI Backend                  SQLite DB
──────────────────               ───────────────                  ─────────
[Register / Login]   ──POST──▶  /api/register, /api/login  ──▶  users table
                                  │ bcrypt hash stored                │
                                  │ JWT issued & returned             │
                                  ▼                                   │
[Authenticated state]                                                 │
  JWT stored in memory / session state                                │
                                                                      │
[Send message]       ──POST──▶  /api/messages                        │
                                  │ JWT verified                      │
                                  │ AES-256-GCM encrypt payload       │
                                  │ ciphertext saved           ──▶  messages table
                                  │ event published to SSE queues     │
                                                                      │
[Load history]       ──GET───▶  /api/messages                        │
                                  │ filter sender/recipient    ◀──  messages table
                                  │ decrypt ciphertext on-demand      │
                                  ▼                                   │
[Message feed updated]                                                │

[EventSource /stream] ◀── SSE ── on new message broadcast ──────────┘
  parse data: event
  merge into reactive feed
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Angular 19, TypeScript 5.6 |
| Reactive state | Angular Signals |
| Styling | TailwindCSS 3, Custom CSS |
| Emotion AI | `@vladmandic/face-api` 1.7 |
| Backend API | Python FastAPI 0.111 |
| Authentication | `python-jose` JWT (HS256) |
| Password hashing | `bcrypt` 4.2 |
| Encryption | `cryptography` AES-256-GCM |
| Database / ORM | SQLite, SQLAlchemy 2 |
| Validation | Pydantic |
| Real-time | SSE via `sse-starlette` |
| ASGI server | `uvicorn` |
| Testing | `pytest`, `pytest-asyncio` |

### Proxy Layer

`proxy.config.json` bridges Angular dev server (port 4200) to FastAPI (port 8000):

```json
{
  "/api":    { "target": "http://localhost:8000", "changeOrigin": true },
  "/stream": { "target": "http://localhost:8000", "changeOrigin": true, "ws": true }
}
```

All HTTP calls prefixed with `/api` and SSE connections to `/stream` are forwarded transparently — no CORS configuration required during development.

### Core Modules

**Backend (`server/`)**

| File | Responsibility |
|---|---|
| `auth.py` | bcrypt hashing, JWT creation & validation, FastAPI auth dependency |
| `crypto.py` | AES-256-GCM encrypt/decrypt, secret key loaded from `.env` |
| `models.py` | SQLAlchemy `User` and `Message` ORM models, DB session lifecycle |
| `schemas.py` | Pydantic request/response models |
| `routes.py` | REST endpoints: register, login, send message, fetch messages |
| `broadcaster.py` | Async SSE fan-out, per-user `asyncio.Queue` subscriptions |

**Frontend (`client/angular-client/src/app/`)**

| Path | Responsibility |
|---|---|
| `core/services/auth.service.ts` | Login, registration, JWT session state |
| `core/services/chat.service.ts` | Message send/fetch, SSE EventSource management |
| `core/services/face-emotion.service.ts` | Camera stream, face-api detection loop, emoji Signal |
| `core/guards/auth.guard.ts` | Route guard blocking unauthenticated access to chat |
| `features/login/login.component.ts` | Login & registration UI |
| `features/chat/chat.component.ts` | Chat feed, message input, Tab autocomplete, emotion overlay |

---

## ⚙️ Local Setup & Installation

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Git

---

### Backend

```bash
# Clone and enter the project
git clone https://github.com/TSH61-git/secure-messenger.git
cd "secure messenger"

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the repository root:

```env
SECRET_KEY=your-32-byte-secret-key-here
```

> `SECRET_KEY` must be a cryptographically random value. It is used both as the AES-256-GCM message encryption key and the JWT signing secret.

Start the API server:

```bash
uvicorn server.main:app --reload
```

The API is now available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

### Frontend

```bash
cd client/angular-client
npm install
npm start
```

The Angular dev server starts at `http://localhost:4200` and proxies all `/api` and `/stream` traffic to FastAPI automatically.

---

### ⚠️ Face-API Model Weights

The emotion detection engine requires pre-trained model weight files to be served as static assets. Place all model files under:

```
client/angular-client/src/public/models/
```

Required subdirectories:

```
src/public/models/
├── ssd_mobilenetv1/
├── face_landmark_68/
└── face_expression/
```

> If the `models/` directory is missing or placed elsewhere, `face-api.js` will fail to load weights and throw 404 errors at runtime. The service loads from the `/models` public path, which maps directly to `src/public/models/` in the Angular build pipeline.

Download the weights from the [`vladmandic/face-api` GitHub releases](https://github.com/vladmandic/face-api) or the original `justadudewhohacks/face-api.js` repository.

---

### Run Tests

```bash
pytest tests/ -v
```

---

## Security Considerations

- Passwords are hashed with bcrypt — extraction from the database yields only an irreversible hash.
- JWT tokens are signed HS256, expire after 24 hours, and are validated on every protected request.
- AES-256-GCM provides both confidentiality and integrity for stored messages — tampered ciphertexts will fail decryption.
- Random per-message nonces mean identical plaintext messages always produce different ciphertexts.
- Message queries are filtered server-side: a user can never retrieve another user's messages regardless of client manipulation.
- SSE subscriptions are isolated per authenticated user; no cross-user event leakage is possible.
- The device camera stream is consumed entirely client-side by `face-api.js` — no video data is transmitted to the server.

---

## Contribution

- Fork the repository and create a feature branch.
- Open a pull request with a clear description of the change.
- Add or update tests for all new behavior.
- Prioritize secure defaults, explicit validation, and minimal trust assumptions.
