import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  email: string = '';
  password: string = '';
  loading: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  switchToRegister(event: Event) {
    event.preventDefault();
    this.router.navigate(['/auth', 'sign']);
  }

  login(form: NgForm) {
    // لا نعمل أي فاليديشن في الواجهة؛ الباك إند هو الذي يتحقق من صحة المدخلات
    this.loading = true;

    const emailTrimmed = this.email.trim();

    this.authService.login(emailTrimmed, this.password).subscribe({
      next: (user: User) => {
        this.authService.setUser(user);
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        console.error(err);
        alert('Login failed: ' + (err?.error?.message || err.message || 'Unknown error'));
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
