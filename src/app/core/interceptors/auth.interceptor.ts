import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';

const API_TIMEOUT_MS = 20_000;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('makeupstudio.accessToken');
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  // Prevent buttons such as “Sending…” from staying busy forever when the API
  // is unreachable or a request never completes. Components should still use
  // finalize() to reset their local loading state on success, error, or timeout.
  return next(authenticatedRequest).pipe(timeout({ first: API_TIMEOUT_MS }));
};
