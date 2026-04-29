import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LearnService, QuizCategory, QuizPayload, QuizQuestion } from '../../services/learn.service';

interface QuizAnswer {
  questionId: string;
  pickedChoice: string;
  correct: boolean;
}

@Component({
  standalone: false,
  selector: 'learn-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss']
})
export class QuizComponent implements OnInit, OnDestroy {
  intro: QuizPayload['intro'] = { title: '', tagline: '', body: '' };
  categories: QuizCategory[] = [];
  allQuestions: QuizQuestion[] = [];

  // selection
  view: 'select' | 'play' | 'result' = 'select';
  selectedCategory: string = 'mixed';
  questions: QuizQuestion[] = [];
  index = 0;
  answers: QuizAnswer[] = [];
  picked: string | null = null;
  revealed = false;

  private sub?: Subscription;

  constructor(private learn: LearnService, private router: Router) {}

  ngOnInit() {
    this.sub = this.learn.loadQuiz().subscribe(p => {
      this.intro = p.intro;
      this.categories = p.categories;
      this.allQuestions = p.questions;
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  // ─── Setup ────────────────────────────────────────────────
  countFor(catId: string): number {
    if (catId === 'mixed') return this.allQuestions.length;
    return this.allQuestions.filter(q => q.category === catId).length;
  }

  start(catId: string) {
    this.selectedCategory = catId;
    const pool = catId === 'mixed'
      ? [...this.allQuestions]
      : this.allQuestions.filter(q => q.category === catId);
    this.questions = this.shuffle(pool).slice(0, Math.min(10, pool.length));
    this.index = 0;
    this.answers = [];
    this.picked = null;
    this.revealed = false;
    this.view = 'play';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Play ─────────────────────────────────────────────────
  current(): QuizQuestion | undefined {
    return this.questions[this.index];
  }

  pick(choiceId: string) {
    if (this.revealed) return;
    this.picked = choiceId;
  }

  submit() {
    const q = this.current();
    if (!q || !this.picked) return;
    this.revealed = true;
    this.answers.push({
      questionId: q.id,
      pickedChoice: this.picked,
      correct: this.picked === q.answer
    });
  }

  next() {
    if (this.index < this.questions.length - 1) {
      this.index++;
      this.picked = null;
      this.revealed = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.view = 'result';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  isCorrectChoice(choiceId: string): boolean {
    const q = this.current();
    return !!q && this.revealed && choiceId === q.answer;
  }

  isWrongChoice(choiceId: string): boolean {
    const q = this.current();
    return !!q && this.revealed && this.picked === choiceId && this.picked !== q.answer;
  }

  goToSection(q: QuizQuestion, ev?: MouseEvent) {
    ev?.stopPropagation();
    if (!q.branch) return;
    if (q.section) {
      this.router.navigate(['/learn', q.branch], { fragment: 'section-' + q.section });
    } else {
      this.router.navigate(['/learn', q.branch]);
    }
  }

  // ─── Result ───────────────────────────────────────────────
  score(): number { return this.answers.filter(a => a.correct).length; }
  scorePct(): number { return this.questions.length === 0 ? 0 : Math.round(100 * this.score() / this.questions.length); }

  scoreLabel(): string {
    const p = this.scorePct();
    if (p >= 90) return 'Crushing it';
    if (p >= 70) return 'Strong baseline';
    if (p >= 50) return 'On the curve';
    return 'Plenty to read';
  }

  wrongQuestions(): QuizQuestion[] {
    const wrongIds = new Set(this.answers.filter(a => !a.correct).map(a => a.questionId));
    return this.questions.filter(q => wrongIds.has(q.id));
  }

  catLabel(id: string): string {
    return this.categories.find(c => c.id === id)?.label ?? id;
  }

  retry() {
    this.start(this.selectedCategory);
  }

  back() {
    this.view = 'select';
    this.questions = [];
    this.answers = [];
  }

  // ─── helpers ──────────────────────────────────────────────
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
