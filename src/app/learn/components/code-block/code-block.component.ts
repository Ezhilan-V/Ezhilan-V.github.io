import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  standalone: false,
  selector: 'learn-code-block',
  templateUrl: './code-block.component.html',
  styleUrls: ['./code-block.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeBlockComponent implements OnInit, OnDestroy {
  @Input() code = '';
  @Input() language = 'bash';
  @Input() title?: string;
  @Input() note?: string;

  rendered = '';
  copied = false;

  private sub?: Subscription;
  private resetTimer?: ReturnType<typeof setTimeout>;

  constructor(private ws: WorkspaceService, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.sub = this.ws.name$.subscribe(() => {
      this.rendered = this.ws.substitute(this.code);
      this.cd.markForCheck();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  async copy() {
    const text = this.rendered;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    this.copied = true;
    this.cd.markForCheck();
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      this.copied = false;
      this.cd.markForCheck();
    }, 1600);
  }
}
