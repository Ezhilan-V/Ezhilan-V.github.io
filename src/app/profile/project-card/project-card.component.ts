import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProjectDetailsComponent } from './project-details.component';
import { ProfileService } from '../profile.service';

interface Project {
  title: string;
  role: string;
  description: string;
  imageUrls: string[];
  technologies?: string[];
  highlights?: string[];
  timeline?: string;
}

interface ProjectCategory {
  name: string;
  icon: string;
  projects: Project[];
}

@Component({
  selector: 'app-project-card',
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss']
})
export class ProjectCardComponent implements OnInit {
  currentSlide: { [key: string]: number } = {};
  touchStartX = 0;
  selectedCategoryIndex = 0;
  itemsPerSlide = 3;
  projects: ProjectCategory[]
  constructor(
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private profileService: ProfileService
  ) { 
    this.projects = this.profileService.projects
  }

  ngOnInit() {
    this.updateItemsPerSlide();
    window.addEventListener('resize', () => {
      this.updateItemsPerSlide();
      this.cdr.detectChanges();
    });
  }

  updateItemsPerSlide() {
    if (window.innerWidth < 768) {
      this.itemsPerSlide = 1;
    } else if (window.innerWidth < 1024) {
      this.itemsPerSlide = 2;
    } else {
      this.itemsPerSlide = 3;
    }
  }

  openProjectDetails(project: Project, category: ProjectCategory) {
    const currentIndex = category.projects.findIndex(p => p.title === project.title);
    
    this.dialog.open(ProjectDetailsComponent, {
      data: {
        project: project,
        allProjects: category.projects,
        currentIndex: currentIndex
      },
      width: '90%',
      maxWidth: '800px',
      panelClass: 'project-dialog'
    });
  }
  selectCategory(index: number) {
    this.selectedCategoryIndex = index;
    this.currentSlide[this.projects[index].name] = 0;
    this.cdr.detectChanges();
  }

  prevSlide(categoryName: string) {
    if (!this.currentSlide[categoryName]) {
      this.currentSlide[categoryName] = 0;
    }
    if (this.currentSlide[categoryName] > 0) {
      this.currentSlide[categoryName]--;
      this.cdr.detectChanges();
    }
  }

  nextSlide(categoryName: string, totalProjects: number) {
    if (!this.currentSlide[categoryName]) {
      this.currentSlide[categoryName] = 0;
    }
    const maxSlides = Math.ceil(totalProjects / this.itemsPerSlide) - 1;
    if (this.currentSlide[categoryName] < maxSlides) {
      this.currentSlide[categoryName]++;
      this.cdr.detectChanges();
    }
  }

  canShowPrevSlide(categoryName: string): boolean {
    return (this.currentSlide[categoryName] || 0) > 0;
  }

  canShowNextSlide(categoryName: string, totalProjects: number): boolean {
    const currentSlideIndex = this.currentSlide[categoryName] || 0;
    const maxSlides = Math.ceil(totalProjects / this.itemsPerSlide) - 1;
    return currentSlideIndex < maxSlides;
  }

  // Touch event handlers
  handleTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  handleTouchEnd(event: TouchEvent, categoryName: string, totalProjects: number) {
    const touchEndX = event.changedTouches[0].clientX;
    const diffX = this.touchStartX - touchEndX;

    if (Math.abs(diffX) > 50) { // Minimum swipe distance
      if (diffX > 0 && this.canShowNextSlide(categoryName, totalProjects)) {
        this.nextSlide(categoryName, totalProjects);
      } else if (diffX < 0 && this.canShowPrevSlide(categoryName)) {
        this.prevSlide(categoryName);
      }
    }
  }

  getVisibleProjects(projects: Project[], categoryName: string): Project[] {
    const startIndex = (this.currentSlide[categoryName] || 0) * this.itemsPerSlide;
    return projects.slice(startIndex, startIndex + this.itemsPerSlide);
  }
}