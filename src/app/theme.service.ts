import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private darkMode = new BehaviorSubject<boolean>(false);
  private userPreference: 'light' | 'dark' | 'system' = 'system';
  isDarkMode$ = this.darkMode.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    
    // Check local storage for user preference
    const savedPreference = localStorage.getItem('theme-preference');
    if (savedPreference) {
      this.userPreference = savedPreference as 'light' | 'dark' | 'system';
    }

    // Initial theme setup
    this.setInitialTheme();

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (this.userPreference === 'system') {
          this.setTheme(e.matches);
        }
      });
  }

  private setInitialTheme() {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    switch (this.userPreference) {
      case 'light':
        this.setTheme(false);
        break;
      case 'dark':
        this.setTheme(true);
        break;
      case 'system':
      default:
        this.setTheme(systemPrefersDark);
        break;
    }
  }

  setTheme(isDark: boolean) {
    this.darkMode.next(isDark);
    
    // Update document classes
    if (isDark) {
      this.renderer.addClass(document.body, 'dark-theme');
      this.renderer.removeClass(document.body, 'light-theme');
      // Set color-scheme using setAttribute instead
      this.renderer.setAttribute(document.documentElement, 'style', '--color-scheme: dark');
    } else {
      this.renderer.addClass(document.body, 'light-theme');
      this.renderer.removeClass(document.body, 'dark-theme');
      // Set color-scheme using setAttribute instead
      this.renderer.setAttribute(document.documentElement, 'style', '--color-scheme: light');
    }
    
    // Update CSS variables
    const root = document.documentElement;
    if (isDark) {
      root.style.setProperty('--background-main', '#1a1f2e');
      root.style.setProperty('--background-card', '#242838');
      root.style.setProperty('--text-primary', '#e2e8f0');
      root.style.setProperty('--text-secondary', '#cbd5e0');
      root.style.setProperty('--text-light', '#a0aec0');
      root.style.setProperty('--border-color', '#2d3748');
      root.style.setProperty('--primary-color', '#3d5a8c');
      root.style.setProperty('--primary-light', '#647d8f');
      root.style.setProperty('--primary-dark', '#1f3251');
      root.style.setProperty('--accent-color', '#00b4f5');
      root.style.setProperty('--background-dark', '#2f3446');
    } else {
      root.style.setProperty('--background-main', '#F0F2F5');
      root.style.setProperty('--background-card', '#FFFFFF');
      root.style.setProperty('--text-primary', '#2D3748');
      root.style.setProperty('--text-secondary', '#4A5568');
      root.style.setProperty('--text-light', '#718096');
      root.style.setProperty('--border-color', '#E2E8F0');
      root.style.setProperty('--primary-color', '#2C4875');
      root.style.setProperty('--primary-light', '#546A7B');
      root.style.setProperty('--primary-dark', '#1A2A44');
      root.style.setProperty('--accent-color', '#0095CC');
      root.style.setProperty('--background-dark', '#E8ECEF');
    }
  }

  setUserPreference(preference: 'light' | 'dark' | 'system') {
    this.userPreference = preference;
    localStorage.setItem('theme-preference', preference);
    
    if (preference === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(systemPrefersDark);
    } else {
      this.setTheme(preference === 'dark');
    }
  }

  getCurrentTheme(): 'light' | 'dark' | 'system' {
    return this.userPreference;
  }

  isDarkThemeActive(): boolean {
    return this.darkMode.value;
  }
}