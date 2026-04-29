import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { switchMap } from 'rxjs/operators';
import { LearnBranch, LearnService } from '../../services/learn.service';

@Component({
  standalone: false,
  selector: 'learn-branch-page',
  templateUrl: './branch-page.component.html',
  styleUrls: ['./branch-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BranchPageComponent implements OnInit {
  branch?: LearnBranch;
  loading = true;
  notFound = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learn: LearnService,
    private title: Title,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap(p => this.learn.branch(p.get('slug') ?? '')),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(b => {
        this.loading = false;
        this.branch = b;
        this.notFound = !b;
        if (b) this.title.setTitle(`${b.title} · Learn · Ezhilan Veluchami`);
        window.scrollTo({ top: 0, behavior: 'auto' });
        this.cd.markForCheck();
      });
  }

  scrollTo(id: string) {
    const el = document.getElementById('section-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
