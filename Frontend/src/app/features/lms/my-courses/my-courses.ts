import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Subscription } from 'rxjs';
import { PublicCoursesService, MyCourse } from '../../../core/services/public-courses.service';
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
  myCourses: MyCourse[] = [];
  filteredMyCourses: MyCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // خيارات الفئات الموجودة فعلياً
  categories: string[] = [];

  courseThumbnails: Record<number, string> = {};

  private authSubscription?: Subscription;
  // فلاتر
  minHours: number | null = null;
  selectedCategory: string = 'all';

  constructor(
    private publicCoursesService: PublicCoursesService,

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
    this.publicCoursesService.getMyCourses().subscribe({
      next: (data: MyCourse[]) => {
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
    if (!this.authService.isAuthenticated()) {
      return;
    }

    for (const course of courses) {
      if (!course.thumbnailUrl?.trim() || this.courseThumbnails[course.id]) {
        continue;
      }

      this.courseThumbnails[course.id] = resolveMediaUrl(course.thumbnailUrl);
    }
  }

  private resetThumbnails(): void {
    this.courseThumbnails = {};
  }
  private resetState(): void {
    this.isLoading = false;
    this.error = null;
    this.myCourses = [];
    this.filteredMyCourses = [];
    this.categories = [];
  }
}
