import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import {
  AuthService,
  User,
  UpdateProfileRequest,
  UpdateAccountSettingsRequest,
} from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit, OnDestroy {
  user: User | null = null;
  private sub!: Subscription;

  editMode = false;
  accountSettingsMode = false;
  settingsOpen = false;

  avatarUrl: string = '/assets/icons/user.png';
  about = '';

  // city + birthDate + currentPassword
  editModel = {
    name: '',
    family: '',
    about: '',
    city: '',
    birthDate: '',
    currentPassword: '',
  };

  accountSettingsModel = {
    email: '',
    countryCode: '+20',
    number: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  };

  // قفل تعديل تاريخ الميلاد (سنربطه بالباك إند)
  birthDateLocked = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.sub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
      this.avatarUrl = this.resolveAvatar(user);

      if (user) {
        this.editModel = {
          name: user.name || '',
          family: user.family || '',
          about: this.about || '',
          city: user.city || '',
          birthDate: user.birthDate || '',
          currentPassword: '',
        };

        this.accountSettingsModel = {
          email: user.email || '',
          countryCode: user.countryCode || '+20',
          number: user.number || '',
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        };

        // لو أضفت canEditBirthDate في User من الباك إند:
        // this.birthDateLocked = user.canEditBirthDate === false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  // ============================
  //  Avatar logic
  // ============================

  private resolveAvatar(user: User | null): string {
    const def = '/assets/icons/user.png';
    if (!user || user.isGuest) return def;
    const stored = this.getStoredAvatar(user.email);
    return stored || def;
  }

  private getStoredAvatar(email?: string): string | null {
    if (!email) return null;
    return localStorage.getItem(`avatar_${email}`);
  }

  private storeAvatar(email: string, url: string) {
    localStorage.setItem(`avatar_${email}`, url);
  }

  changeAvatar() {
    if (!this.user || this.user.isGuest) {
      alert('Guests cannot change the profile picture. Please sign in first.');
      return;
    }

    const newUrl = prompt('Enter the new image URL:', this.avatarUrl);
    if (!newUrl) return;

    const trimmed = newUrl.trim();
    if (!trimmed) return;

    this.avatarUrl = trimmed;

    // ✅ نتأكد أن الإيميل موجود، ثم نستخدمه كسلسلة نصية
    const email = this.user.email ?? '';
    if (email) {
      this.storeAvatar(email, trimmed);
    } else {
      console.error('User email is missing; cannot store avatar.');
    }

    alert('Profile picture updated locally. It will be linked to the backend later.');
  }

  // ============================
  //  Settings menu
  // ============================

  toggleSettings() {
    if (!this.user || this.user.isGuest) return;
    this.settingsOpen = !this.settingsOpen;
  }

  startEdit() {
    if (!this.user || this.user.isGuest) {
      alert('Guests cannot edit information. Please sign in first.');
      return;
    }

    this.editModel = {
      name: this.user.name || '',
      family: this.user.family || '',
      about: this.about || '',
      city: this.user.city || '',
      birthDate: this.user.birthDate || '',
      currentPassword: '', // كل مرة نفتح الفورم نفرّغ الباسورد
    };

    this.editMode = true;
    this.accountSettingsMode = false;
    this.settingsOpen = false;
  }

  openAccountSettings() {
    if (!this.user || this.user.isGuest) {
      alert('Guests do not have account settings to edit.');
      return;
    }

    this.accountSettingsModel = {
      email: this.user.email || '',
      countryCode: this.user.countryCode || '+20',
      number: this.user.number || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };

    this.accountSettingsMode = true;
    this.editMode = false;
    this.settingsOpen = false;
  }

  cancelEdit() {
    this.editMode = false;
    this.accountSettingsMode = false;
  }

  // ============================
  //  Save personal info (name/family/about/city/birthDate)
  // ============================

  saveProfile() {
    if (!this.user || this.user.isGuest || !this.user.id) {
      alert('Guests cannot save changes.');
      return;
    }

    // 🔐 لازم يدخل كلمة السر في كل تعديل
    if (!this.editModel.currentPassword) {
      alert('Please enter your password to confirm the changes.');
      return;
    }

    const payload: UpdateProfileRequest = {
      id: this.user.id,
      name: this.editModel.name,
      family: this.editModel.family,
      city: this.editModel.city,
      birthDate: this.editModel.birthDate,
      currentPassword: this.editModel.currentPassword,
    };

    this.authService.updateProfile(payload).subscribe({
      next: (updated: User) => {
        this.user = updated;
        this.about = this.editModel.about;

        // لو الباك إند يرسل canEditBirthDate:
        // this.birthDateLocked = updated.canEditBirthDate === false;

        // نفرّغ الباسورد بعد الحفظ
        this.editModel.currentPassword = '';

        console.log('Profile updated:', updated, 'about:', this.about);
        this.editMode = false;
      },
      error: (err: any) => {
        console.error(err);
        alert('Failed to update profile: ' + (err?.error?.message || err.message || ''));
      },
    });
  }

  // ============================
  //  Save account settings
  // (email / countryCode / number / password)
  // ============================

  saveAccountSettings() {
    if (!this.user || this.user.isGuest || !this.user.id) {
      alert('Guests cannot save account settings.');
      return;
    }

    // 🔐 أيضاً هنا: لا يُسمح بأي تعديل بدون كلمة السر الحالية
    if (!this.accountSettingsModel.currentPassword) {
      alert('Please enter your current password to save changes.');
      return;
    }

    if (
      this.accountSettingsModel.newPassword &&
      this.accountSettingsModel.newPassword !== this.accountSettingsModel.confirmNewPassword
    ) {
      alert('New password and confirm password do not match.');
      return;
    }

    const payload: UpdateAccountSettingsRequest = {
      id: this.user.id,
      email: this.accountSettingsModel.email,
      countryCode: this.accountSettingsModel.countryCode,
      number: this.accountSettingsModel.number,
      currentPassword: this.accountSettingsModel.currentPassword,
      newPassword: this.accountSettingsModel.newPassword,
    };

    this.authService.updateAccountSettings(payload).subscribe({
      next: (updated: User) => {
        this.user = updated;

        this.accountSettingsModel.currentPassword = '';
        this.accountSettingsModel.newPassword = '';
        this.accountSettingsModel.confirmNewPassword = '';

        console.log('Account settings updated:', updated);
        this.accountSettingsMode = false;
      },
      error: (err: any) => {
        console.error(err);
        alert('Failed to update account settings: ' + (err?.error?.message || err.message || ''));
      },
    });
  }

  // ============================
  //        Delete account
  // ============================

  deleteAccount() {
    if (!this.user || this.user.isGuest || !this.user.id) {
      alert('Guest accounts cannot be deleted.');
      return;
    }

    this.settingsOpen = false;

    const confirmed = confirm(
      'Are you sure you want to delete this account? This action cannot be undone.'
    );
    if (!confirmed) return;

    this.authService.deleteAccount(this.user.id).subscribe({
      next: () => {
        alert('Your account has been deleted.');
        this.authService.logout();
      },
      error: (err: any) => {
        console.error(err);
        alert('Failed to delete account: ' + (err?.error?.message || err.message || ''));
      },
    });
  }

  closeProfile(): void {
    // مثال لو في متغيّر showProfile في الأب:
    // this.close.emit();  // لو عامل Output<EventEmitter> على الكومبوننت
    // أو:
    // this.router.navigate(['/home']);
    console.log('closeProfile() clicked');
  }

  /**
   * تسجيل الخروج
   * هنا اربطها مع خدمة الـ Auth عندك
   */
  logout(): void {
    // مثال:
    // this.authService.logout();
    // this.router.navigate(['/auth/login']);
    console.log('logout() clicked');
  }
}
