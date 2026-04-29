import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef,
  ElementRef, HostListener, inject, OnInit, ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { LearnService } from '../../services/learn.service';

interface SearchItem {
  kind: 'branch' | 'section' | 'term' | 'quiz' | 'path' | 'tool';
  title: string;
  subtitle: string;
  hay: string;          // pre-lowercased searchable text
  route: string[];      // router-link
  fragment?: string;
  accent: string;
  icon: string;
}

@Component({
  standalone: false,
  selector: 'learn-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearnSearchBarComponent implements OnInit {
  @ViewChild('input', { static: false }) input?: ElementRef<HTMLInputElement>;

  query = '';
  open = false;
  results: SearchItem[] = [];
  selectedIndex = 0;

  private allItems: SearchItem[] = [];
  private destroyRef = inject(DestroyRef);

  constructor(
    private learn: LearnService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    // Pull every searchable source in parallel and flatten into one index.
    combineLatest([
      this.learn.loadIndex(),
      this.learn.loadVocabulary(),
      this.learn.loadQuiz(),
      this.learn.loadPaths()
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([idx, vocab, quiz, paths]) => {
        const items: SearchItem[] = [];

        // Built-in tools
        items.push({
          kind: 'tool', title: 'Learning paths',
          subtitle: 'sequenced beginner → advanced modules',
          hay: 'learning paths sequenced modules beginner intermediate advanced'.toLowerCase(),
          route: ['/learn/paths'], accent: '#34d399', icon: 'fa-route'
        });
        items.push({
          kind: 'tool', title: 'Vocabulary',
          subtitle: '125+ robotics terms defined plainly',
          hay: 'vocabulary glossary terms definitions',
          route: ['/learn/vocabulary'], accent: '#facc15', icon: 'fa-book-open'
        });
        items.push({
          kind: 'tool', title: 'Quiz / test your knowledge',
          subtitle: 'wrong answers deep-link to the explanation',
          hay: 'quiz test knowledge questions',
          route: ['/learn/quiz'], accent: '#fb7185', icon: 'fa-circle-question'
        });

        // Branches + sections
        for (const b of idx.branches || []) {
          items.push({
            kind: 'branch',
            title: b.title,
            subtitle: b.description || b.hero?.tagline || '',
            hay: `${b.title} ${b.shortName} ${b.description || ''} ${b.hero?.tagline || ''}`.toLowerCase(),
            route: ['/learn', b.slug],
            accent: b.accent,
            icon: b.icon
          });
          for (const s of b.sectionTitles || []) {
            items.push({
              kind: 'section',
              title: s.heading,
              subtitle: `${b.title} · section`,
              hay: `${s.heading} ${b.title}`.toLowerCase(),
              route: ['/learn', b.slug],
              fragment: 'section-' + s.id,
              accent: b.accent,
              icon: 'fa-bookmark'
            });
          }
        }

        // Vocabulary terms
        for (const t of vocab.terms || []) {
          items.push({
            kind: 'term',
            title: t.term,
            subtitle: t.short,
            hay: `${t.term} ${t.short} ${t.long || ''}`.toLowerCase(),
            route: t.branch ? ['/learn', t.branch] : ['/learn/vocabulary'],
            fragment: t.section ? 'section-' + t.section : undefined,
            accent: '#facc15',
            icon: 'fa-book-bookmark'
          });
        }

        // Quiz questions
        for (const q of quiz.questions || []) {
          items.push({
            kind: 'quiz',
            title: q.prompt,
            subtitle: `quiz · ${q.category}${q.level ? ' · ' + q.level : ''}`,
            hay: `${q.prompt} ${q.category} ${q.explanation || ''}`.toLowerCase(),
            route: ['/learn/quiz'],
            accent: '#fb7185',
            icon: 'fa-circle-question'
          });
        }

        // Learning paths + stops
        for (const p of paths.paths || []) {
          items.push({
            kind: 'path',
            title: p.title,
            subtitle: p.tagline,
            hay: `${p.title} ${p.tagline} ${p.audience || ''}`.toLowerCase(),
            route: ['/learn/paths'],
            accent: p.accent,
            icon: p.icon || 'fa-route'
          });
        }

        this.allItems = items;
        if (this.query) this.recompute();
        this.cd.markForCheck();
      });
  }

  // ─── input + key handling ─────────────────────────────
  setQuery(v: string) {
    this.query = v;
    this.open = !!v.trim();
    this.selectedIndex = 0;
    this.recompute();
  }

  clear() {
    this.query = '';
    this.open = false;
    this.results = [];
    this.cd.markForCheck();
  }

  focusInput() {
    setTimeout(() => this.input?.nativeElement.focus(), 0);
  }

  onFocus() {
    if (this.query.trim()) this.open = true;
    this.cd.markForCheck();
  }

  onKey(ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
      this.cd.markForCheck();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.cd.markForCheck();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const item = this.results[this.selectedIndex];
      if (item) this.go(item);
    } else if (ev.key === 'Escape') {
      this.clear();
      this.input?.nativeElement.blur();
    }
  }

  go(item: SearchItem) {
    this.clear();
    if (item.fragment) {
      this.router.navigate(item.route, { fragment: item.fragment });
    } else {
      this.router.navigate(item.route);
    }
  }

  // Close dropdown when clicking outside the host element
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.open) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.open = false;
      this.cd.markForCheck();
    }
  }

  // Global hotkey: '/' focuses the search bar (only outside form fields)
  @HostListener('document:keydown', ['$event'])
  onDocKey(ev: KeyboardEvent) {
    const tag = (ev.target as HTMLElement)?.tagName?.toLowerCase();
    if (ev.key === '/' && tag !== 'input' && tag !== 'textarea' && !ev.metaKey && !ev.ctrlKey) {
      ev.preventDefault();
      this.focusInput();
    }
  }

  private recompute() {
    const q = this.query.trim().toLowerCase();
    if (!q) { this.results = []; this.cd.markForCheck(); return; }

    // Score: exact title match > prefix match > substring on title > substring on hay
    const tokens = q.split(/\s+/).filter(t => t.length > 0);
    const scored: { item: SearchItem; score: number }[] = [];
    for (const item of this.allItems) {
      let score = 0;
      const titleLow = item.title.toLowerCase();
      if (titleLow === q) score += 1000;
      else if (titleLow.startsWith(q)) score += 400;
      else if (titleLow.includes(q)) score += 200;

      // All tokens must appear in hay or title
      let allTokensMatch = true;
      for (const tok of tokens) {
        if (!titleLow.includes(tok) && !item.hay.includes(tok)) {
          allTokensMatch = false;
          break;
        }
        score += titleLow.includes(tok) ? 50 : 10;
      }
      if (!allTokensMatch) continue;

      // Slight nudge to push tools / branches above sections
      const kindBonus: Record<SearchItem['kind'], number> = {
        tool: 30, branch: 20, path: 12, term: 8, section: 4, quiz: 2
      };
      score += kindBonus[item.kind];

      scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);
    this.results = scored.slice(0, 12).map(s => s.item);
    this.selectedIndex = 0;
    this.cd.markForCheck();
  }

  trackItem = (_: number, it: SearchItem) =>
    `${it.kind}|${it.route.join('/')}|${it.fragment || ''}|${it.title}`;
}
