import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../profile.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {
  about1: any
  professionalSummary: string[] = []

  constructor(private profileService: ProfileService) { }

  ngOnInit() {
    this.about1 = this.profileService.about
    this.professionalSummary = this.profileService.professionalSummary
  }

}
