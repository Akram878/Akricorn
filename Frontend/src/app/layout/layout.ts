// 👈 [التعديل 1: إضافة OnInit و OnDestroy]
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from '../features/home/profile/profile';
import { SettingSection } from '../features/setting-section/setting-section';

// 👈 [التعديل 2: استيراد AuthService]
import { AuthService } from '../core/services/auth.service';

// 👈 [التعديل 3: استيراد Subscription]
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-Layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SettingSection, ProfileComponent],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
// 👈 [التعديل 4: تطبيق الواجهات]
export class Layout implements OnInit, OnDestroy {
  showSettings = false;
  showProfileModal = false; // نافذة البروفايل العائمة
  // 👈 [التعديل 5: خاصية لتخزين حالة تسجيل الدخول والاشتراك]
  isLoggedIn: boolean = false;
  private authSubscription!: Subscription;
  // 👈 [التعديل 6: حقن AuthService]
  constructor(private authService: AuthService) {}
  isMobileNavOpen = false; // 👈 خاصية جديدة لحالة التوغل

  ngOnInit(): void {
    // 👈 [التعديل 7: الاشتراك في حالة تسجيل الدخول عند تهيئة المكون]
    this.authSubscription = this.authService.isLoggedIn$.subscribe((status: boolean) => {
      this.isLoggedIn = status;
    });
  }

  ngOnDestroy(): void {
    // 👈 [التعديل 8: إلغاء الاشتراك لتجنب تسرب الذاكرة]
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // 👈 [التعديل 9: دالة لتسجيل الخروج]
  onLogout(event: Event) {
    event.preventDefault();
    this.authService.logout();
  }

  openSettings(event: Event) {
    event.preventDefault();
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  mobileNavOpen = false;

  toggleMobileNav(): void {
    this.isMobileNavOpen = !this.isMobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  openProfileModal(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
  }
}
