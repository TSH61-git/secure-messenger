# Secure Messenger — Angular Client

Modern Angular 19 web client for the Secure Messenger FastAPI backend.

## Stack
- Angular 19 (standalone components, signals, RxJS)
- Tailwind CSS 3 (dark theme)
- Native `EventSource` SSE

## Setup

```bash
cd client/angular-client
npm install
```

## Run (dev)

Start the FastAPI backend first:
```bash
# from repo root
uvicorn server.main:app --reload
```

Then start the Angular dev server (proxies `/api` → `http://localhost:8000`):
```bash
npm start
```

Open **http://localhost:4200**

## Build (production)

```bash
npm run build
# output → dist/secure-messenger/
```

## Architecture

```
src/app/
├── core/
│   ├── services/
│   │   ├── auth.service.ts   — JWT auth, in-memory token, HTTP interceptor
│   │   └── chat.service.ts   — history, send, SSE stream with auto-reconnect
│   └── guards/
│       └── auth.guard.ts     — protects /chat route
└── features/
    ├── login/
    │   └── login.component.ts  — tabbed register/login form
    └── chat/
        └── chat.component.ts   — sidebar + chat bubbles + optimistic send
```

## Notes on SSE Authentication
The browser's native `EventSource` API does not support custom request headers.
The Angular `ChatService` passes the JWT as a `?token=` query parameter.
The FastAPI `require_auth` dependency was updated to accept either an
`Authorization: Bearer` header OR a `?token=` query param.
