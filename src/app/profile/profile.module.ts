import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AboutComponent } from './about/about.component';
import { ExperienceComponent } from './experience/experience.component';
import { EducationComponent } from './education/education.component';
import { ContactComponent } from './contact/contact.component';
import { ResumeComponent } from './profile.component';
import { MaterialModule } from '../material.module';
import { ProjectCardComponent } from './project-card/project-card.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectDetailsComponent } from './project-card/project-details.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    NgbModule,
  ],
  declarations: [
    ResumeComponent,
    AboutComponent,
    ExperienceComponent,
    EducationComponent,
    ContactComponent, 
    ProjectCardComponent,
    ProjectDetailsComponent
  ],
  providers: []
})
export class ProfileModule { }
