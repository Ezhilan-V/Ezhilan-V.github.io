import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LearnBranchMeta, LearnIndex, LearnService } from '../../services/learn.service';

@Component({
  standalone: false,
  selector: 'learn-home',
  templateUrl: './learn-home.component.html',
  styleUrls: ['./learn-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearnHomeComponent implements OnInit {
  intro: LearnIndex['intro'] = { title: '', tagline: '', body: '' };
  setup: LearnBranchMeta[] = [];
  technical: LearnBranchMeta[] = [];
  applied: LearnBranchMeta[] = [];

  private destroyRef = inject(DestroyRef);

  constructor(private learn: LearnService, private router: Router, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.learn.loadIndex()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(d => {
        this.intro = d.intro;
        this.setup     = d.branches.filter(b => b.kind === 'setup');
        this.technical = d.branches.filter(b => b.kind === 'technical');
        this.applied   = d.branches.filter(b => b.kind === 'applied' || b.kind === 'branch');
        this.cd.markForCheck();
      });
  }

  goTo(slug: string) {
    this.router.navigate(['/learn', slug]);
  }

  trackBranch = (_: number, b: LearnBranchMeta) => b.slug;
}
