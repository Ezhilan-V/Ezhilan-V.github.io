import { Component } from '@angular/core';
import { ProfileService, Patent } from '../profile.service';

@Component({
  standalone: false,
  selector: 'app-patent',
  templateUrl: './patent.component.html',
  styleUrls: ['./patent.component.scss']
})
export class PatentComponent {
  patent: Patent;
  constructor(private svc: ProfileService) {
    this.patent = svc.patent;
  }
}
