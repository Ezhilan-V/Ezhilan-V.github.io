import { Component, OnInit } from '@angular/core';
import { NgxSpinnerService } from '../../../node_modules/ngx-spinner';
import { ProfileService } from './profile.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ResumeComponent implements OnInit {
  about: string = ""
  constructor(private profileService: ProfileService) {
    this.about = this.profileService.about
  }
  ngOnInit() {
    var body = document.getElementsByTagName('body')[0];
    body.classList.add('profile-page');
    var navbar = document.getElementsByTagName('nav')[0];
    navbar.classList.add('navbar-transparent');
  }
  ngOnDestroy() {
    var body = document.getElementsByTagName('body')[0];
    body.classList.remove('profile-page');
    var navbar = document.getElementsByTagName('nav')[0];
    navbar.classList.remove('navbar-transparent');
  }


}
