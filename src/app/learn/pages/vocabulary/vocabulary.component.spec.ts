import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { VocabularyComponent } from './vocabulary.component';
import { LearnService, VocabPayload } from '../../services/learn.service';
import { LearnTermDirective } from '../../components/learn-term/learn-term.directive';

const FIXTURE: VocabPayload = {
  intro: { title: 't', tagline: 'g', body: 'b' },
  categories: [
    { id: 'core',       label: 'Core',       accent: '#fff' },
    { id: 'kinematics', label: 'Kinematics', accent: '#aaa' }
  ],
  terms: [
    { term: 'Robot', category: 'core', short: 'short', long: 'long' },
    { term: 'Pose',  category: 'kinematics', short: 'position + orientation', long: 'six numbers' },
    { term: 'SLAM',  category: 'core', short: 'mapping while moving', long: 'simultaneous' }
  ]
};

describe('VocabularyComponent.recompute', () => {
  let component: VocabularyComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      declarations: [VocabularyComponent],
      providers: [LearnService]
    });
    const fixture = TestBed.createComponent(VocabularyComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('assets/data/learn/vocabulary.json').flush(FIXTURE);
  });

  afterEach(() => http.verify());

  it('shows all terms by default', () => {
    expect(component.totalShown).toBe(3);
    expect(component.sections.length).toBeGreaterThan(0);
  });

  it('filters by category', () => {
    component.setCategory('kinematics');
    expect(component.totalShown).toBe(1);
    expect(component.sections[0].terms[0].term).toBe('Pose');
  });

  it('filters by case-insensitive substring', () => {
    component.setQuery('SLAM');
    expect(component.totalShown).toBe(1);
    component.setQuery('mapping');
    expect(component.totalShown).toBe(1);   // matches via the short field
  });

  it('returns zero for non-matching query', () => {
    component.setQuery('thiswillneverappear');
    expect(component.totalShown).toBe(0);
    expect(component.sections.length).toBe(0);
  });
});
