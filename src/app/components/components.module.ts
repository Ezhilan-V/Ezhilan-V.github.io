import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NouisliderModule } from 'ng2-nouislider';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { JwBootstrapSwitchNg2Module } from 'jw-bootstrap-switch-ng2';
import { AgmCoreModule } from '@agm/core';
import { MaterialModule } from '../material.module';
import { RouterModule } from '@angular/router';
import { ProjectCardComponent } from '../profile/project-card/project-card.component';
import { ProjectsComponent } from './projects/projects.component';

@NgModule({
    exports:[ ],
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
        NouisliderModule,
        JwBootstrapSwitchNg2Module,
        MaterialModule,
        // AppRoutingModule,
        RouterModule,
        AgmCoreModule.forRoot({
            apiKey: 'YOUR_KEY_HERE'
        })
    ],
    declarations: [
    ]
})
export class ComponentsModule { }
