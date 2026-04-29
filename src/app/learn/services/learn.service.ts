import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';

export interface LearnLink {
  label: string;
  url: string;
}

export interface LearnCodeBlock {
  language: string;
  title?: string;
  code: string;
  note?: string;
}

export type LearnWidget =
  | 'kinematics' | 'pinhole' | 'diffdrive' | 'astar'
  | 'pid' | 'kalman' | 'particle'
  | 'occupancy' | 'rrt' | 'gait' | 'boids'
  | 'ik' | 'costmap' | 'convolution' | 'qlearning' | 'rotation3d'
  | 'frenet' | 'mixer' | 'bayes' | 'linalg'
  | 'mpc-horizon' | 'workspace-cloud' | 'rt-jitter' | 'optical-flow' | 'rl-curve'
  | 'pure-pursuit' | 'icp' | 'manipulability' | 'force-closure' | 'cascade-pid'
  | 'stereo-disparity' | 'loop-closure' | 'ros-pubsub' | 'behavior-tree' | 'tf-tree'
  | null;

export interface LearnSection {
  id: string;
  heading: string;
  body?: string;
  bullets?: string[];
  codeBlocks?: LearnCodeBlock[];
  links?: LearnLink[];
  widget?: LearnWidget;
}

export interface LearnHero {
  tagline: string;
  intro: string;
}

/**
 * Branch classification for the home + sidebar grouping.
 *  - 'setup'     → foundational onboarding (Setup, Foundations). Rendered as wide cards in "Get Started".
 *  - 'technical' → canonical academic branch (Mechanical, Perception, CV, Control, AI/ML, HRI). Rendered in "Technical Branches".
 *  - 'applied'   → application of multiple technical branches (Manipulation, Navigation, AMR, AV, Drones, Multi-Robot, Compute).
 *  - 'branch'    → legacy alias for 'applied'; kept for back-compat.
 */
export type LearnBranchKind = 'setup' | 'technical' | 'applied' | 'branch';

/** Lightweight section reference exposed in the index for sub-nav teaser. */
export interface LearnSectionRef {
  id: string;
  heading: string;
}

/** Metadata-only branch (from index.json) - sections lazy-loaded on demand. */
export interface LearnBranchMeta {
  slug: string;
  kind?: LearnBranchKind;
  title: string;
  shortName: string;
  icon: string;
  color: string;
  accent: string;
  description: string;
  hero: LearnHero;
  sectionTitles: LearnSectionRef[];
}

/** Full branch with sections (loaded on demand). */
export interface LearnBranch extends LearnBranchMeta {
  sections: LearnSection[];
}

export interface LearnIndex {
  intro: { title: string; tagline: string; body: string };
  branches: LearnBranchMeta[];
}

// ─── Vocabulary ──────────────────────────────────────────────
export interface VocabCategory { id: string; label: string; accent: string; }
export interface VocabTerm {
  term: string;
  category: string;
  short: string;
  long: string;
  branch?: string;
  section?: string;
}
export interface VocabPayload {
  intro: { title: string; tagline: string; body: string };
  categories: VocabCategory[];
  terms: VocabTerm[];
}

// ─── Quiz ────────────────────────────────────────────────────
export interface QuizCategory {
  id: string;
  label: string;
  icon: string;
  accent: string;
  description: string;
}
export interface QuizChoice { id: string; text: string; }
export interface QuizQuestion {
  id: string;
  category: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  prompt: string;
  choices: QuizChoice[];
  answer: string;
  explanation: string;
  branch?: string;
  section?: string;
}
export interface QuizPayload {
  intro: { title: string; tagline: string; body: string };
  categories: QuizCategory[];
  questions: QuizQuestion[];
}

// ─── Learning paths ─────────────────────────────────────────
export interface PathStop {
  branch: string;
  section: string;
  label: string;
}
export interface PathModule {
  level: 'beginner' | 'intermediate' | 'advanced';
  label: string;
  summary: string;
  stops: PathStop[];
}
export interface LearningPath {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  accent: string;
  audience: string;
  duration: string;
  modules: PathModule[];
}
export interface PathsPayload {
  intro: { title: string; tagline: string; body: string };
  paths: LearningPath[];
}

@Injectable({ providedIn: 'root' })
export class LearnService {
  private index$?: Observable<LearnIndex>;
  private branchCache = new Map<string, Observable<LearnBranch>>();
  private vocab$?: Observable<VocabPayload>;
  private quiz$?: Observable<QuizPayload>;
  private paths$?: Observable<PathsPayload>;

  constructor(private http: HttpClient) {}

  loadVocabulary(): Observable<VocabPayload> {
    if (!this.vocab$) {
      this.vocab$ = this.http.get<VocabPayload>('assets/data/learn/vocabulary.json').pipe(
        catchError(err => {
          console.error('Failed to load learn/vocabulary.json:', err);
          return of<VocabPayload>({ intro: { title: '', tagline: '', body: '' }, categories: [], terms: [] });
        }),
        shareReplay(1)
      );
    }
    return this.vocab$;
  }

  loadQuiz(): Observable<QuizPayload> {
    if (!this.quiz$) {
      this.quiz$ = this.http.get<QuizPayload>('assets/data/learn/quiz.json').pipe(
        catchError(err => {
          console.error('Failed to load learn/quiz.json:', err);
          return of<QuizPayload>({ intro: { title: '', tagline: '', body: '' }, categories: [], questions: [] });
        }),
        shareReplay(1)
      );
    }
    return this.quiz$;
  }

  loadPaths(): Observable<PathsPayload> {
    if (!this.paths$) {
      this.paths$ = this.http.get<PathsPayload>('assets/data/learn/paths.json').pipe(
        catchError(err => {
          console.error('Failed to load learn/paths.json:', err);
          return of<PathsPayload>({ intro: { title: '', tagline: '', body: '' }, paths: [] });
        }),
        shareReplay(1)
      );
    }
    return this.paths$;
  }

  /** Loads the index (intro + branch metadata only). Cached. */
  loadIndex(): Observable<LearnIndex> {
    if (!this.index$) {
      this.index$ = this.http.get<LearnIndex>('assets/data/learn/index.json').pipe(
        catchError(err => {
          console.error('Failed to load learn/index.json:', err);
          return of<LearnIndex>({
            intro: { title: '', tagline: '', body: '' },
            branches: []
          });
        }),
        shareReplay(1)
      );
    }
    return this.index$;
  }

  /** Returns just the branch metadata array. */
  branches(): Observable<LearnBranchMeta[]> {
    return this.loadIndex().pipe(map(d => d.branches));
  }

  /** Lazy-loads a single branch (sections + hero). Cached per slug. */
  branch(slug: string): Observable<LearnBranch | undefined> {
    if (!slug) return of(undefined);
    if (!this.branchCache.has(slug)) {
      const stream = this.loadIndex().pipe(
        switchMap(idx => {
          const meta = idx.branches.find(b => b.slug === slug);
          if (!meta) return of(undefined);
          return this.http.get<{ slug: string; hero: LearnHero; sections: LearnSection[] }>(
            `assets/data/learn/${slug}.json`
          ).pipe(
            map(payload => ({ ...meta, sections: payload.sections } as LearnBranch)),
            catchError(err => {
              console.error(`Failed to load learn/${slug}.json:`, err);
              return of(undefined);
            })
          );
        }),
        shareReplay(1)
      );
      this.branchCache.set(slug, stream as Observable<LearnBranch>);
    }
    return this.branchCache.get(slug)!;
  }

  /** Eagerly preload a branch (e.g. on hover) to warm the cache. */
  prefetch(slug: string): void {
    this.branch(slug).subscribe();
  }

  // ── Backward-compat alias ─────────────────────────────────────
  /** @deprecated Use loadIndex() */
  load() { return this.loadIndex(); }
}
