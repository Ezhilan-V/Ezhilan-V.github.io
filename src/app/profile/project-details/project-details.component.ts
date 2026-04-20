import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Project } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-project-details',
  template: `
    <div class="dialog-wrap">

      <!-- Header -->
      <div class="dlg-header">
        <div class="dlg-title-block">
          <h2 class="dlg-title">{{ currentProject.title }}</h2>
          <div class="dlg-meta">
            <span class="meta-role">{{ currentProject.role }}</span>
            <span class="meta-sep" *ngIf="currentProject.timeline">·</span>
            <span class="meta-time" *ngIf="currentProject.timeline">{{ currentProject.timeline }}</span>
          </div>
        </div>
        <button class="dlg-close" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Scrollable content -->
      <mat-dialog-content class="dlg-body">

        <!-- Image carousel -->
        <div class="img-wrap" *ngIf="currentProject.imageUrls?.length">
          <img [src]="currentProject.imageUrls[currentImage]" [alt]="currentProject.title" class="dlg-img">
          <button class="img-nav prev" (click)="prevImage()" *ngIf="currentImage > 0">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button class="img-nav next" (click)="nextImage()" *ngIf="currentImage < currentProject.imageUrls.length - 1">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <div class="img-counter" *ngIf="currentProject.imageUrls.length > 1">
            {{ currentImage + 1 }} / {{ currentProject.imageUrls.length }}
          </div>
        </div>

        <!-- Description -->
        <div class="dlg-section">
          <h3 class="dlg-section-title">
            <mat-icon class="s-icon">description</mat-icon> Overview
          </h3>
          <p class="dlg-desc">{{ currentProject.description }}</p>
        </div>

        <!-- Technologies -->
        <div class="dlg-section" *ngIf="currentProject.technologies?.length">
          <h3 class="dlg-section-title">
            <mat-icon class="s-icon">code</mat-icon> Technologies
          </h3>
          <div class="tech-grid">
            <span class="tech-pill" *ngFor="let t of currentProject.technologies">{{ t }}</span>
          </div>
        </div>

        <!-- Highlights -->
        <div class="dlg-section" *ngIf="currentProject.highlights?.length">
          <h3 class="dlg-section-title">
            <mat-icon class="s-icon">emoji_events</mat-icon> Key Achievements
          </h3>
          <ul class="highlights">
            <li *ngFor="let h of currentProject.highlights">
              <span class="hl-dot"></span>{{ h }}
            </li>
          </ul>
        </div>

      </mat-dialog-content>

      <!-- Footer nav -->
      <div class="dlg-footer">
        <button class="nav-btn" (click)="navigate('prev')" [disabled]="!hasPrev">
          <mat-icon>arrow_back</mat-icon> Previous
        </button>
        <button class="nav-btn close-btn" (click)="dialogRef.close()">Close</button>
        <button class="nav-btn" (click)="navigate('next')" [disabled]="!hasNext">
          Next <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-wrap {
      display: flex;
      flex-direction: column;
      background: #0d1117;
      color: #f1f5f9;
      max-height: 90vh;
    }
    .dlg-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: #161b22;
    }
    .dlg-title { font-size: 1.2rem; font-weight: 700; color: #f1f5f9; margin: 0 0 6px; }
    .dlg-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .meta-role {
      font-size: 0.8rem; font-weight: 600; color: #38bdf8;
      background: rgba(14,165,233,0.12); padding: 2px 10px;
      border-radius: 12px; border: 1px solid rgba(14,165,233,0.25);
    }
    .meta-sep { color: #475569; font-size: 0.75rem; }
    .meta-time { font-size: 0.8rem; color: #64748b; }
    .dlg-close {
      background: transparent; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: #94a3b8; cursor: pointer; padding: 4px;
      display: flex; align-items: center; transition: all 0.2s; flex-shrink: 0;
      &:hover { background: rgba(255,255,255,0.06); color: #f1f5f9; }
    }
    .dlg-body {
      padding: 1.25rem 1.5rem !important;
      overflow-y: auto; flex: 1;
      max-height: calc(90vh - 140px);
    }
    .img-wrap {
      position: relative; border-radius: 12px; overflow: hidden;
      margin-bottom: 1.5rem; background: #161b22;
    }
    .dlg-img { width: 100%; height: 240px; object-fit: cover; display: block; }
    .img-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(0,0,0,0.6); border: none; border-radius: 50%; color: #fff;
      width: 36px; height: 36px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      &.prev { left: 8px; } &.next { right: 8px; }
      &:hover { background: rgba(14,165,233,0.7); }
    }
    .img-counter {
      position: absolute; bottom: 8px; right: 12px;
      background: rgba(0,0,0,0.6); color: #f1f5f9;
      font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;
    }
    .dlg-section { margin-bottom: 1.5rem; }
    .dlg-section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.85rem; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem;
    }
    .s-icon { font-size: 1rem !important; width: 1rem !important; height: 1rem !important; color: #38bdf8; }
    .dlg-desc { font-size: 0.9rem; color: #cbd5e1; line-height: 1.7; margin: 0; }
    .tech-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .tech-pill {
      font-size: 0.75rem; padding: 4px 12px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; color: #94a3b8;
    }
    .highlights { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .highlights li {
      display: flex; align-items: flex-start; gap: 10px;
      font-size: 0.875rem; color: #cbd5e1; line-height: 1.5;
    }
    .hl-dot {
      flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%;
      background: #38bdf8; margin-top: 7px;
    }
    .dlg-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); background: #161b22;
    }
    .nav-btn {
      display: flex; align-items: center; gap: 4px; padding: 6px 14px;
      background: transparent; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px; color: #94a3b8; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      &:hover:not(:disabled) { border-color: #38bdf8; color: #38bdf8; }
      &:disabled { opacity: 0.3; cursor: default; }
    }
    .close-btn {
      border-color: rgba(255,255,255,0.2); color: #f1f5f9;
      &:hover { border-color: #f1f5f9 !important; color: #f1f5f9 !important; }
    }
  `]
})
export class ProjectDetailsComponent {
  currentImage = 0;
  currentProjectIndex: number;
  allProjects: Project[];
  currentProject: Project;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      project: Project;
      allProjects: Project[];
      currentIndex: number;
    },
    public dialogRef: MatDialogRef<ProjectDetailsComponent>
  ) {
    this.allProjects = data.allProjects;
    this.currentProjectIndex = data.currentIndex;
    this.currentProject = data.project;
  }

  get hasPrev(): boolean { return this.currentProjectIndex > 0; }
  get hasNext(): boolean { return this.currentProjectIndex < this.allProjects.length - 1; }

  navigate(dir: 'prev' | 'next') {
    this.currentImage = 0;
    if (dir === 'prev' && this.hasPrev) this.currentProjectIndex--;
    else if (dir === 'next' && this.hasNext) this.currentProjectIndex++;
    this.currentProject = this.allProjects[this.currentProjectIndex];
  }

  prevImage() { if (this.currentImage > 0) this.currentImage--; }
  nextImage() {
    if (this.currentImage < this.currentProject.imageUrls.length - 1) this.currentImage++;
  }
}
