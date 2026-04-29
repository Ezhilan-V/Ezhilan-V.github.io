import { Injectable, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Routes, RouterModule, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { NotFoundComponent } from './shared/not-found/not-found.component';

const SITE = 'Ezhilan Veluchami';

const routes: Routes = [
  { path: '', component: ProfileComponent, pathMatch: 'full', title: 'Robotics Engineer' },
  {
    path: 'learn',
    loadChildren: () => import('./learn/learn.module').then(m => m.LearnModule),
    title: 'Learn Robotics'
  },
  { path: '**', component: NotFoundComponent, title: 'Page not found' }
];

@Injectable({ providedIn: 'root' })
export class PortfolioTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) { super(); }
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const t = this.buildTitle(snapshot);
    this.title.setTitle(t ? `${t} · ${SITE}` : `${SITE} — Robotics Engineer`);
  }
}

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled',
      scrollOffset: [0, 80]
    })
  ],
  exports: [RouterModule],
  providers: [{ provide: TitleStrategy, useClass: PortfolioTitleStrategy }]
})
export class AppRoutingModule { }
