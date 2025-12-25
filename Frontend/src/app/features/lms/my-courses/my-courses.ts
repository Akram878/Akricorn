import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { PublicCoursesService, MyCourse } from '../../../core/services/public-courses.service';
import { AuthService } from '../../../core/services/auth.service';
import { resolveMediaUrl } from '../../../core/utils/media-url';

import { Router } from '@angular/router';
import { CourseCardComponent } from '../course-card/course-card';
@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, DatePipe, CourseCardComponent],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses implements OnInit, OnDestroy {
  myCourses: MyCourse[] = [];
  filteredMyCourses: MyCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // خيارات الفئات الموجودة فعلياً
  categories: string[] = [];
  courseThumbnails: Record<number, string> = {};
  private thumbnailObjectUrls: Map<number, string> = new Map();
  private thumbnailSubscriptions: Map<number, Subscription> = new Map();
  // فلاتر
  minHours: number | null = null;
  selectedCategory: string = 'all';

  constructor(
    private publicCoursesService: PublicCoursesService,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

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

  ngOnDestroy(): void {
    this.resetThumbnails();
  }

  loadMyCourses(): void {
    this.isLoading = true;
    this.error = null;

    this.publicCoursesService.getMyCourses().subscribe({
      next: (data: MyCourse[]) => {
        this.resetThumbnails();
        this.myCourses = data;
        this.buildFilterOptions();
        this.applyFilters();
        this.loadCourseThumbnails(this.myCourses);
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

  private loadCourseThumbnails(courses: MyCourse[]): void {
    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    for (const course of courses) {
      if (!course.thumbnailUrl || this.courseThumbnails[course.id]) {
        continue;
      }

      const resolvedUrl = resolveMediaUrl(course.thumbnailUrl);
      const subscription = this.http.get(resolvedUrl, { responseType: 'blob', headers }).subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.courseThumbnails[course.id] = objectUrl;
          this.thumbnailObjectUrls.set(course.id, objectUrl);
        },
        error: () => {
          // ignore thumbnail errors to avoid console noise
        },
      });

      this.thumbnailSubscriptions.set(course.id, subscription);
    }
  }

  private resetThumbnails(): void {
    for (const subscription of this.thumbnailSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.thumbnailSubscriptions.clear();

    for (const objectUrl of this.thumbnailObjectUrls.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    this.thumbnailObjectUrls.clear();
    this.courseThumbnails = {};
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
