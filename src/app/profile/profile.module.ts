import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SnotifyModule, SnotifyService, ToastDefaults } from 'ng-snotify';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { IntroComponent } from './intro/intro.component';
import { AboutComponent } from './about/about.component';
import { SkillsComponent } from './skills/skills.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { ExperienceComponent } from './experience/experience.component';
import { EducationComponent } from './education/education.component';
import { ReferenceComponent } from './reference/reference.component';
import { ContactComponent } from './contact/contact.component';
import { NgxSpinnerModule } from '../../../node_modules/ngx-spinner';
import { ProjectsComponent } from './projects/projects.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { SplitPipe } from './split.pipe';
import { ResumeComponent } from './profile.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    // SnotifyModule,
    // NgxSpinnerModule,
    // NgxPaginationModule
  ],
  declarations: [ResumeComponent,
    HeaderComponent,
    FooterComponent,
    IntroComponent,
    AboutComponent,
    SkillsComponent,
    PortfolioComponent,
    ExperienceComponent,
    EducationComponent,
    ReferenceComponent,
    ContactComponent,
    ProjectsComponent,
    SplitPipe
  ],
  providers: [
    // { provide: 'SnotifyToastConfig', useValue: ToastDefaults },
    // SnotifyService,
  ]
})
export class ProfileModule { }
