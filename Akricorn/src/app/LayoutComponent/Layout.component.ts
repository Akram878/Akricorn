import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-Layout',
  standalone: true, // مهم جدًا
  imports: [CommonModule, RouterModule], // 👈 هنا تضيف RouterModule
  templateUrl: './Layout.component.html',
  styleUrls: ['./Layout.component.scss'],
})
export class LayoutComponent {}
