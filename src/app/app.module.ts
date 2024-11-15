import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // this is needed!
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app.routing';
import { AppComponent } from './app.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { MaterialModule } from './material.module';
import { ComponentsModule } from './components/components.module';
import { ProfileModule } from './profile/profile.module';
import { ProfileComponent } from './components/profile/profile.component';
import { ThemeService } from './theme.service';
import { ThemeToggleComponent } from './theme/theme.component';
@NgModule({
    declarations: [
        AppComponent,
        NavbarComponent,
        ProfileComponent,
        ThemeToggleComponent
    ],
    imports: [
        BrowserAnimationsModule,
        NgbModule,
        FormsModule,
        RouterModule,
        AppRoutingModule,
        ComponentsModule,
        MaterialModule,
        ProfileModule
    ],
    providers: [ThemeService],
    bootstrap: [AppComponent]
})
export class AppModule { }
