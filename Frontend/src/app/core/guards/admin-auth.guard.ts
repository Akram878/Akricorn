import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  return auth.restoreAdminSession().pipe(
    map(() => {
      if (!auth.isAuthenticated()) {
        return router.parseUrl('/dashboard/login');
      }
      return true;
    })
  );
};
