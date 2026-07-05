import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Mocked } from 'vitest';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  let breakpointState: Subject<BreakpointState>;
  let breakpointObserver: Mocked<Pick<BreakpointObserver, 'observe' | 'isMatched'>>;

  const setup = () => TestBed.inject(LayoutService);

  beforeEach(() => {
    breakpointState = new Subject<BreakpointState>();
    breakpointObserver = {
      observe: vi.fn().mockReturnValue(breakpointState),
      isMatched: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: breakpointObserver }],
    });
  });

  it('reports the current viewport before the observer has emitted', () => {
    breakpointObserver.isMatched.mockReturnValue(true);

    const service = setup();

    expect(service.isCompact()).toBe(true);
  });

  it('reports compact when the viewport shrinks below the breakpoint', () => {
    const service = setup();

    breakpointState.next({ matches: true, breakpoints: {} });

    expect(service.isCompact()).toBe(true);
  });

  it('reports non-compact when the viewport grows past the breakpoint', () => {
    breakpointObserver.isMatched.mockReturnValue(true);
    const service = setup();

    breakpointState.next({ matches: false, breakpoints: {} });

    expect(service.isCompact()).toBe(false);
  });
});
