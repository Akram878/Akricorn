import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { App } from './app/app';
import { routes } from './app/app.routes';
import { httpInterceptor } from './app/core/interceptors/http-interceptor';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([httpInterceptor]) // ✅ تفعيل الـ interceptor
    ),
    provideRouter(routes),
  ],
}).catch((err) => console.error(err));
