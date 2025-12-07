import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-lms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './lms.html',
  styleUrls: ['./lms.scss'],
})
export class LMS {}
