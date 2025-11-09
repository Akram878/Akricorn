import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly key = 'theme'; // لتخزين الثيم في localStorage

  constructor() {
    this.loadTheme(); // تحميل الثيم الحالي عند بدء التطبيق
  }

  toggleTheme(): void {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  }

  applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.key, theme);
  }

  loadTheme(): void {
    const saved = localStorage.getItem(this.key) as 'light' | 'dark' | null;
    this.applyTheme(saved || 'light');
  }

  get currentTheme(): 'light' | 'dark' {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
  }
}
