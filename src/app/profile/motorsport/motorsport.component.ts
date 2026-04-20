import { Component } from '@angular/core';
import { ProfileService, Motorsport } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-motorsport',
  templateUrl: './motorsport.component.html',
  styleUrls: ['./motorsport.component.scss']
})
export class MotorsportComponent {
  motorsport: Motorsport;
  constructor(private svc: ProfileService) {
    this.motorsport = svc.motorsport;
  }
}
