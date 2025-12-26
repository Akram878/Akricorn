import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DecimalPipe } from '@angular/common';

import { FormsModule } from '@angular/forms'; // 👈 مهم جداً
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  PublicCoursesService,
  PublicCourse,
  MyCourse,
} from '../../../core/services/public-courses.service';

import { AuthService } from '../../../core/services/auth.service';
import { resolveMediaUrl } from '../../../core/utils/media-url';
import { CourseCardComponent } from '../course-card/course-card';

@Component({
  selector: 'app-lms-courses',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    DecimalPipe,
    FormsModule, // 👈 هنا نضيف الـ FormsModule
    CourseCardComponent,
  ],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
})
export class Courses implements OnInit, OnDestroy {
  // كل الكورسات من الباك إند
  courses: PublicCourse[] = [];

  // الكورسات بعد تطبيق الفلاتر
  filteredCourses: PublicCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // IDs للكورسات المملوكة
  private ownedCourseIds: Set<number> = new Set<number>();
  courseThumbnails: Record<number, string> = {};
  private thumbnailObjectUrls: Map<number, string> = new Map();
  private thumbnailSubscriptions: Map<number, Subscription> = new Map();
  private authSubscription?: Subscription;
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

    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCourses();
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.loadMyCourses();
      } else {
        this.ownedCourseIds.clear();
      }
    });
  }

  ngOnDestroy(): void {
    this.resetThumbnails();
    this.authSubscription?.unsubscribe();
  }

  // ============================
  //       Load data
  // ============================
  loadCourses(): void {
    this.isLoading = true;
    this.error = null;

    this.publicCoursesService.getCourses().subscribe({
      next: (data) => {
        this.resetThumbnails();
        this.courses = data;
        this.buildFilterOptions();
        this.applyFilters();
        this.loadCourseThumbnails(this.courses);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'حدث خطأ أثناء تحميل الكورسات. حاول مرة أخرى لاحقاً.';
        this.isLoading = false;
      },
    });
  }

  loadMyCourses(): void {
    if (!this.authService.isAuthenticated()) {
      this.ownedCourseIds.clear();
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

  onCoursePurchased(courseId: number): void {
    this.ownedCourseIds.add(courseId);
  }
  private loadCourseThumbnails(courses: PublicCourse[]): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    for (const course of courses) {
      if (!course.thumbnailUrl || this.courseThumbnails[course.id]) {
        continue;
      }

      const resolvedUrl = resolveMediaUrl(course.thumbnailUrl);
      const subscription = this.http.get(resolvedUrl, { responseType: 'blob' }).subscribe({
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
}
