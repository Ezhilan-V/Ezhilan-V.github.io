import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

interface Project {
  title: string;
  role: string;
  description: string;
  imageUrls: string[];
  technologies?: string[];
  highlights?: string[];
  timeline?: string;
}

@Component({
  selector: 'app-project-details',
  template: `
    <div class="project-details-dialog">
      <div mat-dialog-title class="dialog-header">
        <div class="title-content">
          <h2>{{currentProject.title}}</h2>
          <div class="role-timeline">
            <mat-chip-list>
              <mat-chip color="primary" selected>{{currentProject.role}}</mat-chip>
              <mat-chip *ngIf="currentProject.timeline" class="timeline-chip">{{currentProject.timeline}}</mat-chip>
            </mat-chip-list>
          </div>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <div class="image-carousel">
          <div class="image-container">
            <img [src]="currentProject.imageUrls[currentImage]" [alt]="currentProject.title" 
                 (swipeleft)="nextImage()" (swiperight)="prevImage()">
            
            <button mat-fab class="nav-button prev" 
                    (click)="prevImage()" 
                    [disabled]="currentImage === 0"
                    [class.hidden]="currentImage === 0">
              <mat-icon>chevron_left</mat-icon>
            </button>
            
            <button mat-fab class="nav-button next" 
                    (click)="nextImage()" 
                    [disabled]="currentImage === currentProject.imageUrls.length - 1"
                    [class.hidden]="currentImage === currentProject.imageUrls.length - 1">
              <mat-icon>chevron_right</mat-icon>
            </button>
            
            <div class="image-counter" *ngIf="currentProject.imageUrls.length > 1">
              {{currentImage + 1}} / {{currentProject.imageUrls.length}}
            </div>
          </div>
        </div>

        <div class="project-info">
          <div class="description-section">
            <h3 class="section-title">Project Description</h3>
            <p class="description">{{currentProject.description}}</p>
          </div>

          <div class="technologies" *ngIf="currentProject.technologies?.length">
            <h3 class="section-title">Technologies Used</h3>
            <div class="tech-chips">
              <mat-chip-list>
                <mat-chip *ngFor="let tech of currentProject.technologies" class="tech-chip">
                  {{tech}}
                </mat-chip>
              </mat-chip-list>
            </div>
          </div>

          <div class="highlights" *ngIf="currentProject.highlights?.length">
            <h3 class="section-title">Key Achievements</h3>
            <mat-list class="highlights-list">
              <mat-list-item *ngFor="let highlight of currentProject.highlights" class="highlight-item">
                <mat-icon matListItemIcon class="highlight-icon">stars</mat-icon>
                <div matListItemTitle class="highlight-text">{{highlight}}</div>
              </mat-list-item>
            </mat-list>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <div class="project-navigation">
          <button mat-flat-button 
                  color="primary" 
                  [disabled]="!hasPreviousProject" 
                  (click)="navigateToProject('prev')"
                  class="nav-project-btn">
            <mat-icon>keyboard_arrow_left</mat-icon>
            Previous Project
          </button>
          <button mat-flat-button 
                  color="primary" 
                  [disabled]="!hasNextProject" 
                  (click)="navigateToProject('next')"
                  class="nav-project-btn">
            Next Project
            <mat-icon>keyboard_arrow_right</mat-icon>
          </button>
        </div>
        <button mat-flat-button mat-dialog-close>Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    /* ... Previous styles remain the same ... */

    .dialog-actions {
      display: flex;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(0, 0, 0, 0.12);
      margin: 0;
      background: var(--mat-card-background-color);

      .project-navigation {
        display: flex;
        gap: 1rem;
        margin-right: auto;
      }

      .nav-project-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 140px;
        transition: all 0.3s ease;

        &:disabled {
          opacity: 0.5;
        }

        &:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          line-height: 20px;
        }
      }
    }

    // Add responsive styles for navigation buttons
    @media (max-width: 768px) {
      .dialog-actions {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;

        .project-navigation {
          width: 100%;
          justify-content: space-between;
          margin: 0;
        }

        .nav-project-btn {
          min-width: 0;
          padding: 0 12px;

          span {
            display: none; // Hide text on mobile
          }
        }
      }
    }

    @media (max-width: 480px) {
      .dialog-actions {
        padding: 0.75rem;
        
        .nav-project-btn {
          padding: 0 8px;
        }
      }
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
      project: Project, 
      allProjects: Project[],
      currentIndex: number 
    },
    public dialogRef: MatDialogRef<ProjectDetailsComponent>
  ) {
    this.allProjects = data.allProjects;
    this.currentProjectIndex = data.currentIndex;
    this.currentProject = data.project;
  }

  get hasPreviousProject(): boolean {
    return this.currentProjectIndex > 0;
  }

  get hasNextProject(): boolean {
    return this.currentProjectIndex < this.allProjects.length - 1;
  }

  navigateToProject(direction: 'prev' | 'next') {
    this.currentImage = 0; // Reset image index when changing projects
    
    if (direction === 'prev' && this.hasPreviousProject) {
      this.currentProjectIndex--;
    } else if (direction === 'next' && this.hasNextProject) {
      this.currentProjectIndex++;
    }
    
    this.currentProject = this.allProjects[this.currentProjectIndex];
  }

  prevImage() {
    if (this.currentImage > 0) {
      this.currentImage--;
    }
  }

  nextImage() {
    if (this.currentImage < this.currentProject.imageUrls.length - 1) {
      this.currentImage++;
    }
  }
}