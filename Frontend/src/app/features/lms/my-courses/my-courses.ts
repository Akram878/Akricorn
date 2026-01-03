import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';

import { Subscription } from 'rxjs';
import { PublicCoursesService, MyCourse } from '../../../core/services/public-courses.service';
import { AuthService } from '../../../core/services/auth.service';
import { resolveMediaUrl } from '../../../core/utils/media-url';

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
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, CourseCardComponent, LmsFiltersComponent],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses implements OnInit, OnDestroy {
  myCourses: MyCourse[] = [];
  filteredMyCourses: MyCourse[] = [];

  isLoading = false;
  error: string | null = null;

  courseThumbnails: Record<number, string> = {};

  private authSubscription?: Subscription;
  filters: FilterDefinition<MyCourse>[] = [];
  filterState: FilterState = {};

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
        this.filters = buildCourseFilters(data);
        this.filterState = buildFilterState(this.filters);
        this.applyFilters(this.filterState);
        this.loadCourseThumbnails(this.myCourses);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'An error occurred while loading your courses. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  applyFilters(state: FilterState): void {
    this.filterState = state;
    this.filteredMyCourses = applyFilterSet(this.myCourses, this.filters, state);
  }

  resetFilters(): void {
    this.filterState = buildFilterState(this.filters);
    this.filteredMyCourses = applyFilterSet(this.myCourses, this.filters, this.filterState);
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
    this.filters = [];
    this.filterState = {};
  }
}
