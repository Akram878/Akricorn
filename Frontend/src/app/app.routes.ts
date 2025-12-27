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
import { ProfileComponent } from './features/home/profile/profile';
import { Payments } from './features/home/profile/payments/payments'; // 🆕 صفحة المدفوعات

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
import { DashboardUserDetailComponent } from './dashboard/pages/dashboard-user-detail/dashboard-user-detail';

import { MyCourses } from './features/lms/my-courses/my-courses';
import { MyBooks } from './features/lms/my-books/my-books';
import { CourseViewer } from './features/lms/my-courses/course-viewer/course-viewer';
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
        path: 'lms/my-courses/:id',
        component: CourseViewer,
        canActivate: [authGuard],
      },
      {
        path: 'lms/my-courses',
        component: MyCourses,
        canActivate: [authGuard],
      },
      {
        path: 'lms/my-books',
        component: MyBooks,
        canActivate: [authGuard],
        data: { redirectToSign: true },
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
        component: ProfileComponent,
        canActivate: [authGuard],
      },
      {
        path: 'profile/payments', // 🆕 صفحة سجل المدفوعات
        component: Payments,
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

  // 🆕 الداشبورد المحمي
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
      { path: 'users/:id', component: DashboardUserDetailComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];
