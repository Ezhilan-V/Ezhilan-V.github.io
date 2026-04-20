import { Component } from '@angular/core';
import { ProfileService, Experience } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-experience',
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.scss']
})
export class ExperienceComponent {
  workexp: Experience[];
  expandedExp: string | null = null;
  expandedProj: string | null = null;

  constructor(private profileService: ProfileService) {
    this.workexp = this.profileService.experience;
  }

  toggleExperience(expId: string): void {
    this.expandedExp = this.expandedExp === expId ? null : expId;
  }

  toggleProject(projId: string): void {
    this.expandedProj = this.expandedProj === projId ? null : projId;
  }

  isExperienceExpanded(expId: string): boolean { return this.expandedExp === expId; }
  isProjectExpanded(projId: string): boolean   { return this.expandedProj === projId; }
}
