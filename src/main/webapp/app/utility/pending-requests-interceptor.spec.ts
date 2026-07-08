import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Subject } from 'rxjs';
import { Mocked } from 'vitest';

import { pendingRequestsInterceptor } from './pending-requests-interceptor';
import { PendingRequestsService } from './pending-requests.service';

describe('pendingRequestsInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => pendingRequestsInterceptor(req, next));
  let pendingSpy: Mocked<Pick<PendingRequestsService, 'increment' | 'decrement'>>;

  beforeEach(() => {
    pendingSpy = { increment: vi.fn(), decrement: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: PendingRequestsService, useValue: pendingSpy }],
    });
  });

  it('increments on start and decrements once the request completes', () => {
    const response = new Subject<HttpResponse<unknown>>();
    const next: HttpHandlerFn = () => response.asObservable();

    const sub = interceptor(new HttpRequest('GET', '/api/recipes'), next).subscribe();

    expect(pendingSpy.increment).toHaveBeenCalledOnce();
    expect(pendingSpy.decrement).not.toHaveBeenCalled();

    response.next(new HttpResponse({ status: 200 }));
    response.complete();

    expect(pendingSpy.decrement).toHaveBeenCalledOnce();
    sub.unsubscribe();
  });

  it('decrements and propagates the error when the request fails', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const failing = new Subject<HttpResponse<unknown>>();
    const next: HttpHandlerFn = () => failing.asObservable();

    const seen = { error: undefined as unknown };
    interceptor(new HttpRequest('GET', '/api/recipes'), next).subscribe({
      error: (e) => (seen.error = e),
    });

    failing.error(error);

    expect(pendingSpy.decrement).toHaveBeenCalledOnce();
    expect(seen.error).toBe(error);
  });

  it('decrements when the request is cancelled via unsubscribe', () => {
    const next: HttpHandlerFn = () => new Subject<HttpResponse<unknown>>().asObservable();

    const sub = interceptor(new HttpRequest('GET', '/api/recipes'), next).subscribe();
    expect(pendingSpy.decrement).not.toHaveBeenCalled();

    sub.unsubscribe();

    expect(pendingSpy.decrement).toHaveBeenCalledOnce();
  });
});
