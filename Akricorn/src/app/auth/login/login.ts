import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  email = '';
  password = '';

  constructor(private router: Router, private authService: AuthService) {}

  switchToRegister(event?: Event) {
    if (event) event.preventDefault();
    this.router.navigate(['/auth/register']);
  }

  login() {
    this.authService.login(this.email, this.password).subscribe({
      next: (res: any) => {
        const user: User = {
          email: this.email,
          name: res.name, // يجب أن ترسل الـ backend اسم المستخدم عند تسجيل الدخول
          family: res.family, // إذا كان موجودًا
          number: res.number, // حسب البيانات المتاحة
        };
        this.authService.setUser(user);

        this.router.navigate(['/home']); // إعادة التوجيه بعد تسجيل الدخول
      },
      error: (err) => {
        console.error(err);
        alert('Login failed: ' + (err.error?.message || err.message));
      },
    });
  }
}
