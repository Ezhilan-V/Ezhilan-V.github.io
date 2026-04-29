import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LearnService, LearningPath, PathStop, PathsPayload } from '../../services/learn.service';

@Component({
  standalone: false,
  selector: 'learn-paths',
  templateUrl: './paths.component.html',
  styleUrls: ['./paths.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PathsComponent implements OnInit {
  intro: PathsPayload['intro'] = { title: '', tagline: '', body: '' };
  paths: LearningPath[] = [];
  activePathId = '';

  private destroyRef = inject(DestroyRef);

  constructor(private learn: LearnService, private router: Router, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.learn.loadPaths()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(p => {
        this.intro = p.intro;
        this.paths = p.paths;
        if (this.paths.length && !this.activePathId) this.activePathId = this.paths[0].id;
        this.cd.markForCheck();
      });
  }

  active(): LearningPath | undefined {
    return this.paths.find(p => p.id === this.activePathId);
  }

  setActive(id: string) {
    this.activePathId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToStop(stop: PathStop, ev?: MouseEvent) {
    ev?.preventDefault();
    if (stop.section) {
      this.router.navigate(['/learn', stop.branch], { fragment: 'section-' + stop.section });
    } else {
      this.router.navigate(['/learn', stop.branch]);
    }
  }

  onPathBranchSelect(slug: string) {
    this.router.navigate(['/learn', slug]);
  }

  totalStops(p: LearningPath): number {
    return p.modules.reduce((s, m) => s + m.stops.length, 0);
  }

  levelClass(level: string): string { return 'is-' + level; }
}
