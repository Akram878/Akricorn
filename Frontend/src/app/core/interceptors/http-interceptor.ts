import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  // توكن المستخدم العادي
  const userToken = localStorage.getItem('auth_token');
  // توكن الأدمن
  const adminToken = localStorage.getItem('adminToken');

  let tokenToUse: string | null = null;

  // لو الطلب رايح إلى /api/admin → حاول تستخدم adminToken أولاً
  if (req.url.includes('/api/admin')) {
    tokenToUse = adminToken || userToken;
  } else {
    // لباقي الطلبات → استخدم توكن المستخدم، ولو مش موجود استخدم الأدمن
    tokenToUse = userToken || adminToken;
  }

  const authReq = tokenToUse
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      console.error('HTTP Interceptor Error:', error);

      // ⛔ في حالة "Failed to fetch"
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        notification.showError(
          'Cannot connect to the server. Please check that the backend is running.'
        );
        return throwError(() => error);
      }

      // ⛔ في حالة Network error (status = 0)
      if (error instanceof HttpErrorResponse && error.status === 0) {
        notification.showError(
          'Cannot connect to the server. Please check that the backend is running.'
        );
        return throwError(() => error);
      }

      // 🧠 رسالة افتراضية
      let message = 'An unexpected error occurred.';

      if (error instanceof HttpErrorResponse) {
        // حالة 401 → وضّح الرسالة شوي
        if (error.status === 401) {
          if (req.url.includes('/api/admin')) {
            message = 'Unauthorized. Please log in as admin again.';
          } else {
            message = 'Unauthorized. Please log in again.';
          }
        } else if (error.error?.message) {
          message = error.error.message;
        } else if (error.status >= 500) {
          message = 'A server error occurred. Please try again later.';
        }
      }

      notification.showError(message);

      return throwError(() => error);
    })
  );
};
