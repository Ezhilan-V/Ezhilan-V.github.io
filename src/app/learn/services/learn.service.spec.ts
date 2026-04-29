import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LearnService, LearnIndex } from './learn.service';

describe('LearnService', () => {
  let service: LearnService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LearnService]
    });
    service = TestBed.inject(LearnService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and caches the learn index', (done) => {
    const fixture: LearnIndex = {
      intro: { title: 't', tagline: 'g', body: 'b' },
      branches: [
        { slug: 's', kind: 'setup', title: 'Setup', shortName: 'Setup', icon: 'fa-rocket',
          color: '', accent: '#fff', description: 'd', hero: { tagline: '', intro: '' }, sectionTitles: [] }
      ]
    };

    service.loadIndex().subscribe(idx => {
      expect(idx.branches.length).toBe(1);
      expect(idx.branches[0].slug).toBe('s');
      done();
    });

    const req = http.expectOne('assets/data/learn/index.json');
    expect(req.request.method).toBe('GET');
    req.flush(fixture);
  });

  it('returns cached index on subsequent calls (no second HTTP request)', () => {
    const fixture: LearnIndex = { intro: { title: '', tagline: '', body: '' }, branches: [] };
    service.loadIndex().subscribe();
    http.expectOne('assets/data/learn/index.json').flush(fixture);

    service.loadIndex().subscribe();
    // No additional outbound request - shareReplay(1) hits the cache
    http.verify();
  });
});
