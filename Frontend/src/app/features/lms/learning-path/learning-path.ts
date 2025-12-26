import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PublicLearningPathsService,
  PublicLearningPath,
  LearningPathCourseSummary,
} from '../../../core/services/public-learning-paths.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { LmsFiltersComponent } from '../../../shared/components/lms-filters/lms-filters';
import {
  applyFilters as applyFilterSet,
  buildFilterState,
} from '../../../shared/components/lms-filters/lms-filters.utils';
import {
  FilterDefinition,
  FilterState,
} from '../../../shared/components/lms-filters/lms-filters.types';
import { buildLearningPathFilters } from '../filters/lms-filter-config';

interface UiLearningPath {
  id: number;
  title: string;
  description: string;
  coursesCount: number;
  completedCourses: number;
  completionPercent: number;
  courses: UiLearningPathCourse[];
  isExpanded: boolean;
}

interface UiLearningPathCourse {
  id: number;
  title: string;
  isCompleted: boolean;
  order: number;
}

@Component({
  selector: 'app-lms-learning-path',
  standalone: true,
  imports: [CommonModule, LmsFiltersComponent],
  templateUrl: './learning-path.html',
  styleUrls: ['./learning-path.scss'],
})
export class LearningPath implements OnInit, OnDestroy {
  paths: UiLearningPath[] = [];
  filteredPaths: UiLearningPath[] = [];
  isLoading = false;
  error: string | null = null;
  filters: FilterDefinition<UiLearningPath>[] = [];
  filterState: FilterState = {};
  private authSubscription?: Subscription;

  constructor(private pathsService: PublicLearningPathsService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadPaths();
    this.authSubscription = this.authService.isAuthenticated$.subscribe(() => {
      this.loadPaths();
    });
  }

  loadPaths(): void {
    this.isLoading = true;
    this.error = null;

    this.pathsService.getPaths().subscribe({
      next: (data: PublicLearningPath[]) => {
        this.paths = data.map((p) => this.mapPath(p));
        this.filters = buildLearningPathFilters(this.paths);
        this.filterState = buildFilterState(this.filters);
        this.applyFilters(this.filterState);

        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load learning paths. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  togglePath(path: UiLearningPath): void {
    path.isExpanded = !path.isExpanded;
  }

  applyFilters(state: FilterState): void {
    this.filterState = state;
    this.filteredPaths = applyFilterSet(this.paths, this.filters, state);
  }

  resetFilters(): void {
    this.filterState = buildFilterState(this.filters);
    this.filteredPaths = applyFilterSet(this.paths, this.filters, this.filterState);
  }

  trackByPathId(index: number, path: UiLearningPath): number {
    return path.id;
  }
  trackByCourseId(index: number, course: UiLearningPathCourse): number {
    return course.id;
  }

  private mapPath(path: PublicLearningPath): UiLearningPath {
    const courses = (path.courses ?? [])
      .map((course: LearningPathCourseSummary) => ({
        id: course.courseId,
        title: course.title,
        isCompleted: course.isCompleted,
        order: course.stepOrder,
      }))
      .sort((a, b) => a.order - b.order);

    return {
      id: path.id,
      title: path.title,
      description: path.description,
      coursesCount: path.coursesCount,
      completedCourses: path.completedCourses,
      completionPercent: path.completionPercent,
      courses,
      isExpanded: false,
    };
  }
}
