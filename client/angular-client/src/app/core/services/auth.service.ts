import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthPayload { username: string; password: string; }
interface TokenResponse { access_token: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  // In-memory only — never written to localStorage
  readonly token = signal<string | null>(null);
  readonly currentUser = signal<string | null>(null);

  register(payload: AuthPayload) {
    return this.http.post(`${this.base}/register`, payload);
  }

  login(payload: AuthPayload) {
    return this.http
      .post<TokenResponse>(`${this.base}/login`, payload)
      .pipe(
        tap((res) => {
          this.token.set(res.access_token);
          this.currentUser.set(payload.username);
          this.router.navigate(['/chat']);
        }),
      );
  }

  logout() {
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.token() !== null;
  }
}

// Functional HTTP interceptor — attaches Bearer token to every request
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
