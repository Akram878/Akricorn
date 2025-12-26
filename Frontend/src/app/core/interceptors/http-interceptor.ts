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

  const isAuthRequest =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/signup') ||
    req.url.includes('/api/admin/login');
  let tokenToUse: string | null = null;

  const isAdminRequest = req.url.includes('/api/admin');

  // لو الطلب رايح إلى /api/admin → استخدم adminToken فقط
  if (isAdminRequest) {
    tokenToUse =
      isAuthRequest || !adminAuthService.isAuthenticated()
        ? null
        : adminAuthService.getAccessToken();
  } else {
    // LMS محمي + باقي الطلبات → توكن المستخدم فقط
    tokenToUse =
      isAuthRequest || !authService.isAuthenticated() ? null : authService.getAccessToken();
  }

  // ================================
  //  ⭐ التعديل الوحيد المسموح به ⭐
  // ================================
  // معالجة مشاكل multipart/form-data
  const extraOptions: any = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    extraOptions.withCredentials = true; // مهم لعدم حذف التوكن
    extraOptions.reportProgress = true; // مفيد للرفع
  }

  const authReq = tokenToUse
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${tokenToUse}`,
        },
        ...extraOptions, // ← ← إضافة التعديل هنا فقط
      })
    : req;

  const isApiRequest = req.url.includes('/api/');
  return next(authReq).pipe(
    catchError((error) => {
      if (!isApiRequest) {
        return throwError(() => error);
      }

      // ⛔ "Failed to fetch" (مثلاً السيرفر طافي)
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
            adminAuthService.logout();
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
        //     باقي الحالات
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
