import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicCoursesService, MyCourse } from '../../../core/services/public-courses.service';

import { Router } from '@angular/router';
@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, DatePipe],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses implements OnInit {
  myCourses: MyCourse[] = [];
  filteredMyCourses: MyCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // خيارات الفئات الموجودة فعلياً
  categories: string[] = [];

  // فلاتر
  minHours: number | null = null;
  selectedCategory: string = 'all';

  constructor(private publicCoursesService: PublicCoursesService, private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('auth_token');

    if (!token || this.isTokenExpired(token)) {
      this.router.navigate(['/auth/sign'], {
        queryParams: { returnUrl: '/lms/my-courses' },
      });
      return;
    }
    this.loadMyCourses();
  }

  loadMyCourses(): void {
    this.isLoading = true;
    this.error = null;

    this.publicCoursesService.getMyCourses().subscribe({
      next: (data: MyCourse[]) => {
        this.myCourses = data;
        this.buildFilterOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading my courses', err);
        this.error = 'حدث خطأ أثناء تحميل كورساتك. حاول مرة أخرى لاحقاً.';
        this.isLoading = false;
      },
    });
  }

  private buildFilterOptions(): void {
    const catSet = new Set<string>();

    for (const c of this.myCourses) {
      if (c.category && c.category.trim() !== '') {
        catSet.add(c.category);
      }
    }

    this.categories = Array.from(catSet).sort();
  }

  applyFilters(): void {
    this.filteredMyCourses = this.myCourses.filter((c) => {
      // الساعات (لو null نخليه 0)
      const hours = c.hours != null ? c.hours : 0;
      if (this.minHours != null && hours < this.minHours) {
        return false;
      }

      // الفئة
      if (this.selectedCategory !== 'all') {
        const cat = c.category || '';
        if (cat !== this.selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }

  resetFilters(): void {
    this.minHours = null;
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  trackByCourseId(index: number, course: MyCourse): number {
    return course.id;
  }

  // مجرد placeholder لو حبّينا نضيف زر "Open course"
  openCourse(course: MyCourse): void {
    this.router.navigate(['/lms/my-courses', course.id]);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadSegment = token.split('.')[1];
      if (!payloadSegment) {
        return true;
      }

      const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '='
      );
      const payload = JSON.parse(atob(padded));

      if (!payload?.exp) {
        return true;
      }

      const expiryMs = payload.exp * 1000;
      return Date.now() >= expiryMs;
    } catch {
      return true;
    }
  }
}
