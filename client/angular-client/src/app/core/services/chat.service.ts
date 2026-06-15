import { inject, Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Message {
  id: number;
  sender: string;
  recipient: string;
  content: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  readonly messages = signal<Message[]>([]);
  readonly users = signal<string[]>([]);

  private es: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;

  // ── History ────────────────────────────────────────────────────────────────

  loadHistory() {
    return this.http.get<Message[]>(`${this.base}/messages`).subscribe({
      next: (msgs) => this.messages.set(msgs),
    });
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  send(content: string, recipient: string) {
    // Optimistic update
    const optimistic: Message = {
      id: Date.now(),
      sender: this.auth.currentUser()!,
      recipient,
      content,
      created_at: new Date().toISOString(),
    };
    this.messages.update((prev) => [...prev, optimistic]);

    return this.http
      .post<Message>(`${this.base}/messages`, { content, recipient })
      .subscribe({
        next: (confirmed) =>
          // Replace the optimistic entry with the server-confirmed one
          this.messages.update((prev) =>
            prev.map((m) => (m.id === optimistic.id ? confirmed : m)),
          ),
        error: () =>
          // Roll back optimistic entry on failure
          this.messages.update((prev) =>
            prev.filter((m) => m.id !== optimistic.id),
          ),
      });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  loadUsers() {
    return this.http
      .get<string[]>(`${this.base}/users`)
      .subscribe({ next: (u) => this.users.set(u) });
  }

  // ── SSE stream ─────────────────────────────────────────────────────────────

  connectStream() {
    const token = this.auth.token();
    if (!token || this.es) return;
    this._openEventSource(token);
  }

  private _openEventSource(token: string) {
    // EventSource doesn't support custom headers — pass token as query param
    // The backend must accept ?token=<jwt> OR we use a dedicated SSE proxy path.
    // Per the README the /stream endpoint uses the standard Authorization header;
    // we therefore open the connection through the dev-proxy which rewrites the path
    // and attach the token as a query param supported by sse-starlette.
    const url = `/stream?token=${encodeURIComponent(token)}`;
    this.es = new EventSource(url);

    this.es.onmessage = (event) => {
      try {
        const msg: Message = JSON.parse(event.data);
        const me = this.auth.currentUser();
        // Avoid duplicates for messages we sent (already added optimistically)
        if (msg.sender === me) return;
        this.messages.update((prev) => [...prev, msg]);
      } catch {
        // malformed event — ignore
      }
    };

    this.es.onerror = () => {
      this.es?.close();
      this.es = null;
      // Exponential back-off capped at 30 s
      this.reconnectTimer = setTimeout(() => {
        const t = this.auth.token();
        if (t) this._openEventSource(t);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
      }, this.reconnectDelay);
    };

    this.es.addEventListener('open', () => {
      this.reconnectDelay = 2000; // reset on successful connection
    });
  }

  disconnectStream() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.es?.close();
    this.es = null;
  }

  ngOnDestroy() {
    this.disconnectStream();
  }
}
