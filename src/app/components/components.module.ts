import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../material.module';
import { RouterModule } from '@angular/router';
import { ProjectCardComponent } from './project-card/project-card.component';

@NgModule({
    exports: [ProjectCardComponent],
    imports: [CommonModule,
        FormsModule,
        MaterialModule,
        RouterModule
    ],
    declarations: [
        ProjectCardComponent
    ]
})
export class ComponentsModule { }
