import { Component } from '@angular/core';
import { ProfileService, PortfolioMeta, StarStory } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  meta: PortfolioMeta;
  professionalSummary: string[];
  stories: StarStory[];
  expanded = new Set<string>();

  constructor(private profileService: ProfileService) {
    this.meta = this.profileService.meta;
    this.professionalSummary = this.profileService.professionalSummary;
    this.stories = this.profileService.stories;
  }

  toggle(id: string) {
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      this.expanded.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expanded.has(id);
  }
}
