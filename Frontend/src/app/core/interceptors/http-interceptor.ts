import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const adminAuthService = inject(AdminAuthService);

  // توكن المستخدم العادي
  const userToken = localStorage.getItem('auth_token');
  // توكن الأدمن
  const adminToken = localStorage.getItem('adminToken');

  // الطلبات العامة في الـ LMS المفروض تشتغل بدون مصادقة حتى لو كان في توكن منتهي الصلاحية مخزن في المتصفح
  const isPublicLmsRequest =
    req.method === 'GET' &&
    (req.url.includes('/api/lms/courses') ||
      req.url.includes('/api/lms/books') ||
      req.url.includes('/api/lms/tools') ||
      req.url.includes('/api/lms/paths') ||
      req.url.includes('/api/lms/stats'));
  let tokenToUse: string | null = null;

  const isAdminRequest = req.url.includes('/api/admin');

  // لو الطلب رايح إلى /api/admin → استخدم adminToken فقط
  if (isAdminRequest) {
    tokenToUse = adminToken;
  } else if (!isPublicLmsRequest) {
    // LMS محمي + باقي الطلبات → توكن المستخدم فقط
    tokenToUse = userToken;
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

      console.error('HTTP Interceptor Error:', error);

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
        //          403
        // ======================
        if (error.status === 403) {
          if (!tokenToUse) {
            return throwError(() => error);
          }

          if (isAdminRequest) {
            message = error.error?.message || 'You do not have permission to perform this action.';

            if (message) {
              notification.showError(message);
            }

            return throwError(() => error);
          } else {
            message =
              error.error?.message || 'Your account has been disabled. Please contact support.';

            if (message) {
              notification.showError(message);
            }

            authService.logout();
            router.navigate(['/auth/login']);

            return throwError(() => error);
          }
        }

        // ======================
        //          401
        // ======================
        if (error.status === 401) {
          if (!tokenToUse) {
            message = null;
            return throwError(() => error);
          }

          if (isAdminRequest) {
            message = 'Admin session has expired. Please log in again.';
            adminAuthService.logout();
          } else {
            message = 'Your session has expired. Please log in again.';
            authService.logout();
            router.navigate(['/auth/login']);
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
