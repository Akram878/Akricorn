import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AuthService,
  User,
  UpdateProfileRequest,
  UpdateAccountSettingsRequest,
} from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { CountrySelectComponent } from '../../../shared/components/country-select/country-select';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CountrySelectComponent],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  private sub!: Subscription;

  editMode = false;
  accountSettingsMode = false;

  accountSubmitted = false;
  avatarUrl: string = '/assets/icons/user.png';

  // city + birthDate + currentPassword
  editModel = {
    name: '',
    family: '',

    city: '',
    birthDate: '',
    currentPassword: '',
  };

  accountSettingsModel = {
    email: '',
    countryCode: '+',
    number: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  };

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly latinNameRegex = /^[A-Za-z]+$/;
  private readonly passwordRegex =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{6,}$/;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
      this.avatarUrl = this.resolveAvatar(user);

      if (user) {
        this.editModel = {
          name: user.name || '',
          family: user.family || '',

          city: user.city || '',
          birthDate: this.formatBirthDate(user.birthDate),
          currentPassword: '',
        };

        this.accountSettingsModel = {
          email: user.email || '',
          countryCode: user.countryCode || '+',
          number: user.number || '',
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        };
      }
    });
  }

  // ... (rest of the file)

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
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

  startEdit() {
    if (!this.user || this.user.isGuest) {
      alert('Guests cannot edit information. Please sign in first.');
      return;
    }

    this.editModel = {
      name: this.user.name || '',
      family: this.user.family || '',

      city: this.user.city || '',
      birthDate: this.formatBirthDate(this.user.birthDate),
      currentPassword: '', // كل مرة نفتح الفورم نفرّغ الباسورد
    };

    this.editMode = true;
    this.accountSettingsMode = false;
  }

  openAccountSettings() {
    if (!this.user || this.user.isGuest) {
      alert('Guests do not have account settings to edit.');
      return;
    }

    this.accountSettingsModel = {
      email: this.user.email || '',
      countryCode: this.user.countryCode || '+',
      number: this.user.number || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };

    this.accountSettingsMode = true;
    this.editMode = false;

    this.accountSubmitted = false;
  }

  cancelEdit() {
    this.editMode = false;
    this.accountSettingsMode = false;
    this.accountSubmitted = false;
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

    const name = this.editModel.name.trim();
    const family = this.editModel.family.trim();
    const city = this.editModel.city.trim();
    const birthDate = this.getBirthDateForPayload();

    if (!name) {
      alert('Name is required.');
      return;
    }
    if (name.length < 3 || name.length > 30 || !this.latinNameRegex.test(name)) {
      alert('Name must be 3–30 letters using A–Z only.');
      return;
    }

    if (!family) {
      alert('Family name is required.');
      return;
    }
    if (family.length < 3 || family.length > 30 || !this.latinNameRegex.test(family)) {
      alert('Family name must be 3–30 letters using A–Z only.');
      return;
    }

    if (!city) {
      alert('City is required.');
      return;
    }
    if (city.length < 2 || city.length > 50) {
      alert('City name must be between 2 and 50 characters.');
      return;
    }

    if (!birthDate) {
      alert('Date of birth is required.');
      return;
    }
    if (!this.isValidAgeRange(birthDate)) {
      alert('Age must be between 12 and 100.');
      return;
    }

    const payload: UpdateProfileRequest = {
      name,
      family,
      city,
      birthDate,
      currentPassword: this.editModel.currentPassword,
    };

    this.authService.updateProfile(payload).subscribe({
      next: (updated: User) => {
        this.user = updated;

        // نفرّغ الباسورد بعد الحفظ
        this.editModel.currentPassword = '';

        console.log('Profile updated:', updated);
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
    this.accountSubmitted = true;
    if (!this.user || this.user.isGuest || !this.user.id) {
      alert('Guests cannot save account settings.');
      return;
    }

    // 🔐 أيضاً هنا: لا يُسمح بأي تعديل بدون كلمة السر الحالية
    if (!this.accountSettingsModel.currentPassword) {
      alert('Please enter your current password to save changes.');
      return;
    }

    const email = this.accountSettingsModel.email.trim();
    const countryCode = this.accountSettingsModel.countryCode.trim();
    const number = this.accountSettingsModel.number.trim();

    if (!email) {
      alert('Email is required.');
      return;
    }
    if (!this.emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!number) {
      alert('Phone number is required.');
      return;
    }
    if (!/^[0-9]{7,15}$/.test(number)) {
      alert('Only digits allowed (7–15 characters).');
      return;
    }

    if (!countryCode || countryCode === '+') {
      alert('Country code is required.');
      return;
    }

    if (
      this.accountSettingsModel.newPassword &&
      this.accountSettingsModel.newPassword !== this.accountSettingsModel.confirmNewPassword
    ) {
      alert('New password and confirm password do not match.');
      return;
    }

    if (this.accountSettingsModel.newPassword) {
      if (this.accountSettingsModel.newPassword.length > 50) {
        alert('Password must be at most 50 characters.');
        return;
      }
      if (!this.passwordRegex.test(this.accountSettingsModel.newPassword)) {
        alert(
          'Password must be at least 6 characters and include 1 uppercase letter, 1 number, and 1 symbol (A–Z only).'
        );
        return;
      }
    }

    const payload: UpdateAccountSettingsRequest = {
      email,
      countryCode,
      number,
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
        this.accountSubmitted = false;
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

    const confirmed = confirm(
      'Are you sure you want to delete this account? This action cannot be undone.'
    );
    if (!confirmed) return;

    const password = prompt('Please enter your password to confirm deletion:');
    if (!password) return;

    this.authService.deleteAccount(password).subscribe({
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

  private formatBirthDate(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toISOString().split('T')[0];
  }

  get canEditBirthDate(): boolean {
    return this.user?.canEditBirthDate !== false;
  }

  private getBirthDateForPayload(): string {
    if (this.canEditBirthDate) {
      return this.editModel.birthDate;
    }
    return this.formatBirthDate(this.user?.birthDate);
  }

  private isValidAgeRange(value: string): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    const todayUtc = new Date();
    const todayYear = todayUtc.getUTCFullYear();
    const todayMonth = todayUtc.getUTCMonth();
    const todayDay = todayUtc.getUTCDate();
    const birthYear = date.getUTCFullYear();
    const birthMonth = date.getUTCMonth();
    const birthDay = date.getUTCDate();
    let age = todayYear - birthYear;
    const monthDiff = todayMonth - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && todayDay < birthDay)) {
      age -= 1;
    }
    return age >= 12 && age <= 100;
  }
}
