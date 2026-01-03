import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';

import { Subscription } from 'rxjs';
import {
  PublicCoursesService,
  PublicCourse,
  MyCourse,
} from '../../../core/services/public-courses.service';

import { AuthService } from '../../../core/services/auth.service';

import { CourseCardComponent } from '../course-card/course-card';
import { LmsFiltersComponent } from '../../../shared/components/lms-filters/lms-filters';
import {
  applyFilters as applyFilterSet,
  buildFilterState,
} from '../../../shared/components/lms-filters/lms-filters.utils';
import {
  FilterDefinition,
  FilterState,
} from '../../../shared/components/lms-filters/lms-filters.types';
import { buildCourseFilters } from '../filters/lms-filter-config';

@Component({
  selector: 'app-lms-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, CourseCardComponent, LmsFiltersComponent],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
})
export class Courses implements OnInit, OnDestroy {
  // All courses from the back end
  courses: PublicCourse[] = [];

  // Courses after applying filters
  filteredCourses: PublicCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // IDs of owned courses
  private ownedCourseIds: Set<number> = new Set<number>();

  private authSubscription?: Subscription;

  filters: FilterDefinition<PublicCourse>[] = [];
  filterState: FilterState = {};

  constructor(
    private publicCoursesService: PublicCoursesService,

    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCourses();
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.loadMyCourses();
      } else {
        this.ownedCourseIds.clear();
        this.applyFilters(this.filterState);
      }
    });
  }

  ngOnDestroy(): void {
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
        this.courses = data;
        this.filters = buildCourseFilters(data);
        this.filterState = buildFilterState(this.filters);
        this.applyFilters(this.filterState);

        this.isLoading = false;
      },
      error: () => {
        this.error = 'An error occurred while loading the courses. Please try again later.';
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
        this.applyFilters(this.filterState);
      },
      error: () => {
        // Ignore the error here because filters and courses work even without MyCourses
      },
    });
  }

  // ============================
  //       Filtering logic
  // ============================
  applyFilters(state: FilterState): void {
    this.filterState = state;
    this.filteredCourses = applyFilterSet(this.getAvailableCourses(), this.filters, state);
  }

  // Reset all filters at once
  resetFilters(): void {
    this.filterState = buildFilterState(this.filters);
    this.filteredCourses = applyFilterSet(
      this.getAvailableCourses(),
      this.filters,
      this.filterState
    );
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
    this.applyFilters(this.filterState);
  }

  private getAvailableCourses(): PublicCourse[] {
    return this.courses.filter((course) => !this.ownedCourseIds.has(course.id));
  }
}
