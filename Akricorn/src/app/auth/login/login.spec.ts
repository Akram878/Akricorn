import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  constructor(private router: Router) {}

  switchToRegister(event: Event) {
    event.preventDefault();
    this.router.navigate(['/auth/register']);
  }
}
