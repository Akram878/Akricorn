import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // نقرأ توكن المستخدم العادي
  const token = localStorage.getItem('auth_token');

  // لو في توكن → اسمح له يدخل
  if (token) {
    return true;
  }

  // لو ما في توكن → رجّعه على صفحة اللوجين الصحيحة
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};
