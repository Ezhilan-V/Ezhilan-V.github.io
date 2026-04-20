import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app.routing';
import { AppComponent } from './app.component';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { MaterialModule } from './material.module';
import { ProfileModule } from './profile/profile.module';
import { ProfileService } from './profile/profile.service';

function initPortfolio(svc: ProfileService): () => Promise<any> {
  return () => svc.load().toPromise();
}

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent
  ],
  imports: [
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    RouterModule,
    AppRoutingModule,
    MaterialModule,
    ProfileModule
  ],
  providers: [
    { provide: APP_INITIALIZER, useFactory: initPortfolio, deps: [ProfileService], multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
