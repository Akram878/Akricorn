import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html', // 👈 استخدم ملف HTML خارجي
  styleUrls: ['./login.scss'],
})
export class Login {
  constructor(private router: Router, private route: ActivatedRoute) {}

  switchToRegister(event?: Event) {
    if (event) event.preventDefault();
    this.router.navigate(['/auth/register']);
  }
}
