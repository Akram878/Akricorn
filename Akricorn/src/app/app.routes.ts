import { Routes } from '@angular/router';
import { LayoutComponent } from './LayoutComponent/Layout.component';
import { Auth } from './auth/auth.component';
import { Login } from './auth/login/login';
import { Sign } from './auth/sign/sign';

export const routes: Routes = [
  { path: '', component: LayoutComponent }, // الصفحة الرئيسية

  {
    path: 'auth',
    component: Auth,
    children: [
      { path: 'login', component: Login },
      { path: 'register', component: Sign },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '' }, // أي مسار خاطئ يرجع إلى الرئيسية
];
