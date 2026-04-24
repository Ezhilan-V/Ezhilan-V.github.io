import { Component } from '@angular/core';
import { ProfileService, PortfolioMeta } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  meta: PortfolioMeta;
  professionalSummary: string[];

  constructor(private profileService: ProfileService) {
    this.meta = this.profileService.meta;
    this.professionalSummary = this.profileService.professionalSummary;
  }
}
