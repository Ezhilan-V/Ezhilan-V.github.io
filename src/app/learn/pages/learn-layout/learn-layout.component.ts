import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LearnBranchMeta, LearnService } from '../../services/learn.service';
import { WorkspaceService } from '../../services/workspace.service';

const SECTION_OFFSET_TOP = 180;
const SCROLL_TO_OFFSET   = 140;

@Component({
  standalone: false,
  selector: 'learn-layout',
  templateUrl: './learn-layout.component.html',
  styleUrls: ['./learn-layout.component.scss']
})
export class LearnLayoutComponent implements OnInit, OnDestroy {
  branches: LearnBranchMeta[] = [];
  setup: LearnBranchMeta[] = [];
  technical: LearnBranchMeta[] = [];
  applied: LearnBranchMeta[] = [];
  /** @deprecated kept for the mobile tab strip; alias of technical + applied */
  fields: LearnBranchMeta[] = [];
  wsName = '';
  wsFocused = false;

  activeBranchSlug = '';
  activeSectionId = '';

  private subs: Subscription[] = [];
  private scrollFrame?: number;
  private settleTimer?: any;

  constructor(
    private learn: LearnService,
    private ws: WorkspaceService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subs.push(this.learn.branches().subscribe(all => {
      this.branches  = all;
      this.setup     = all.filter(b => b.kind === 'setup');
      this.technical = all.filter(b => b.kind === 'technical');
      this.applied   = all.filter(b => b.kind === 'applied' || b.kind === 'branch');
      this.fields    = [...this.technical, ...this.applied];
    }));
    this.wsName = this.ws.current;

    this.subs.push(this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => this.onRouteChange(e.urlAfterRedirects ?? e.url)));
    this.onRouteChange(this.router.url);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    if (this.settleTimer) clearTimeout(this.settleTimer);
  }

  // ─── route + scroll-spy ─────────────────────────────────────

  private onRouteChange(url: string) {
    const match = url.match(/^\/learn\/([^/?#]+)/);
    this.activeBranchSlug = match ? match[1] : '';
    this.activeSectionId = '';
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.recomputeActiveSection(), 80);
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = requestAnimationFrame(() => this.recomputeActiveSection());
  }

  private recomputeActiveSection() {
    if (!this.activeBranchSlug) {
      if (this.activeSectionId) this.activeSectionId = '';
      return;
    }
    const sections = document.querySelectorAll<HTMLElement>('[id^="section-"]');
    if (!sections.length) return;
    let next = '';
    for (const el of Array.from(sections)) {
      const top = el.getBoundingClientRect().top;
      if (top <= SECTION_OFFSET_TOP) next = el.id.replace(/^section-/, '');
      else break;
    }
    if (!next) next = sections[0].id.replace(/^section-/, '');
    if (next !== this.activeSectionId) this.activeSectionId = next;
  }

  // ─── click handlers ─────────────────────────────────────────

  isActiveBranch(slug: string) { return slug === this.activeBranchSlug; }

  goToSection(branchSlug: string, sectionId: string, ev?: MouseEvent) {
    ev?.preventDefault();
    if (this.activeBranchSlug !== branchSlug) {
      this.router.navigate(['/learn', branchSlug]).then(() => {
        setTimeout(() => this.scrollToSection(sectionId), 120);
      });
      return;
    }
    this.scrollToSection(sectionId);
  }

  private scrollToSection(sectionId: string) {
    const el = document.getElementById('section-' + sectionId);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - SCROLL_TO_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
    this.activeSectionId = sectionId;
  }

  // ─── workspace ──────────────────────────────────────────────

  onWsCommit() {
    this.ws.set(this.wsName);
    this.wsName = this.ws.current;
  }

  onWsKeyup(ev: KeyboardEvent) {
    if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
  }
}
