import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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

    meta!: PortfolioMeta;
    initials = 'EV';

    private mq?: MediaQueryList;
    private mqListener?: (e: MediaQueryListEvent) => void;

    navLinks = [
        { label: 'About',      id: 'about' },
        { label: 'Skills',     id: 'skills' },
        { label: 'Experience', id: 'experience' },
        { label: 'Education',  id: 'education' },
        { label: 'Projects',   id: 'projects-section' },
        { label: 'Contact',    id: 'contact' },
    ];

    constructor(private profileService: ProfileService) {}

    ngOnInit() {
        this.meta = this.profileService.meta;
        this.initials = this.meta.name
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase();

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
    }

    ngOnDestroy() {
        if (this.mq && this.mqListener) {
            this.mq.removeEventListener('change', this.mqListener);
        }
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

    toggleMobileMenu() { this.mobileMenuOpen = !this.mobileMenuOpen; }
}
