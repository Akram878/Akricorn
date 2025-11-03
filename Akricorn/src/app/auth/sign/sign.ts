import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sign',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sign.html',
  styleUrls: ['./sign.scss'],
})
export class Sign {
  constructor(private router: Router) {}

  switchToLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/auth/login']);
  }
}
