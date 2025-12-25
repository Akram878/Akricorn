import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';
const LATIN_NAME_PATTERN = /^[A-Za-z]+$/;
const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{6,}$/;

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = `${control.value ?? ''}`.trim();
  return value ? null : { required: true };
};

const trimmedMinLength = (minLength: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = `${control.value ?? ''}`.trim();
    if (!value) {
      return null;
    }
    return value.length >= minLength
      ? null
      : { minlength: { requiredLength: minLength, actualLength: value.length } };
  };
};

const latinLettersOnly: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = `${control.value ?? ''}`.trim();
  if (!value) {
    return null;
  }
  return LATIN_NAME_PATTERN.test(value) ? null : { latinOnly: true };
};

const ageRangeValidator = (minAge: number, maxAge: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const birthDate = new Date(value);
    if (Number.isNaN(birthDate.getTime())) {
      return { invalidDate: true };
    }
    const todayUtc = new Date();
    const todayYear = todayUtc.getUTCFullYear();
    const todayMonth = todayUtc.getUTCMonth();
    const todayDay = todayUtc.getUTCDate();
    const birthYear = birthDate.getUTCFullYear();
    const birthMonth = birthDate.getUTCMonth();
    const birthDay = birthDate.getUTCDate();
    let age = todayYear - birthYear;
    const monthDiff = todayMonth - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && todayDay < birthDay)) {
      age -= 1;
    }
    return age >= minAge && age <= maxAge ? null : { ageOutOfRange: true };
  };
};

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value ?? '';
  const confirmPassword = group.get('confirmPassword')?.value ?? '';
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sign.html',
  styleUrls: ['./sign.scss'],
})
export class Sign {
  signForm: FormGroup;
  loading: boolean = false;
  submitted: boolean = false;
  showPrivacyPolicy: boolean = false;

  constructor(private authService: AuthService, private router: Router, private fb: FormBuilder) {
    this.signForm = this.fb.group(
      {
        name: [
          '',
          [trimmedRequired, trimmedMinLength(3), latinLettersOnly, Validators.maxLength(30)],
        ],
        family: [
          '',
          [trimmedRequired, trimmedMinLength(3), latinLettersOnly, Validators.maxLength(30)],
        ],
        countryCode: ['+20', [Validators.required]],
        number: ['', [trimmedRequired, Validators.pattern(/^[0-9]{7,15}$/)]],
        email: ['', [trimmedRequired, Validators.email]],
        city: ['', [trimmedRequired, trimmedMinLength(2), Validators.maxLength(50)]],
        birthDate: ['', [Validators.required, ageRangeValidator(12, 100)]],
        password: [
          '',
          [Validators.required, Validators.pattern(PASSWORD_REGEX), Validators.maxLength(50)],
        ],
        confirmPassword: ['', [Validators.required]],
        acceptedPolicy: [false, [Validators.requiredTrue]],
      },
      { validators: passwordMatchValidator }
    );
  }

  get nameCtrl() {
    return this.signForm.get('name');
  }
  get familyCtrl() {
    return this.signForm.get('family');
  }
  get countryCodeCtrl() {
    return this.signForm.get('countryCode');
  }

  get numberCtrl() {
    return this.signForm.get('number');
  }

  get emailCtrl() {
    return this.signForm.get('email');
  }

  get cityCtrl() {
    return this.signForm.get('city');
  }

  get birthDateCtrl() {
    return this.signForm.get('birthDate');
  }

  get passwordCtrl() {
    return this.signForm.get('password');
  }

  get confirmPasswordCtrl() {
    return this.signForm.get('confirmPassword');
  }

  get policyCtrl() {
    return this.signForm.get('acceptedPolicy');
  }

  switchToLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/auth', 'login']);
  }

  openPrivacyPolicy(event: Event) {
    event.preventDefault();
    this.showPrivacyPolicy = true;
  }

  closePrivacyPolicy() {
    this.showPrivacyPolicy = false;
  }
  signup() {
    this.submitted = true;
    if (this.signForm.invalid) {
      this.signForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const formValue = this.signForm.getRawValue();

    const user: User = {
      name: formValue.name.trim(),
      family: formValue.family.trim(),
      countryCode: formValue.countryCode,
      number: formValue.number.trim(),
      email: formValue.email.trim(),
      password: formValue.password,
      city: formValue.city.trim(),
      birthDate: formValue.birthDate,
      confirmPassword: formValue.confirmPassword,
    };

    this.authService
      .signup(user)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (createdUser: User) => {
          this.router.navigate(['/home']);
        },
        error: (err: any) => {
          console.error(err);
          alert('Sign up failed: ' + (err?.error?.message || err.message || 'Unknown error'));
        },
      });
  }
}
