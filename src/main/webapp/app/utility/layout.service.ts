import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Viewport information for layout decisions the shell cannot make in CSS alone (e.g. whether
 * navigation renders as a bottom bar or as toolbar controls). Compact means phone width, below
 * Material's 600px breakpoint.
 */
@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private breakpointObserver = inject(BreakpointObserver);

  readonly isCompact = toSignal(
    this.breakpointObserver.observe(Breakpoints.XSmall).pipe(map((state) => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(Breakpoints.XSmall) },
  );
}
