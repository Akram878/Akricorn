import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sign.html',
  styleUrls: ['./sign.scss'],
})
export class Sign {
  name: string = '';
  family: string = '';
  countryCode: string = '+20';
  number: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  // 🆕 الحقول الجديدة
  city: string = '';
  birthDate: string = ''; // من input[type="date"]

  acceptedPolicy: boolean = false;

  loading: boolean = false;
  passwordMismatch: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  switchToLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/auth', 'login']);
  }

  // 🔹 تحدّث حالة التطابق كلما تغيّرت كلمة السر
  onPasswordChange(value: string) {
    this.password = value;
    this.updatePasswordMismatch();
  }

  // 🔹 تحدّث حالة التطابق كلما تغيّر تأكيد كلمة السر
  onConfirmPasswordChange(value: string) {
    this.confirmPassword = value;
    this.updatePasswordMismatch();
  }

  // 🔹 دالة مشتركة لحساب التطابق
  private updatePasswordMismatch() {
    // لو واحد منهم فاضي ما نعرض خطأ التطابق (خلي المستخدم يكتب براحته)
    if (!this.password || !this.confirmPassword) {
      this.passwordMismatch = false;
      return;
    }

    this.passwordMismatch = this.password !== this.confirmPassword;
  }

  signup(form: NgForm) {
    // تأكد أن حالة التطابق محدثة قبل التحقق النهائي
    this.updatePasswordMismatch();

    // تحقق من الفورم + تطابق كلمة السر
    if (form.invalid || this.passwordMismatch) {
      form.control.markAllAsTouched();
      return;
    }

    this.loading = true;

    const user: User = {
      name: this.name.trim(),
      family: this.family.trim(),
      countryCode: this.countryCode,
      number: this.number.trim(),
      email: this.email.trim(),
      password: this.password,

      // 🆕 إرسال المدينة وتاريخ الميلاد
      city: this.city.trim(),
      birthDate: this.birthDate, // string بالشكل YYYY-MM-DD
    };

    this.authService.signup(user).subscribe({
      next: (createdUser: User) => {
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        console.error(err);
        alert('Sign up failed: ' + (err?.error?.message || err.message || 'Unknown error'));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
