import { Component, EventEmitter, Output, signal } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [],
  templateUrl: './setting-section.html',
  styleUrl: './setting-section.scss',
})
export class SettingSection {
  @Output() closeModal = new EventEmitter<void>();

  theme = signal<'light' | 'dark'>(this.getSavedTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  close() {
    this.closeModal.emit();
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
  }

  private applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  private getSavedTheme(): 'light' | 'dark' {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  }
}
