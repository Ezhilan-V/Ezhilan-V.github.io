import { Component, Input } from '@angular/core';

export type LearnCalloutKind = 'try' | 'note' | 'eq';

@Component({
  standalone: false,
  selector: 'learn-callout',
  template: `
    <div class="lc" [attr.data-kind]="kind">
      <div class="lc__icon" *ngIf="kind !== 'eq'">
        <i class="fas" [class.fa-hand-pointer]="kind === 'try'" [class.fa-circle-info]="kind === 'note'"></i>
      </div>
      <div class="lc__body">
        <span class="lc__label" *ngIf="label">{{ label }}</span>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./learn-callout.component.scss']
})
export class LearnCalloutComponent {
  @Input() kind: LearnCalloutKind = 'note';
  @Input() label = '';
}
