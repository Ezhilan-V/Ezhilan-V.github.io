import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ProjectDetailsComponent } from '../project-details/project-details.component';
import { ProfileService, Project, ProjectCategory } from '../profile.service';

const MOBILE_BP  = 768;
const TABLET_BP  = 1024;
const TOUCH_THRESHOLD = 50;

@Component({
  standalone: false,
  selector: 'app-project-card',
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss']
})
export class ProjectCardComponent implements OnInit, OnDestroy {
  currentSlide: { [key: string]: number } = {};
  touchStartX = 0;
  selectedCategoryIndex = 0;
  itemsPerSlide = 3;
  allProjects: ProjectCategory[];
  filteredProjects: ProjectCategory[] = [];
  activeSkill: string | null = null;

  private sub = new Subscription();
  private resizeHandler = () => {
    this.updateItemsPerSlide();
    this.cdr.markForCheck();
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private profileService: ProfileService
  ) {
    this.allProjects = this.profileService.projects;
    this.filteredProjects = this.allProjects;
  }

  ngOnInit() {
    this.updateItemsPerSlide();
    window.addEventListener('resize', this.resizeHandler);

    this.sub.add(
      this.profileService.selectedSkill$.subscribe(skill => {
        this.activeSkill = skill;
        this.applyFilter(skill);
        this.selectedCategoryIndex = 0;
        this.currentSlide = {};
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.resizeHandler);
    this.sub.unsubscribe();
  }

  applyFilter(skill: string | null) {
    if (!skill) {
      this.filteredProjects = this.allProjects;
      return;
    }
    const lower = skill.toLowerCase();
    this.filteredProjects = this.allProjects
      .map(cat => ({
        ...cat,
        projects: cat.projects.filter(p =>
          p.technologies?.some(t => t.toLowerCase().includes(lower))
        )
      }))
      .filter(cat => cat.projects.length > 0);
  }

  getProjectCount(): number {
    return this.filteredProjects.reduce((sum, cat) => sum + cat.projects.length, 0);
  }

  updateItemsPerSlide() {
    if (window.innerWidth < MOBILE_BP) {
      this.itemsPerSlide = 1;
    } else if (window.innerWidth < TABLET_BP) {
      this.itemsPerSlide = 2;
    } else {
      this.itemsPerSlide = 3;
    }
  }

  openProjectDetails(project: Project, category: ProjectCategory) {
    const currentIndex = category.projects.findIndex(p => p.title === project.title);
    this.dialog.open(ProjectDetailsComponent, {
      data: { project, allProjects: category.projects, currentIndex },
      width: '90%',
      maxWidth: '800px',
      panelClass: 'project-dialog',
      autoFocus: false
    });
  }

  selectCategory(index: number) {
    this.selectedCategoryIndex = index;
    const cat = this.filteredProjects[index];
    if (cat) this.currentSlide[cat.name] = 0;
    this.cdr.markForCheck();
  }

  prevSlide(categoryName: string) {
    const slide = this.currentSlide[categoryName] ?? 0;
    if (slide > 0) {
      this.currentSlide[categoryName] = slide - 1;
      this.cdr.markForCheck();
    }
  }

  nextSlide(categoryName: string, totalProjects: number) {
    const slide = this.currentSlide[categoryName] ?? 0;
    const maxSlides = Math.ceil(totalProjects / this.itemsPerSlide) - 1;
    if (slide < maxSlides) {
      this.currentSlide[categoryName] = slide + 1;
      this.cdr.markForCheck();
    }
  }

  canShowPrevSlide(categoryName: string): boolean {
    return (this.currentSlide[categoryName] ?? 0) > 0;
  }

  canShowNextSlide(categoryName: string, totalProjects: number): boolean {
    const maxSlides = Math.ceil(totalProjects / this.itemsPerSlide) - 1;
    return (this.currentSlide[categoryName] ?? 0) < maxSlides;
  }

  handleTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  handleTouchEnd(event: TouchEvent, categoryName: string, totalProjects: number) {
    const diffX = this.touchStartX - event.changedTouches[0].clientX;
    if (Math.abs(diffX) > TOUCH_THRESHOLD) {
      if (diffX > 0) this.nextSlide(categoryName, totalProjects);
      else this.prevSlide(categoryName);
    }
  }

  getVisibleProjects(projects: Project[], categoryName: string): Project[] {
    const startIndex = (this.currentSlide[categoryName] ?? 0) * this.itemsPerSlide;
    return projects.slice(startIndex, startIndex + this.itemsPerSlide);
  }

  getPaginationPages(totalProjects: number): number[] {
    return Array(Math.ceil(totalProjects / this.itemsPerSlide)).fill(0);
  }

  goToSlide(categoryName: string, index: number) {
    this.currentSlide[categoryName] = index;
    this.cdr.markForCheck();
  }
}
