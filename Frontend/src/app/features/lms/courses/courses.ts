import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 👈 مهم جداً
import {
  PublicCoursesService,
  PublicCourse,
  MyCourse,
} from '../../../core/services/public-courses.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-lms-courses',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    DecimalPipe,
    FormsModule, // 👈 هنا نضيف الـ FormsModule
  ],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
})
export class Courses implements OnInit {
  // كل الكورسات من الباك إند
  courses: PublicCourse[] = [];

  // الكورسات بعد تطبيق الفلاتر
  filteredCourses: PublicCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // لمنع الضغط المكرر على زر الشراء
  processingCourseId: number | null = null;

  // IDs للكورسات المملوكة
  private ownedCourseIds: Set<number> = new Set<number>();

  // خيارات الفلترة (قائمة قيم موجودة فعلياً في الكورسات)
  categories: string[] = [];
  paths: string[] = [];

  // قيم الفلاتر
  priceMin: number | null = null;
  priceMax: number | null = null;

  minHours: number | null = null;

  selectedCategory: string = 'all';
  selectedPath: string = 'all';

  minRating: number | null = null;

  constructor(
    private publicCoursesService: PublicCoursesService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCourses();
    this.loadMyCourses();
  }

  // ============================
  //       Load data
  // ============================
  loadCourses(): void {
    this.isLoading = true;
    this.error = null;

    this.publicCoursesService.getCourses().subscribe({
      next: (data) => {
        this.courses = data;
        this.buildFilterOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'حدث خطأ أثناء تحميل الكورسات. حاول مرة أخرى لاحقاً.';
        this.isLoading = false;
      },
    });
  }

  loadMyCourses(): void {
    const token = localStorage.getItem('auth_token');

    // لو ما في توكن أو التوكن منتهي الصلاحية → لا تطلب /my-courses حتى لا يظهر تنبيه انتهاء الجلسة للضيوف
    if (!token || this.isTokenExpired(token)) {
      return;
    }
    this.publicCoursesService.getMyCourses().subscribe({
      next: (data: MyCourse[]) => {
        this.ownedCourseIds = new Set(data.map((c) => c.id));
      },
      error: () => {
        // نطنش الخطأ هنا، لأن الفلاتر والكورسات تعمل حتى بدون MyCourses
      },
    });
  }

  // بناء خيارات الفلترة (categories + paths) من الداتا الموجودة
  private buildFilterOptions(): void {
    const categorySet = new Set<string>();
    const pathSet = new Set<string>();

    for (const c of this.courses) {
      if (c.category && c.category.trim() !== '') {
        categorySet.add(c.category);
      }
      if (c.pathTitle && c.pathTitle.trim() !== '') {
        pathSet.add(c.pathTitle);
      }
    }

    this.categories = Array.from(categorySet).sort();
    this.paths = Array.from(pathSet).sort();
  }

  // فحص انتهاء صلاحية الـ JWT حتى لا نرسل طلبات مصادقة بتوكن منتهي
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
    } catch (e) {
      console.error('Failed to decode token for expiry check', e);
      return true;
    }
  }

  // ============================
  //       Filtering logic
  // ============================
  applyFilters(): void {
    this.filteredCourses = this.courses.filter((c) => {
      // price
      if (this.priceMin != null && c.price < this.priceMin) {
        return false;
      }
      if (this.priceMax != null && c.price > this.priceMax) {
        return false;
      }

      // hours (لو مش راجع من الباك إند نعتبره 0)
      const hours = c.hours != null ? c.hours : 0;
      if (this.minHours != null && hours < this.minHours) {
        return false;
      }

      // category
      if (this.selectedCategory !== 'all') {
        const cat = c.category || '';
        if (cat !== this.selectedCategory) {
          return false;
        }
      }

      // path
      if (this.selectedPath !== 'all') {
        const path = c.pathTitle || '';
        if (path !== this.selectedPath) {
          return false;
        }
      }

      // rating (لو مش راجع من الباك إند نعتبره 0)
      const rating = c.rating != null ? c.rating : 0;
      if (this.minRating != null && rating < this.minRating) {
        return false;
      }

      return true;
    });
  }

  // Reset all filters at once
  resetFilters(): void {
    this.priceMin = null;
    this.priceMax = null;
    this.minHours = null;
    this.selectedCategory = 'all';
    this.selectedPath = 'all';
    this.minRating = null;

    this.applyFilters();
  }

  // ============================
  //         Helpers
  // ============================
  isCourseOwned(course: PublicCourse): boolean {
    return this.ownedCourseIds.has(course.id);
  }

  trackByCourseId(index: number, course: PublicCourse): number {
    return course.id;
  }

  // ============================
  //      Purchase logic
  // ============================
  onPurchase(course: PublicCourse): void {
    // لو الكورس مملوك → ودّيه مباشرة إلى My Courses
    if (this.isCourseOwned(course)) {
      this.router.navigate(['/lms/my-courses']);
      return;
    }

    if (this.processingCourseId) {
      return;
    }

    this.processingCourseId = course.id;

    this.publicCoursesService.purchaseCourse(course.id).subscribe({
      next: () => {
        this.notification.showSuccess('Course purchased successfully.');
        this.ownedCourseIds.add(course.id); // يظهر Owned بدون ريفرش
        this.processingCourseId = null;
      },
      error: (err) => {
        if (err?.status === 401) {
          this.notification.showError('Please log in to purchase this course.');
        } else if (err?.error?.message) {
          this.notification.showError(err.error.message);
        } else {
          this.notification.showError('Failed to purchase course.');
        }

        this.processingCourseId = null;
      },
    });
  }
}
