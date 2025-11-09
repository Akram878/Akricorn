import { Routes } from '@angular/router';
import { LayoutComponent } from './LayoutComponent/Layout.component';
import { Auth } from './auth/auth.component';
import { Login } from './auth/login/login';
import { Sign } from './auth/sign/sign';
import { LMS } from './lms/lms';
import { HOME } from './home/home';
import { ServicesSection } from './services-section/services-section';
import { FreeLancing } from './free-lancing/free-lancing';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'home', component: HOME },
      { path: 'lms', component: LMS },
      { path: 'services-section', component: ServicesSection },
      { path: 'free-lancing', component: FreeLancing },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  {
    path: 'auth',
    component: Auth,
    children: [
      { path: 'login', component: Login },
      { path: 'register', component: Sign },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
