import { Component } from '@angular/core';
import { ProfileService, Education, EducationSection, CourseCategory } from '../profile.service';

type GPASection           = { type: 'gpa'; content: string };
type CourseCategorized    = { type: 'courseCategorized'; title: string; content: CourseCategory[] };
type ProjectsSection      = { type: 'projects'; content: string[] };
type AchievementsSection  = { type: 'achievements'; content: string[] };

@Component({
  standalone: false,
  selector: 'app-education',
  templateUrl: './education.component.html',
  styleUrls: ['./education.component.scss']
})
export class EducationComponent {
  education: Education[];

  constructor(private profileService: ProfileService) {
    this.education = this.profileService.education;
  }

  isGPASection(s: EducationSection): s is GPASection                       { return s.type === 'gpa'; }
  isCourseCategorizedSection(s: EducationSection): s is CourseCategorized  { return s.type === 'courseCategorized'; }
  isProjectsSection(s: EducationSection): s is ProjectsSection             { return s.type === 'projects'; }
  isAchievementsSection(s: EducationSection): s is AchievementsSection     { return s.type === 'achievements'; }
}
