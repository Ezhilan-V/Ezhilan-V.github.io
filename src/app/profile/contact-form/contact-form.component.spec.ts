import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { ContactFormComponent } from './contact-form.component';

describe('ContactFormComponent.isValid', () => {
  let component: ContactFormComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule],
      declarations: [ContactFormComponent]
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    component.email = 'test@example.com';
    fixture.detectChanges();
  });

  it('rejects empty fields', () => {
    component.name = '';
    component.message = '';
    expect(component.isValid()).toBe(false);
  });

  it('rejects too-short name', () => {
    component.name = 'A';
    component.message = 'Hello, this is a long enough message.';
    expect(component.isValid()).toBe(false);
  });

  it('rejects too-short message', () => {
    component.name = 'Alice';
    component.message = 'short';
    expect(component.isValid()).toBe(false);
  });

  it('accepts valid name + message', () => {
    component.name = 'Alice';
    component.message = 'Hello, this is a long enough message.';
    expect(component.isValid()).toBe(true);
  });

  it('trims whitespace before validating', () => {
    component.name = '   Bob   ';
    component.message = '          eight    ';
    expect(component.isValid()).toBe(true);
  });
});
