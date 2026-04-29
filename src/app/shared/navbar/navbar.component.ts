import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ProfileService, PortfolioMeta } from '../../profile/profile.service';

const SCROLL_THRESHOLD = 50;
const ACTIVE_SECTION_OFFSET = 100;
const NAV_HEIGHT = 64;

@Component({
    standalone: false,
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
    isScrolled = false;
    mobileMenuOpen = false;
    activeSection = '';
    scrollProgress = 0;
    isDark = true;
    isHomeRoute = true;

    meta!: PortfolioMeta;
    initials = 'EZ';

    private mq?: MediaQueryList;
    private mqListener?: (e: MediaQueryListEvent) => void;
    private routeSub?: Subscription;

    navLinks = [
        { label: 'About',      id: 'about' },
        { label: 'Skills',     id: 'skills' },
        { label: 'Experience', id: 'experience' },
        { label: 'Education',  id: 'education' },
        { label: 'Projects',   id: 'projects-section' },
        { label: 'Contact',    id: 'contact' },
    ];

    constructor(private profileService: ProfileService, private router: Router) {}

    ngOnInit() {
        this.meta = this.profileService.meta;
        this.initials = (this.meta.name.split(' ')[0] || 'EZ').slice(0, 2).toUpperCase();

        const saved = localStorage.getItem('portfolio-theme');
        this.isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.applyTheme();

        this.mq = window.matchMedia('(prefers-color-scheme: dark)');
        this.mqListener = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('portfolio-theme')) {
                this.isDark = e.matches;
                this.applyTheme();
            }
        };
        this.mq.addEventListener('change', this.mqListener);

        this.isHomeRoute = this.router.url === '/' || this.router.url.startsWith('/?') || this.router.url.startsWith('/#');
        this.routeSub = this.router.events.pipe(
            filter(e => e instanceof NavigationEnd)
        ).subscribe((e: any) => {
            const url: string = e.urlAfterRedirects ?? e.url;
            this.isHomeRoute = url === '/' || url.startsWith('/?') || url.startsWith('/#');
        });
    }

    ngOnDestroy() {
        if (this.mq && this.mqListener) {
            this.mq.removeEventListener('change', this.mqListener);
        }
        this.routeSub?.unsubscribe();
    }

    toggleTheme() {
        this.isDark = !this.isDark;
        localStorage.setItem('portfolio-theme', this.isDark ? 'dark' : 'light');
        this.applyTheme();
    }

    private applyTheme() {
        document.documentElement.classList.toggle('light-theme', !this.isDark);
    }

    get navBg(): string {
        if (this.isScrolled) {
            return this.isDark
                ? 'bg-[#080b14]/95 backdrop-blur-md border-b border-white/[0.07] shadow-lg shadow-black/50'
                : 'bg-white/95 backdrop-blur-md border-b border-black/[0.07] shadow-md';
        }
        return this.isDark ? 'bg-transparent' : 'bg-white/80 backdrop-blur-sm';
    }

    @HostListener('window:scroll')
    onScroll() {
        this.isScrolled = window.scrollY > SCROLL_THRESHOLD;
        this.updateActiveSection();
        const total = document.documentElement.scrollHeight - window.innerHeight;
        this.scrollProgress = total > 0 ? (window.scrollY / total) * 100 : 0;
    }

    private updateActiveSection() {
        const scrollPos = window.scrollY + ACTIVE_SECTION_OFFSET;
        let current = '';
        for (const link of this.navLinks) {
            const el = document.getElementById(link.id);
            if (el && el.offsetTop <= scrollPos) current = link.id;
        }
        this.activeSection = current;
    }

    scrollToSection(id: string) {
        if (!this.isHomeRoute) {
            const fragment = id === 'top' ? undefined : id;
            this.router.navigate(['/'], { fragment });
            this.mobileMenuOpen = false;
            return;
        }
        if (id === 'top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const el = document.getElementById(id);
            if (el) {
                window.scrollTo({
                    top: el.getBoundingClientRect().top + window.pageYOffset - NAV_HEIGHT,
                    behavior: 'smooth'
                });
            }
        }
        this.mobileMenuOpen = false;
    }

    closeMobileMenu() { this.mobileMenuOpen = false; }

    toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
}
