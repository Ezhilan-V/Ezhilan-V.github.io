import { Component, OnInit } from '@angular/core';
import * as AOS from 'aos';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit() {
    AOS.init({ duration: 900, once: true, offset: 80 });
  }
}
