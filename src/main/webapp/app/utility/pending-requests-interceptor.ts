import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { PendingRequestsService } from './pending-requests.service';

/**
 * Counts every request towards the global activity indicator. The count is settled in a
 * {@link finalize} so completed, errored, and cancelled requests all release it — a stuck
 * counter would leave the bar showing forever. The stream is otherwise passed through untouched,
 * so it neither swallows nor re-orders errors from the wrapped requests (including the silent
 * token refresh).
 */
export const pendingRequestsInterceptor: HttpInterceptorFn = (req, next) => {
  const pending = inject(PendingRequestsService);
  pending.increment();
  return next(req).pipe(finalize(() => pending.decrement()));
};
