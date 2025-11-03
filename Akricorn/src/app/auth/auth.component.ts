import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Login } from './login/login';
import { Sign } from './sign/sign';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, Login, Sign],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class Auth {}
