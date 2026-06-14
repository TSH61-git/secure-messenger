import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

type Tab = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div class="w-full max-w-md">

        <!-- Logo / heading -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-4 shadow-lg">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" stroke-width="2"
                 viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Secure Messenger</h1>
          <p class="text-sm text-gray-400 mt-1">End-to-end encrypted conversations</p>
        </div>

        <!-- Card -->
        <div class="bg-surface-800 rounded-2xl shadow-2xl overflow-hidden border border-surface-600">

          <!-- Tabs -->
          <div class="flex border-b border-surface-600">
            @for (tab of tabs; track tab) {
              <button
                type="button"
                (click)="activeTab.set(tab)"
                class="flex-1 py-3.5 text-sm font-medium transition-colors duration-200"
                [class]="activeTab() === tab
                  ? 'text-white border-b-2 border-accent bg-surface-700'
                  : 'text-gray-400 hover:text-gray-200'">
                {{ tab === 'login' ? 'Sign In' : 'Create Account' }}
              </button>
            }
          </div>

          <!-- Form -->
          <div class="p-8">
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">

              <!-- Username -->
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <input
                  formControlName="username"
                  type="text"
                  autocomplete="username"
                  placeholder="e.g. alice"
                  class="w-full bg-surface-700 border border-surface-500 rounded-xl px-4 py-2.5
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         transition-all duration-200" />
                @if (f['username'].invalid && f['username'].touched) {
                  <p class="text-red-400 text-xs mt-1.5">
                    {{ activeTab() === 'register' ? 'Min 3 characters' : 'Required' }}
                  </p>
                }
              </div>

              <!-- Password -->
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  formControlName="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full bg-surface-700 border border-surface-500 rounded-xl px-4 py-2.5
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         transition-all duration-200" />
                @if (f['password'].invalid && f['password'].touched) {
                  <p class="text-red-400 text-xs mt-1.5">Min 6 characters</p>
                }
              </div>

              <!-- Server error -->
              @if (errorMsg()) {
                <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p class="text-red-400 text-sm">{{ errorMsg() }}</p>
                </div>
              }

              <!-- Submit -->
              <button
                type="submit"
                [disabled]="loading()"
                class="w-full bg-accent hover:bg-accent-hover disabled:opacity-50
                       text-white font-semibold py-2.5 rounded-xl
                       transition-all duration-200 shadow-lg hover:shadow-accent/25
                       flex items-center justify-center gap-2 text-sm">
                @if (loading()) {
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                }
                {{ activeTab() === 'login' ? 'Sign In' : 'Create Account' }}
              </button>

            </form>
          </div>
        </div>

        <p class="text-center text-xs text-gray-600 mt-6">
          Messages are encrypted with AES-256-GCM
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly tabs: Tab[] = ['login', 'register'];
  readonly activeTab = signal<Tab>('login');
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f(): Record<string, AbstractControl> {
    return this.form.controls;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const payload = this.form.value as { username: string; password: string };

    if (this.activeTab() === 'register') {
      this.auth.register(payload).subscribe({
        next: () => {
          // Auto-login after successful registration
          this.auth.login(payload).subscribe({ error: (e) => this._handleError(e) });
        },
        error: (e) => this._handleError(e),
      });
    } else {
      this.auth.login(payload).subscribe({ error: (e) => this._handleError(e) });
    }
  }

  private _handleError(err: { error?: { detail?: string } }) {
    this.loading.set(false);
    this.errorMsg.set(err?.error?.detail ?? 'Something went wrong. Please try again.');
  }
}
