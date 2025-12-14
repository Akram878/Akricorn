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
  const redirectToSign = route.data?.['redirectToSign'] === true;
  const target = redirectToSign ? '/auth/sign' : '/auth/login';

  return router.createUrlTree([target], {
    queryParams: { returnUrl: state.url },
  });
};
