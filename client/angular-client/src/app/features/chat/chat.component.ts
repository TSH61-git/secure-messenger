import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ChatService, Message } from '../../core/services/chat.service';
import { FaceEmotionService } from '../../core/services/face-emotion.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-screen bg-surface-900 overflow-hidden">

      <!-- ── Consent Dialog Overlay ──────────────────────────────────── -->
      @if (!hasCameraConsent()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="bg-surface-800 border border-surface-600 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30
                          flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" stroke-width="2"
                     viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <div>
                <h2 class="text-white font-bold text-base">Smart Emotion AI</h2>
                <p class="text-xs text-gray-500">Optional camera feature</p>
              </div>
            </div>
            <p class="text-sm text-gray-300 leading-relaxed mb-6">
              This platform utilizes client-side face expression AI to dynamically suggest
              matching emoji completions in real-time.
              <span class="text-accent font-medium">No video data or images are ever stored or sent to a server.</span>
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                (click)="grantConsent()"
                class="flex-1 bg-accent hover:bg-accent-hover text-white text-sm font-semibold
                       px-4 py-2.5 rounded-xl transition-colors duration-150">
                ✨ Enable Smart AI Autocomplete
              </button>
              <button
                type="button"
                (click)="dismissConsent()"
                class="px-4 py-2.5 rounded-xl text-sm text-gray-400
                       hover:text-white hover:bg-surface-700 transition-colors duration-150">
                Skip
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Sidebar ──────────────────────────────────────────────────── -->
      <aside class="w-64 flex-shrink-0 bg-surface-800 border-r border-surface-600
                    flex flex-col">

        <!-- Brand header -->
        <div class="px-5 py-4 border-b border-surface-600">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2"
                   viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
              </svg>
            </div>
            <span class="font-bold text-white text-sm tracking-tight">Secure Messenger</span>
          </div>
        </div>

        <!-- Current user + AI Toggle -->
        <div class="px-5 py-3 border-b border-surface-600 space-y-3">
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Signed in as</p>
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-accent/20 border border-accent/40
                          flex items-center justify-center text-accent font-bold text-xs">
                {{ (auth.currentUser() ?? '?')[0].toUpperCase() }}
              </div>
              <span class="text-sm font-medium text-white truncate">{{ auth.currentUser() }}</span>
            </div>
          </div>
          <!-- Smart Emoji AI Toggle -->
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-xs font-medium text-gray-300">Smart Emoji AI</p>
              <p class="text-xs text-gray-600">{{ isCameraFeatureEnabled() ? 'On' : 'Off' }}</p>
            </div>
            <button
              type="button"
              (click)="toggleCamera()"
              [disabled]="!hasCameraConsent()"
              [title]="!hasCameraConsent() ? 'Enable AI from the consent prompt first' : ''"
              class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
                     cursor-pointer transition-colors duration-200 focus:outline-none
                     disabled:opacity-40 disabled:cursor-not-allowed"
              [class]="isCameraFeatureEnabled() ? 'bg-accent' : 'bg-surface-600'">
              <span
                class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
                       transform transition-transform duration-200"
                [class]="isCameraFeatureEnabled() ? 'translate-x-5' : 'translate-x-0'">
              </span>
            </button>
          </div>
        </div>

        <!-- Users list -->
        <div class="flex-1 overflow-y-auto scrollbar-thin py-2">
          <p class="px-5 py-2 text-xs text-gray-500 uppercase tracking-wider">Users</p>
          @for (user of otherUsers(); track user) {
            <button
              type="button"
              (click)="selectUser(user)"
              class="w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-150"
              [class]="selectedUser() === user
                ? 'bg-accent/10 text-accent border-r-2 border-accent'
                : 'text-gray-300 hover:bg-surface-700 hover:text-white'">
              <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs"
                   [class]="selectedUser() === user
                     ? 'bg-accent/20 text-accent'
                     : 'bg-surface-600 text-gray-400'">
                {{ user[0].toUpperCase() }}
              </div>
              <span class="truncate">{{ user }}</span>
            </button>
          }
          @if (otherUsers().length === 0) {
            <p class="px-5 py-3 text-xs text-gray-600 italic">No other users yet</p>
          }
        </div>

        <!-- Logout -->
        <div class="px-4 py-4 border-t border-surface-600">
          <button
            type="button"
            (click)="auth.logout()"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                   text-gray-400 hover:text-white hover:bg-surface-700
                   transition-colors duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"
                 viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <!-- ── Main panel ────────────────────────────────────────────────── -->
      <main class="flex-1 flex flex-col min-w-0">

        <!-- Chat header -->
        <header class="flex items-center gap-3 px-6 py-4 border-b border-surface-600
                       bg-surface-800 flex-shrink-0">
          @if (selectedUser()) {
            <div class="w-9 h-9 rounded-full bg-accent/20 border border-accent/40
                        flex items-center justify-center font-bold text-accent text-sm">
              {{ selectedUser()![0].toUpperCase() }}
            </div>
            <div>
              <p class="font-semibold text-white text-sm">{{ selectedUser() }}</p>
              <p class="text-xs text-green-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                End-to-end encrypted
              </p>
            </div>
          } @else {
            <p class="text-gray-400 text-sm">Select a user to start chatting</p>
          }
        </header>

        <!-- Messages viewport -->
        <div #messagesContainer
             class="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-3">
          @for (msg of visibleMessages(); track msg.id) {
            <div class="flex"
                 [class]="msg.sender === auth.currentUser() ? 'justify-end' : 'justify-start'">
              <div class="max-w-[70%]">
                <!-- Sender label -->
                <p class="text-xs mb-1 px-1"
                   [class]="msg.sender === auth.currentUser()
                     ? 'text-right text-gray-500'
                     : 'text-left text-gray-500'">
                  {{ msg.sender === auth.currentUser() ? 'You' : msg.sender }}
                </p>
                <!-- Bubble -->
                <div class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
                     [class]="msg.sender === auth.currentUser()
                       ? 'bg-accent text-white rounded-br-sm'
                       : 'bg-surface-700 text-gray-100 rounded-bl-sm'">
                  {{ msg.content }}
                </div>
                <!-- Timestamp -->
                <p class="text-xs text-gray-600 mt-1 px-1"
                   [class]="msg.sender === auth.currentUser() ? 'text-right' : 'text-left'">
                  {{ msg.created_at | date:'HH:mm' }}
                </p>
              </div>
            </div>
          }

          @if (!selectedUser()) {
            <div class="flex flex-col items-center justify-center h-full text-center
                        text-gray-600 py-20">
              <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor"
                   stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
              </svg>
              <p class="text-sm">Pick a user from the sidebar to begin</p>
            </div>
          }
        </div>

        <!-- Hidden webcam feed — always in DOM so ViewChild ref is never null -->
        <video #webcam muted playsinline
               style="position:fixed;opacity:0;pointer-events:none;width:1px;height:1px"></video>

        <!-- Input bar -->
        <footer class="px-6 py-4 border-t border-surface-600 bg-surface-800 flex-shrink-0">
          <!-- Ghost emoji hint -->
          @if (suggestedEmoji() && isCameraFeatureEnabled()) {
            <div class="flex items-center gap-1.5 mb-2 px-1">
              <span class="text-lg opacity-40">{{ suggestedEmoji() }}</span>
              <span class="text-xs text-gray-600">Press <kbd class="px-1 py-0.5 rounded bg-surface-600 text-gray-400 font-mono text-xs">Tab</kbd> to insert</span>
            </div>
          }
          <form (ngSubmit)="sendMessage()" class="flex items-center gap-3">
            <input
              [(ngModel)]="messageText"
              name="messageText"
              type="text"
              (keydown.tab)="onTab($event)"
              [placeholder]="selectedUser()
                ? 'Message ' + selectedUser() + '…'
                : 'Select a recipient first'"
              [disabled]="!selectedUser()"
              autocomplete="off"
              class="flex-1 bg-surface-700 border border-surface-500 rounded-xl
                     px-4 py-2.5 text-white text-sm placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200" />
            <button
              type="submit"
              [disabled]="!selectedUser() || !messageText.trim()"
              class="flex-shrink-0 w-10 h-10 bg-accent hover:bg-accent-hover
                     disabled:opacity-40 disabled:cursor-not-allowed
                     rounded-xl flex items-center justify-center
                     transition-all duration-200 shadow-lg">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor"
                   stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </footer>

      </main>
    </div>
  `,
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy, AfterViewChecked {
  readonly auth = inject(AuthService);
  readonly chat = inject(ChatService);
  private readonly faceEmotion = inject(FaceEmotionService);
  readonly suggestedEmoji = this.faceEmotion.suggestedEmoji;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('webcam') private webcamRef!: ElementRef<HTMLVideoElement>;

  readonly selectedUser = signal<string | null>(null);
  readonly hasCameraConsent = signal(false);
  readonly isCameraFeatureEnabled = signal(false);
  messageText = '';

  private shouldScroll = false;

  readonly otherUsers = computed(() =>
    this.chat.users().filter((u) => u !== this.auth.currentUser()),
  );

  readonly visibleMessages = computed(() => {
    const peer = this.selectedUser();
    const me = this.auth.currentUser();
    if (!peer || !me) return [];;
    return this.chat
      .messages()
      .filter(
        (m) =>
          (m.sender === me && m.recipient === peer) ||
          (m.sender === peer && m.recipient === me),
      );
  });

  ngOnInit() {
    this.chat.loadHistory();
    this.chat.loadUsers();
    this.chat.connectStream();
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.chat.disconnectStream();
    this.faceEmotion.stopCamera();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this._scrollToBottom();
      this.shouldScroll = false;
    }
  }

  grantConsent() {
    this.hasCameraConsent.set(true);
    this.isCameraFeatureEnabled.set(true);
    this._startCamera();
  }

  dismissConsent() {
    // Mark consent dialog as seen (dismissed); camera stays off.
    this.hasCameraConsent.set(true);
    this.isCameraFeatureEnabled.set(false);
  }

  toggleCamera() {
    if (this.isCameraFeatureEnabled()) {
      this.isCameraFeatureEnabled.set(false);
      this.faceEmotion.stopCamera();
    } else {
      this.isCameraFeatureEnabled.set(true);
      this._startCamera();
    }
  }

  selectUser(user: string) {
    this.selectedUser.set(user);
    this.shouldScroll = true;
  }

  onTab(event: any) {
    const emoji = this.suggestedEmoji();
    if (!emoji) return;
    event.preventDefault();
    this.messageText = this.messageText ? `${this.messageText} ${emoji}` : emoji;
    this.faceEmotion.suggestedEmoji.set('');
  }

  sendMessage() {
    const text = this.messageText.trim();
    const recipient = this.selectedUser();
    if (!text || !recipient) return;

    this.messageText = '';
    this.shouldScroll = true;
    this.chat.send(text, recipient);
  }

  private _startCamera() {
    this.faceEmotion
      .startCamera(this.webcamRef.nativeElement)
      .catch(err => console.error('FaceEmotionService:', err));
  }

  private _scrollToBottom() {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
