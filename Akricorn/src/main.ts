import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app/app';
import { routes } from './app/app.routes'; // 👈 استدعاء المسارات فقط

bootstrapApplication(App, {
  providers: [provideRouter(routes)],
}).catch((err) => console.error(err));
