import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  if (authService.isAuthenticated()) {
    return true;
  }

  // لو ما في توكن → رجّعه على صفحة اللوجين الصحيحة
  const redirectToSign = route.data?.['redirectToSign'] === true;
  const target = redirectToSign ? '/auth/sign' : '/auth/login';

  return router.createUrlTree([target], {
    queryParams: { returnUrl: state.url },
  });
};
