import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PublicLearningPathsService,
  PublicLearningPath,
  LearningPathCourseSummary,
} from '../../../core/services/public-learning-paths.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Router } from '@angular/router';
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
  price: number;
  finalPrice?: number | null;
  discount?: number | null;
  isOwned: boolean;
  isPurchasing: boolean;
  rating?: number | null;
  ratingCount?: number | null;
  coursesCount: number;
  completedCourses: number;
  completionPercent: number;
  completedAt?: string | null;
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
  isRatingModalOpen = false;
  isSubmittingRating = false;
  ratingValue = 0;
  ratingStars = [1, 2, 3, 4, 5];
  selectedPath: UiLearningPath | null = null;
  private authSubscription?: Subscription;

  constructor(
    private pathsService: PublicLearningPathsService,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router
  ) {}
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

  onPurchase(path: UiLearningPath): void {
    if (path.isOwned) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/sign'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    if (path.isPurchasing) {
      return;
    }

    path.isPurchasing = true;

    this.pathsService.purchasePath(path.id).subscribe({
      next: () => {
        this.notification.showSuccess('Learning path purchased successfully.');
        path.isOwned = true;
        path.isPurchasing = false;
      },
      error: (err) => {
        if (err?.status === 401) {
          this.router.navigate(['/auth/login']);
        } else if (err?.error?.message) {
          this.notification.showError(err.error.message);
        } else {
          this.notification.showError('Failed to purchase learning path.');
        }

        path.isPurchasing = false;
      },
    });
  }

  openRatingModal(path: UiLearningPath): void {
    this.selectedPath = path;
    this.ratingValue = 0;
    this.isRatingModalOpen = true;
  }

  closeRatingModal(): void {
    this.isRatingModalOpen = false;
    this.selectedPath = null;
    this.ratingValue = 0;
  }

  selectRating(value: number): void {
    this.ratingValue = value;
  }

  submitRating(): void {
    if (!this.selectedPath || this.ratingValue < 1 || this.ratingValue > 5) {
      return;
    }

    this.isSubmittingRating = true;

    this.pathsService.ratePath(this.selectedPath.id, this.ratingValue).subscribe({
      next: (response) => {
        this.selectedPath!.rating = response.averageRating;
        this.selectedPath!.ratingCount = response.ratingCount;
        this.notification.showSuccess('تم إرسال تقييم المسار بنجاح.');
        this.isSubmittingRating = false;
        this.closeRatingModal();
      },
      error: (err) => {
        if (err?.error?.message) {
          this.notification.showError(err.error.message);
        } else {
          this.notification.showError('تعذر إرسال تقييم المسار.');
        }
        this.isSubmittingRating = false;
      },
    });
  }

  getBasePrice(path: UiLearningPath): number {
    return path.price ?? 0;
  }

  getDiscountPercent(path: UiLearningPath): number {
    return path.discount ?? 0;
  }

  getFinalPrice(path: UiLearningPath): number {
    const basePrice = this.getBasePrice(path);
    const discount = this.getDiscountPercent(path);
    if (discount <= 0) {
      return basePrice;
    }

    if (path.finalPrice !== undefined && path.finalPrice !== null) {
      return path.finalPrice;
    }

    return basePrice - (basePrice * discount) / 100;
  }

  hasDiscount(path: UiLearningPath): boolean {
    return this.getDiscountPercent(path) > 0 && this.getFinalPrice(path) < this.getBasePrice(path);
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
      price: path.price ?? 0,
      finalPrice: path.finalPrice ?? null,
      discount: path.discount ?? 0,
      isOwned: path.isOwned ?? false,
      isPurchasing: false,
      rating: path.rating ?? null,
      ratingCount: path.ratingCount ?? null,
      coursesCount: path.coursesCount,
      completedCourses: path.completedCourses,
      completionPercent: path.completionPercent,
      completedAt: path.completedAt ?? null,
      courses,
      isExpanded: false,
    };
  }
}
