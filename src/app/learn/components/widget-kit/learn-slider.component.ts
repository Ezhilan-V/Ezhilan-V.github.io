import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'learn-slider',
  template: `
    <div class="ls">
      <div class="ls__head">
        <span class="ls__name">{{ label }}</span>
        <span class="ls__val">
          <ng-container *ngIf="display; else numeric">{{ display }}</ng-container>
          <ng-template #numeric>{{ value | number:fmt }}</ng-template>
          <span class="ls__unit" *ngIf="unit"> {{ unit }}</span>
        </span>
      </div>
      <input type="range"
             [min]="min" [max]="max" [step]="step" [value]="value"
             (input)="onInput($any($event.target).value)"
             [attr.aria-label]="label" />
    </div>
  `,
  styleUrls: ['./learn-slider.component.scss']
})
export class LearnSliderComponent {
  @Input() label = '';
  @Input() unit = '';
  @Input() min = 0;
  @Input() max = 1;
  @Input() step = 0.01;
  @Input() value = 0;
  @Input() display = '';
  @Input() fmt = '1.2-2';

  @Output() valueChange = new EventEmitter<number>();

  onInput(raw: any) {
    const v = +raw;
    this.value = v;
    this.valueChange.emit(v);
  }
}
