import { Component } from '@angular/core';
import { ProfileService, StarStory } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-stories',
  templateUrl: './stories.component.html',
  styleUrls: ['./stories.component.scss']
})
export class StoriesComponent {
  stories: StarStory[];
  expanded = new Set<string>();

  constructor(private svc: ProfileService) {
    this.stories = svc.stories;
  }

  toggle(id: string) {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
  }

  isExpanded(id: string): boolean { return this.expanded.has(id); }
}
