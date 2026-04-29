import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'learn-page-hero',
  templateUrl: './page-hero.component.html',
  styleUrls: ['./page-hero.component.scss']
})
export class PageHeroComponent {
  @Input() icon = 'fa-graduation-cap';
  @Input() eyebrow = 'Learn Robotics';
  @Input() title = '';
  @Input() tagline = '';
  @Input() body = '';
  @Input() accent = '#38bdf8';
}
