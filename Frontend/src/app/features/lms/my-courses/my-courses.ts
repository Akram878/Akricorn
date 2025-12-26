import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  PublicCoursesService,
  MyCourse,
  PublicCourse,
} from '../../../core/services/public-courses.service';
import { AuthService } from '../../../core/services/auth.service';
import { resolveMediaUrl } from '../../../core/utils/media-url';

import { CourseCardComponent } from '../course-card/course-card';
@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, DatePipe, CourseCardComponent],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses implements OnInit, OnDestroy {
  myCourses: PublicCourse[] = [];
  filteredMyCourses: PublicCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // خيارات الفئات الموجودة فعلياً
  categories: string[] = [];
  private ownedCourseIds: Set<number> = new Set<number>();
  courseThumbnails: Record<number, string> = {};
  private thumbnailObjectUrls: Map<number, string> = new Map();
  private thumbnailSubscriptions: Map<number, Subscription> = new Map();
  private authSubscription?: Subscription;
  // فلاتر
  minHours: number | null = null;
  selectedCategory: string = 'all';

  constructor(
    private publicCoursesService: PublicCoursesService,

    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.loadMyCourses();
      } else {
        this.resetState();
      }
    });
  }

  ngOnDestroy(): void {
    this.resetThumbnails();
    this.authSubscription?.unsubscribe();
  }

  loadMyCourses(): void {
    if (!this.authService.isAuthenticated()) {
      this.resetState();
      return;
    }
    this.isLoading = true;
    this.error = null;
    this.publicCoursesService.getCourses().subscribe({
      next: (data: PublicCourse[]) => {
        this.resetThumbnails();
        this.myCourses = data;
        this.buildFilterOptions();
        this.applyFilters();
        this.loadCourseThumbnails(this.myCourses);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'حدث خطأ أثناء تحميل كورساتك. حاول مرة أخرى لاحقاً.';
        this.isLoading = false;
      },
    });

    this.loadOwnedCourses();
  }

  private loadOwnedCourses(): void {
    this.publicCoursesService.getMyCourses().subscribe({
      next: (data: MyCourse[]) => {
        this.ownedCourseIds = new Set(data.map((course) => course.id));
      },
      error: () => {
        this.ownedCourseIds.clear();
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

  trackByCourseId(index: number, course: PublicCourse): number {
    return course.id;
  }

  isCourseOwned(course: PublicCourse): boolean {
    return this.ownedCourseIds.has(course.id);
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
  private resetState(): void {
    this.isLoading = false;
    this.error = null;
    this.myCourses = [];
    this.filteredMyCourses = [];
    this.categories = [];
    this.ownedCourseIds.clear();
  }
}
