import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authenticationInterceptor: HttpInterceptorFn = (req, next) => {
  const accessToken = inject(AuthService).getAccessToken();

  if (!accessToken) {
    return next(req);
  }

  return next(
    req.clone({
      headers: req.headers.set('Authorization', `Bearer ${accessToken}`),
    }),
  );
};
