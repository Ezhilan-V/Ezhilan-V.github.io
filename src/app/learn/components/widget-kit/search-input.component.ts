import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'learn-search-input',
  templateUrl: './search-input.component.html',
  styleUrls: ['./search-input.component.scss']
})
export class SearchInputComponent {
  @Input() placeholder = 'Search…';
  @Input() value = '';
  @Input() ariaLabel = 'Search';
  @Output() valueChange = new EventEmitter<string>();

  onInput(v: string) {
    this.value = v;
    this.valueChange.emit(v);
  }

  clear() {
    this.value = '';
    this.valueChange.emit('');
  }
}
