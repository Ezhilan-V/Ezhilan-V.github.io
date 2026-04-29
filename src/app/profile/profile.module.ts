import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AboutComponent } from './about/about.component';
import { ExperienceComponent } from './experience/experience.component';
import { EducationComponent } from './education/education.component';
import { ProfileComponent } from './profile.component';
import { MaterialModule } from '../material.module';
import { ProjectCardComponent } from './project-card/project-card.component';
import { ProjectDetailsComponent } from './project-details/project-details.component';
import { SkillsComponent } from './skills/skills.component';
import { PatentComponent } from './patent/patent.component';
import { VisitorStatsComponent } from './visitor-stats/visitor-stats.component';
import { ContactFormComponent } from './contact-form/contact-form.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
  ],
  declarations: [
    ProfileComponent,
    AboutComponent,
    SkillsComponent,
    ExperienceComponent,
    EducationComponent,
    ProjectCardComponent,
    ProjectDetailsComponent,
    PatentComponent,
    VisitorStatsComponent,
    ContactFormComponent
  ]
})
export class ProfileModule { }
