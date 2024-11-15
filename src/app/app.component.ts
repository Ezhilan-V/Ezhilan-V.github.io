import { Component, OnInit, Renderer2, } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
    selector: 'app-root',
    template: `
    <div [class.dark-theme]="isDark" [class.light-theme]="!isDark">
        <app-navbar></app-navbar>
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent implements OnInit {
    // isDarkMode = false;

    constructor(
        private themeService: ThemeService,
        private renderer: Renderer2
    ) { }
    isDark = false;
    ngOnInit() {
        this.themeService.isDarkMode$.subscribe(isDark => {
            this.isDark = isDark;
        });
    }
}