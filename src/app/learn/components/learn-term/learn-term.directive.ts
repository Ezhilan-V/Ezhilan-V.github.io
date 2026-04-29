import {
  Directive, ElementRef, HostListener, Input, OnDestroy, OnInit,
  Renderer2
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LearnService, VocabTerm } from '../../services/learn.service';

/**
 * Wrap any inline phrase in a popover that shows its glossary definition.
 *
 *   <span [learnTerm]="'pose'">pose</span>
 *
 * Hover or focus to reveal the popover. Click to deep-link to the section
 * that owns the term (when one is registered in vocabulary.json).
 */
@Directive({
  standalone: false,
  selector: '[learnTerm]'
})
export class LearnTermDirective implements OnInit, OnDestroy {
  @Input('learnTerm') termKey = '';

  private term?: VocabTerm;
  private popover?: HTMLDivElement;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private sub?: Subscription;

  constructor(
    private host: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private learn: LearnService,
    private router: Router
  ) {}

  ngOnInit() {
    const el = this.host.nativeElement;
    this.renderer.addClass(el, 'learn-term');
    this.renderer.setAttribute(el, 'tabindex', '0');
    this.renderer.setAttribute(el, 'role', 'button');
    this.renderer.setAttribute(el, 'aria-haspopup', 'dialog');

    this.sub = this.learn.loadVocabulary().subscribe(p => {
      const key = (this.termKey || el.textContent || '').trim().toLowerCase();
      this.term = p.terms.find(t => t.term.toLowerCase() === key)
        || p.terms.find(t => t.term.toLowerCase().includes(key));
      if (this.term) {
        this.renderer.setAttribute(el, 'aria-label',
          `Definition of ${this.term.term}: ${this.term.short}`);
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.removePopover();
  }

  @HostListener('mouseenter') onEnter() { this.show(); }
  @HostListener('focus')      onFocus() { this.show(); }
  @HostListener('mouseleave') onLeave() { this.scheduleHide(); }
  @HostListener('blur')       onBlur()  { this.scheduleHide(); }

  @HostListener('click', ['$event'])
  onClick(ev: MouseEvent) {
    if (!this.term?.branch) return;
    ev.preventDefault();
    if (this.term.section) {
      this.router.navigate(['/learn', this.term.branch], { fragment: 'section-' + this.term.section });
    } else {
      this.router.navigate(['/learn', this.term.branch]);
    }
  }

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onKey(ev: KeyboardEvent) { this.onClick(ev as unknown as MouseEvent); }

  private show() {
    if (!this.term) return;
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = undefined; }
    if (this.popover) return;

    const pop = this.renderer.createElement('div') as HTMLDivElement;
    pop.className = 'learn-term__pop';

    const cat = this.renderer.createElement('span');
    cat.className = 'learn-term__pop-cat';
    cat.textContent = this.term.category || 'glossary';
    pop.appendChild(cat);

    const heading = this.renderer.createElement('strong');
    heading.textContent = this.term.term;
    pop.appendChild(heading);

    const short = this.renderer.createElement('p');
    short.className = 'learn-term__pop-short';
    short.textContent = this.term.short;
    pop.appendChild(short);

    if (this.term.long && this.term.long !== this.term.short) {
      const long = this.renderer.createElement('p');
      long.className = 'learn-term__pop-long';
      long.textContent = this.term.long;
      pop.appendChild(long);
    }

    if (this.term.branch) {
      const cta = this.renderer.createElement('span');
      cta.className = 'learn-term__pop-cta';
      cta.textContent = 'click to read more →';
      pop.appendChild(cta);
    }

    document.body.appendChild(pop);
    this.popover = pop;
    this.position(pop);
  }

  private scheduleHide() {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.removePopover(), 80);
  }

  private removePopover() {
    if (this.popover) {
      this.popover.remove();
      this.popover = undefined;
    }
  }

  private position(pop: HTMLElement) {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const ph = pop.offsetHeight || 120;
    const pw = pop.offsetWidth || 280;
    const padding = 8;
    let top = window.scrollY + rect.bottom + padding;
    let left = window.scrollX + rect.left;
    if (left + pw > window.scrollX + window.innerWidth - padding) {
      left = window.scrollX + window.innerWidth - pw - padding;
    }
    if (top + ph > window.scrollY + window.innerHeight - padding) {
      // Flip above the host
      top = window.scrollY + rect.top - ph - padding;
    }
    pop.style.top = `${Math.max(window.scrollY + padding, top)}px`;
    pop.style.left = `${Math.max(padding, left)}px`;
  }
}
