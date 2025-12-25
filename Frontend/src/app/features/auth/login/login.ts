import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  loginForm: FormGroup;
  loading: boolean = false;
  submitted: boolean = false;

  constructor(private authService: AuthService, private router: Router, private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get emailCtrl() {
    return this.loginForm.get('email');
  }

  get passwordCtrl() {
    return this.loginForm.get('password');
  }
  switchToRegister(event: Event) {
    event.preventDefault();
    this.router.navigate(['/auth', 'sign']);
  }

  login() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;

    const emailTrimmed = `${this.emailCtrl?.value ?? ''}`.trim();
    const password = `${this.passwordCtrl?.value ?? ''}`;

    this.authService
      .login(emailTrimmed, password)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (user: User) => {
          this.authService.setUser(user);
          this.router.navigate(['/home']);
        },
        error: (err: any) => {
          console.error(err);
          alert('Login failed: ' + (err?.error?.message || err.message || 'Unknown error'));
        },
      });
  }
}
