import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  standalone: false,
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactFormComponent implements OnInit {
  @Input() email = '';
  @Input() linkedin = '';
  @Input() github = '';

  // Honeypot - bots fill this in, humans don't see it
  honey = '';

  name = '';
  fromEmail = '';
  subject = '';
  message = '';

  submitState: 'idle' | 'composing' | 'saving' | 'sent' = 'idle';
  copiedEmail = false;
  savedToInbox = false;     // true if Firebase POST succeeded

  // simple validation flags
  touchedName = false;
  touchedMessage = false;

  private firebaseDbUrl = '';

  constructor(private cd: ChangeDetectorRef, private http: HttpClient) {}

  ngOnInit() {
    this.subject = 'Hello from your portfolio site';
    this.firebaseDbUrl = (environment.firebase.dbUrl || '').trim().replace(/\/+$/, '');
  }

  isValid(): boolean {
    return this.name.trim().length >= 2 && this.message.trim().length >= 8;
  }

  send() {
    this.touchedName = true;
    this.touchedMessage = true;
    if (!this.isValid()) {
      this.cd.markForCheck();
      return;
    }

    // Bot honeypot - silently swallow
    if (this.honey.trim().length > 0) {
      this.submitState = 'sent';
      this.cd.markForCheck();
      return;
    }

    this.submitState = this.firebaseDbUrl ? 'saving' : 'composing';
    this.cd.markForCheck();

    // Persist to Firebase (so Ezhilan sees the message even if mailto fails),
    // then open mailto, then flip to "sent".
    this.saveToFirebase().then(saved => {
      this.savedToInbox = saved;
      this.submitState = 'composing';
      this.cd.markForCheck();
      this.openMailto();
      setTimeout(() => {
        this.submitState = 'sent';
        this.cd.markForCheck();
      }, 700);
    });
  }

  private openMailto() {
    const subjectLine = this.subject.trim() || 'Hello from your portfolio site';
    const fromLine = this.fromEmail.trim()
      ? `\n\n--\n${this.name.trim()} <${this.fromEmail.trim()}>`
      : `\n\n--\n${this.name.trim()}`;
    const body = `${this.message.trim()}${fromLine}`;
    window.location.href =
      `mailto:${this.email}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
  }

  private saveToFirebase(): Promise<boolean> {
    if (!this.firebaseDbUrl) return Promise.resolve(false);
    const payload = {
      name:    this.name.trim().slice(0, 80),
      email:   this.fromEmail.trim().slice(0, 120),
      subject: this.subject.trim().slice(0, 160) || 'Hello from your portfolio site',
      message: this.message.trim().slice(0, 4000),
      ts:      Date.now()
    };
    return new Promise(resolve => {
      this.http.post(`${this.firebaseDbUrl}/messages.json`, payload).pipe(
        timeout(5000),
        catchError(() => of(null))
      ).subscribe(res => resolve(!!res));
    });
  }

  reset() {
    this.name = '';
    this.fromEmail = '';
    this.subject = 'Hello from your portfolio site';
    this.message = '';
    this.honey = '';
    this.touchedName = false;
    this.touchedMessage = false;
    this.savedToInbox = false;
    this.submitState = 'idle';
    this.cd.markForCheck();
  }

  copyEmail(ev: Event) {
    ev.preventDefault();
    const fallback = (text: string) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    };
    const apply = () => {
      this.copiedEmail = true;
      this.cd.markForCheck();
      setTimeout(() => { this.copiedEmail = false; this.cd.markForCheck(); }, 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(this.email).then(apply, () => { fallback(this.email); apply(); });
    } else {
      fallback(this.email);
      apply();
    }
  }
}
