import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ProfileService, PortfolioMeta, PortfolioStat, SkillCategory } from './profile.service';

interface Stat extends PortfolioStat {
  display: number;
}

const TYPEWRITER_DELAYS = { type: 75, delete: 35, pause: 2400, start: 900 } as const;
const STAT_ANIMATION_STEPS = 60;
const STAT_ANIMATION_DURATION = 1400;
const STATS_OBSERVER_DELAY = 500;

@Component({
  standalone: false,
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ResumeComponent implements OnInit, OnDestroy {
  meta!: PortfolioMeta;
  about = '';
  skillCategories: SkillCategory[] = [];

  roles: string[] = [];
  displayRole = '';
  private roleIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private typeTimer: ReturnType<typeof setTimeout> | null = null;

  stats: Stat[] = [];
  private statsAnimated = false;
  private statsObserver?: IntersectionObserver;
  private animationIntervals: ReturnType<typeof setInterval>[] = [];

  constructor(private profileService: ProfileService, private ngZone: NgZone) {
    this.meta = this.profileService.meta;
    this.about = this.profileService.about;
    this.skillCategories = this.profileService.skills;
    this.roles = this.profileService.hero.roles;
    this.stats = this.profileService.hero.stats.map(s => ({ ...s, display: 0 }));
  }

  ngOnInit() {
    document.body.classList.add('profile-page');

    this.typeTimer = setTimeout(() => this.tick(), TYPEWRITER_DELAYS.start);

    const initObserver = setTimeout(() => {
      const el = document.getElementById('hero-stats');
      if (el) {
        this.statsObserver = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && !this.statsAnimated) {
            this.statsAnimated = true;
            this.ngZone.run(() => this.animateStats());
          }
        }, { threshold: 0.4 });
        this.statsObserver.observe(el);
      }
    }, STATS_OBSERVER_DELAY);

    // Track so we can clear if destroyed before it fires
    this.animationIntervals.push(initObserver as any);
  }

  ngOnDestroy() {
    if (this.typeTimer !== null) clearTimeout(this.typeTimer);
    this.animationIntervals.forEach(id => clearInterval(id));
    this.animationIntervals = [];
    this.statsObserver?.disconnect();
    document.body.classList.remove('profile-page');
  }

  private tick() {
    const current = this.roles[this.roleIndex];
    if (!this.isDeleting) {
      this.displayRole = current.slice(0, ++this.charIndex);
      if (this.charIndex === current.length) {
        this.isDeleting = true;
        this.typeTimer = setTimeout(() => this.tick(), TYPEWRITER_DELAYS.pause);
        return;
      }
    } else {
      this.displayRole = current.slice(0, --this.charIndex);
      if (this.charIndex === 0) {
        this.isDeleting = false;
        this.roleIndex = (this.roleIndex + 1) % this.roles.length;
      }
    }
    this.typeTimer = setTimeout(
      () => this.tick(),
      this.isDeleting ? TYPEWRITER_DELAYS.delete : TYPEWRITER_DELAYS.type
    );
  }

  private animateStats() {
    this.stats.forEach(stat => {
      let step = 0;
      const iv = setInterval(() => {
        step++;
        const t = this.easeOut(step / STAT_ANIMATION_STEPS);
        const v = stat.target * t;
        stat.display = stat.decimal ? parseFloat(v.toFixed(stat.decimal)) : Math.floor(v);
        if (step >= STAT_ANIMATION_STEPS) {
          stat.display = stat.target;
          clearInterval(iv);
          this.animationIntervals = this.animationIntervals.filter(i => i !== iv);
        }
      }, STAT_ANIMATION_DURATION / STAT_ANIMATION_STEPS);
      this.animationIntervals.push(iv);
    });
  }

  formatStat(s: Stat): string {
    return s.decimal ? s.display.toFixed(s.decimal) : String(s.display);
  }

  private easeOut(t: number): number { return 1 - Math.pow(1 - t, 3); }
}
