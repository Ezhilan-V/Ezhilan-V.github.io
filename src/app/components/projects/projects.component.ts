
import { Component, Input, OnInit } from '@angular/core';
import { ProjectCard } from './projects.interface';
@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})


export class ProjectsComponent implements OnInit {
  @Input() project!: ProjectCard;
  images: string[] = [];
  currentImageIndex = 0;

  ngOnInit() {
    this.images = this.project.images;
  }

  previousImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }

  nextImage() {
    if (this.currentImageIndex < this.images.length - 1) {
      this.currentImageIndex++;
    }
  }

  setImage(index: number) {
    this.currentImageIndex = index;
  }
}