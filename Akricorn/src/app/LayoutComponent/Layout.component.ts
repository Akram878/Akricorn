import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { SettingSection } from '../setting-section/setting-section';
@Component({
  selector: 'app-Layout',
  standalone: true, // مهم جدًا
  imports: [CommonModule, RouterModule, SettingSection], // 👈 هنا تضيف RouterModule
  templateUrl: './Layout.component.html',
  styleUrls: ['./Layout.component.scss'],
})
export class LayoutComponent {
  showSettings = false;

  openSettings(event: Event) {
    event.preventDefault(); // 🚫 يمنع إعادة تحميل الصفحة
    this.showSettings = true; // ✅ يفتح نافذة الإعدادات
  }

  closeSettings() {
    this.showSettings = false;
  }
}
