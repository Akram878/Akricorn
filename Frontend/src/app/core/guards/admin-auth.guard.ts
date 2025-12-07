import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  const token = auth.getToken();

  if (!token) {
    return router.parseUrl('/dashboard/login');
  }

  return true;
};
