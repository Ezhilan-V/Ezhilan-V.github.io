import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface LearnPreset {
  id: string;
  label: string;
  hint?: string;
}

@Component({
  standalone: false,
  selector: 'learn-presets',
  template: `
    <div class="lp" role="group" [attr.aria-label]="label || 'Presets'">
      <span class="lp__label" *ngIf="label">{{ label }}</span>
      <div class="lp__chips">
        <button *ngFor="let p of presets"
                type="button"
                [class.is-active]="active === p.id"
                [attr.title]="p.hint || null"
                (click)="select.emit(p.id)">
          {{ p.label }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./learn-presets.component.scss']
})
export class LearnPresetsComponent {
  @Input() presets: LearnPreset[] = [];
  @Input() active: string | null = null;
  @Input() label = '';
  @Output() select = new EventEmitter<string>();
}
