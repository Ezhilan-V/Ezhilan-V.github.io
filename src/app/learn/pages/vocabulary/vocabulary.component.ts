import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LearnService, VocabCategory, VocabPayload, VocabTerm } from '../../services/learn.service';

interface VocabSection { letter: string; terms: VocabTerm[]; }

@Component({
  standalone: false,
  selector: 'learn-vocabulary',
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VocabularyComponent implements OnInit, OnDestroy {
  intro: VocabPayload['intro'] = { title: '', tagline: '', body: '' };
  categories: VocabCategory[] = [];
  terms: VocabTerm[] = [];

  query = '';
  activeCategory = 'all';
  expanded = new Set<string>();

  /** Cached filtered view — recomputed only when query/category/terms change. */
  sections: VocabSection[] = [];
  totalShown = 0;

  private catLabelMap = new Map<string, string>();
  private catAccentMap = new Map<string, string>();
  private sub?: Subscription;

  constructor(private learn: LearnService, private router: Router, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.sub = this.learn.loadVocabulary().subscribe(payload => {
      this.intro = payload.intro;
      this.categories = payload.categories;
      this.terms = [...payload.terms].sort((a, b) => a.term.localeCompare(b.term));
      this.catLabelMap = new Map(payload.categories.map(c => [c.id, c.label]));
      this.catAccentMap = new Map(payload.categories.map(c => [c.id, c.accent]));
      this.recompute();
      this.cd.markForCheck();
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  setQuery(q: string) {
    this.query = q;
    this.recompute();
  }

  setCategory(id: string) {
    this.activeCategory = id;
    this.recompute();
  }

  toggle(term: string) {
    if (this.expanded.has(term)) this.expanded.delete(term);
    else this.expanded.add(term);
  }

  isExpanded(term: string) { return this.expanded.has(term); }

  catLabel(id?: string): string {
    if (!id) return '';
    return this.catLabelMap.get(id) ?? id;
  }

  catAccent(id?: string): string {
    if (!id) return '#94a3b8';
    return this.catAccentMap.get(id) ?? '#94a3b8';
  }

  branchTitle(slug?: string): string {
    if (!slug) return '';
    return slug.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
  }

  goToSection(t: VocabTerm, ev: MouseEvent) {
    ev.stopPropagation();
    if (!t.branch) return;
    if (t.section) {
      this.router.navigate(['/learn', t.branch], { fragment: 'section-' + t.section });
    } else {
      this.router.navigate(['/learn', t.branch]);
    }
  }

  resetFilters() {
    this.query = '';
    this.activeCategory = 'all';
    this.recompute();
  }

  trackSection = (_: number, s: VocabSection) => s.letter;
  trackTerm    = (_: number, t: VocabTerm)    => t.term;
  trackCat     = (_: number, c: VocabCategory) => c.id;

  private recompute() {
    const q = this.query.trim().toLowerCase();
    const cat = this.activeCategory;

    const matched: VocabTerm[] = [];
    for (const t of this.terms) {
      if (cat !== 'all' && t.category !== cat) continue;
      if (q) {
        const hay = t.term.toLowerCase();
        if (
          !hay.includes(q) &&
          !t.short.toLowerCase().includes(q) &&
          !t.long.toLowerCase().includes(q)
        ) continue;
      }
      matched.push(t);
    }

    const map = new Map<string, VocabTerm[]>();
    for (const t of matched) {
      const c = (t.term[0] ?? '#').toUpperCase();
      const k = /[A-Z]/.test(c) ? c : '#';
      const list = map.get(k);
      if (list) list.push(t);
      else map.set(k, [t]);
    }

    this.sections = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, list]) => ({ letter, terms: list }));
    this.totalShown = matched.length;
  }
}
