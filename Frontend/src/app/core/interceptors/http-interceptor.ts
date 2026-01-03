import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  const authService = inject(AuthService);
  const adminAuthService = inject(AdminAuthService);

  const isAuthRequest = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/signup');
  let tokenToUse: string | null = null;

  const isAdminRequest = req.url.includes('/api/admin');

  // If the request goes to /api/admin → use adminToken only
  if (isAdminRequest) {
    tokenToUse = req.url.includes('/api/admin/login')
      ? null
      : adminAuthService.isAuthenticated()
      ? adminAuthService.getAccessToken()
      : null;
  } else {
    // Protected LMS + other requests → user token only
    tokenToUse =
      isAuthRequest || !authService.isAuthenticated() ? null : authService.getAccessToken();
  }

  // ================================
  //  ⭐ The only allowed modification ⭐
  // ================================
  // Handling multipart/form-data issues
  const extraOptions: any = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    extraOptions.withCredentials = true; // Important to keep the token
    extraOptions.reportProgress = true; // Useful for uploads
  }

  const authReq = tokenToUse
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${tokenToUse}`,
        },
        ...extraOptions, // ← ← Add the modification here only
      })
    : req;

  const isApiRequest = req.url.includes('/api/');
  return next(authReq).pipe(
    catchError((error) => {
      if (!isApiRequest) {
        return throwError(() => error);
      }

      // ⛔ "Failed to fetch" (e.g., the server is down)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        notification.showError(
          'Cannot connect to the server. Please check that the backend is running.'
        );
        return throwError(() => error);
      }

      // ⛔ Network error (status = 0)
      if (error instanceof HttpErrorResponse && error.status === 0) {
        notification.showError(
          'Cannot connect to the server. Please check that the backend is running.'
        );
        return throwError(() => error);
      }

      let message: string | null = 'An unexpected error occurred.';

      if (error instanceof HttpErrorResponse) {
        const isAdminRequest = req.url.includes('/api/admin');

        // ======================
        //          401
        // ======================
        if (error.status === 401) {
          if (isAdminRequest) {
            message = 'Admin session has expired. Please log in again.';
          } else if (isAuthRequest) {
            message = error.error?.message || 'Invalid email or password.';
          } else {
            message = 'Your session has expired. Please log in again.';
            authService.handleAuthFailure();
          }
          if (message) {
            notification.showError(message);
          }
          return throwError(() => error);
        }

        // ======================
        //          403
        // ======================
        if (error.status === 403) {
          if (isAdminRequest) {
            message = error.error?.message || 'You do not have permission to perform this action.';
          } else {
            message =
              error.error?.message || 'Your account has been disabled. Please contact support.';
          }

          if (message) {
            notification.showError(message);
          }

          return throwError(() => error);
        }

        // ======================
        //     Remaining cases
        // ======================
        if (error.error?.message) {
          message = error.error.message;
        } else if (error.status >= 500) {
          if (error.error && error.error.message) {
            message = error.error.message;
          } else {
            message = 'A server error occurred. Please try again later.';
          }
        }
      }

      if (message) {
        notification.showError(message);
      }

      return throwError(() => error);
    })
  );
};
