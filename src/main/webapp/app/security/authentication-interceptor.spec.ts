import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';
import { Mocked } from 'vitest';

import { authenticationInterceptor } from './authentication-interceptor';
import { AuthService } from './auth.service';

describe('authenticationInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => authenticationInterceptor(req, next));
  let authServiceSpy: Mocked<Pick<AuthService, 'getAccessToken'>>;

  beforeEach(() => {
    authServiceSpy = { getAccessToken: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });
  });

  it('adds the authentication header when an access token is held', () => {
    authServiceSpy.getAccessToken.mockReturnValue('token');
    const httpRequest = new HttpRequest<unknown>('GET', '/api/test');
    let modifiedRequest: HttpRequest<unknown> = httpRequest;
    interceptor(httpRequest, (req) => {
      modifiedRequest = req;
      return of();
    });

    expect(modifiedRequest.headers.get('Authorization')).toEqual('Bearer token');
  });

  it('does not add the authentication header when no access token is held', () => {
    authServiceSpy.getAccessToken.mockReturnValue(null);
    const httpRequest = new HttpRequest<unknown>('GET', '/api/test');
    let modifiedRequest: HttpRequest<unknown> = httpRequest;
    interceptor(httpRequest, (req) => {
      modifiedRequest = req;
      return of();
    });

    expect(modifiedRequest.headers.has('Authorization')).toBe(false);
  });
});
