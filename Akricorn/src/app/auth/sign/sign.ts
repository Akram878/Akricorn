import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './sign.html',
  styleUrls: ['./sign.scss'],
})
export class Sign {
  name = '';
  family = '';
  countryCode = '+20';
  number = '';
  email = '';
  password = '';
  acceptedPolicy = false;

  constructor(private router: Router, private authService: AuthService) {}

  switchToLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/auth/login']);
  }

  signup() {
    const user: User = {
      name: this.name,
      family: this.family,
      countryCode: this.countryCode,
      number: this.number,
      email: this.email,
      password: this.password,
    };

    this.authService.signup(user).subscribe({
      next: () => {
        this.authService.setUser(user); // تسجيل المستخدم بعد التسجيل مباشرة
        this.router.navigate(['/home']); // إعادة التوجيه للهوم
      },
      error: (err) => {
        console.error(err);
        alert('Error: ' + (err.error?.message || err.message));
      },
    });
  }
}
