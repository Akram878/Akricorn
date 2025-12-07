import { Routes } from '@angular/router';
import { Layout } from './layout/layout';

// Features pages
import { HOME } from './features/home/home';
import { LMS } from './features/lms/lms';
import { ServicesSection } from './features/services-section/services-section';
import { FreeLancing } from './features/free-lancing/free-lancing';

// Auth
import { Auth } from './features/auth/auth.component';
import { Login } from './features/auth/login/login';
import { Sign } from './features/auth/sign/sign';

// Home
import { Profile } from './features/home/profile/profile';

// 🛡 AuthGuard (لليوزر)
import { authGuard } from './core/guards/auth-guard';

// LMS sub pages
import { Courses } from './features/lms/courses/courses';
import { Library } from './features/lms/library/library';
import { LmsTools } from './features/lms/tools/tools';
import { LearningPath } from './features/lms/learning-path/learning-path';

// 🆕 Dashboard components
import { DashboardLayoutComponent } from './dashboard/layout/dashboard-layout/dashboard-layout';
import { DashboardLoginComponent } from './dashboard/pages/dashboard-login/dashboard-login';
import { DashboardHome } from './dashboard/pages/dashboard-home/dashboard-home';

// 🆕 Admin guard
import { adminAuthGuard } from './core/guards/admin-auth.guard';

import { DashboardCourses } from './dashboard/pages/dashboard-courses/dashboard-courses';

import { DashboardBooks } from './dashboard/pages/dashboard-books/dashboard-books';

import { DashboardPaths } from './dashboard/pages/dashboard-paths/dashboard-paths';
import { DashboardTools } from './dashboard/pages/dashboard-tools/dashboard-tools';
import { DashboardUsers } from './dashboard/pages/dashboard-users/dashboard-users';

import { MyCourses } from './features/lms/my-courses/my-courses';
export const routes: Routes = [
  {
    path: 'auth',
    component: Auth,
    children: [
      { path: 'login', component: Login },
      { path: 'sign', component: Sign },
    ],
  },

  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'home',
        component: HOME,
      },
      {
        path: 'lms',
        component: LMS,
      },
      {
        path: 'lms/courses',
        component: Courses,
      },
      {
        path: 'lms/library',
        component: Library,
      },
      {
        path: 'lms/tools',
        component: LmsTools,
      },
      {
        path: 'lms/learning-path',
        component: LearningPath,
      },
      {
        path: 'lms/my-courses',
        component: MyCourses,
        canActivate: [authGuard],
      },
      {
        path: 'services-section',
        component: ServicesSection,
      },
      {
        path: 'free-lancing',
        component: FreeLancing,
      },
      {
        path: 'profile',
        component: Profile,
        canActivate: [authGuard],
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  // 🆕 صفحة تسجيل الدخول للداشبورد
  {
    path: 'dashboard/login',
    component: DashboardLoginComponent,
  },

  // 🆕 شيل الداشبورد المحمي
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', component: DashboardHome },
      { path: 'courses', component: DashboardCourses },
      { path: 'books', component: DashboardBooks },
      { path: 'paths', component: DashboardPaths },
      { path: 'tools', component: DashboardTools },
      { path: 'users', component: DashboardUsers },
    ],
  },

  { path: '**', redirectTo: '' },
];
