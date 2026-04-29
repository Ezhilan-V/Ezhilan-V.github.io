import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'learn-workspace-name';
const DEFAULT_WS = 'ros2_ws';
const VALID = /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/;

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly name$ = new BehaviorSubject<string>(this.read());

  set(raw: string) {
    const trimmed = (raw || '').trim();
    const next = VALID.test(trimmed) ? trimmed : DEFAULT_WS;
    if (next === this.name$.value) return;
    localStorage.setItem(STORAGE_KEY, next);
    this.name$.next(next);
  }

  get current(): string {
    return this.name$.value;
  }

  substitute(text: string): string {
    return (text ?? '').replace(/\{\{\s*ws\s*\}\}/g, this.name$.value);
  }

  private read(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && VALID.test(saved) ? saved : DEFAULT_WS;
    } catch {
      return DEFAULT_WS;
    }
  }
}
