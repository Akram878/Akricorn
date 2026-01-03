import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  PublicCoursesService,
  MyCourseDetail,
  CourseLessonFile,
  CourseLearningPathProgress,
} from '../../../../core/services/public-courses.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { appendAuthToken, resolveMediaUrl } from '../../../../core/utils/media-url';

@Component({
  selector: 'app-course-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-viewer.html',
  styleUrl: './course-viewer.scss',
})
export class CourseViewer implements OnInit, OnDestroy {
  courseId!: number;
  course: MyCourseDetail | null = null;

  courseThumbnailUrl: string | null = null;
  isLoading = false;
  error: string | null = null;
  completingLessons = new Set<number>();
  ratingValue = 0;
  ratingStars = [1, 2, 3, 4, 5];
  isSubmittingRating = false;
  private courseThumbnailObjectUrl: string | null = null;
  private courseThumbnailSubscription?: Subscription;
  private authSubscription?: Subscription;
  constructor(
    private route: ActivatedRoute,
    private coursesService: PublicCoursesService,
    private notifications: NotificationService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('id');
    this.courseId = param ? Number(param) : NaN;

    if (!this.courseId || Number.isNaN(this.courseId)) {
      this.error = 'The requested course was not found.';
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.error = 'Please sign in to access the course.';
      return;
    }

    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (!isAuthenticated) {
        this.cleanupCourseThumbnail();
        this.course = null;
        this.error = 'Please sign in to access the course.';
      }
    });
    this.loadCourse();
  }

  loadCourse(): void {
    this.isLoading = true;
    this.error = null;

    this.coursesService.getMyCourse(this.courseId).subscribe({
      next: (course) => {
        this.course = course;
        this.ratingValue = course.userRating ?? 0;
        this.loadCourseThumbnail(course.thumbnailUrl);
        this.isLoading = false;
      },
      error: (err) => {
        if (err?.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'An error occurred while loading the course.';
        }
        this.isLoading = false;
      },
    });
  }

  openLessonFile(file: CourseLessonFile): void {
    if (!this.authService.isAuthenticated()) {
      this.notifications.showError('Please sign in to access the file.');
      return;
    }
    const token = this.authService.getAccessToken();
    const resolvedUrl = appendAuthToken(resolveMediaUrl(file.url), token);
    window.open(resolvedUrl, '_blank', 'noopener');
  }

  completeLesson(lessonId: number): void {
    if (this.completingLessons.has(lessonId) || !this.course) {
      return;
    }

    this.completingLessons.add(lessonId);
    this.coursesService.completeLesson(this.courseId, lessonId).subscribe({
      next: (res) => {
        this.markLessonCompleted(lessonId);
        this.notifications.showSuccess(res.message || 'The lesson has been completed.');
        if (res.courseCompleted && this.course && !this.course.completedAt) {
          this.course = {
            ...this.course,
            completedAt: new Date().toISOString(),
          };
        }
        this.completingLessons.delete(lessonId);
      },
      error: (err) => {
        const message = err?.error?.message || 'Could not complete the lesson.';
        this.notifications.showError(message);
        this.completingLessons.delete(lessonId);
      },
    });
  }

  selectRating(value: number): void {
    if (!this.canRateCourse) {
      return;
    }
    this.ratingValue = value;
  }

  submitRating(): void {
    if (!this.canRateCourse || !this.course) {
      return;
    }
    const course = this.course;
    if (this.ratingValue < 1 || this.ratingValue > 5) {
      this.notifications.showError('Please choose a rating from 1 to 5.');
      return;
    }

    this.isSubmittingRating = true;
    this.coursesService.rateCourse(this.courseId, this.ratingValue).subscribe({
      next: (res) => {
        this.course = {
          ...course,
          rating: res.averageRating,
          ratingCount: res.ratingCount,
          userRating: this.ratingValue,
        };
        this.notifications.showSuccess(res.message || 'Your rating has been sent successfully.');
        this.isSubmittingRating = false;
      },
      error: (err) => {
        const message = err?.error?.message || 'Could not submit the rating.';
        this.notifications.showError(message);
        this.isSubmittingRating = false;
      },
    });
  }

  isLessonCompleting(lessonId: number): boolean {
    return this.completingLessons.has(lessonId);
  }

  get hasSections(): boolean {
    return (this.course?.sections?.length ?? 0) > 0;
  }

  get hasLearningPaths(): boolean {
    return (this.course?.learningPaths?.length ?? 0) > 0;
  }

  get courseProgressPercent(): number {
    const total = this.totalLessonsCount;
    if (!this.course) {
      return 0;
    }
    if (total === 0) {
      return 100;
    }
    if (this.course.completedAt) {
      return 100;
    }
    return Math.round((this.completedLessonsCount / total) * 100);
  }

  get canRateCourse(): boolean {
    return !!this.course?.completedAt && !this.course?.userRating;
  }

  get completedLessonsCount(): number {
    if (!this.course) {
      return 0;
    }
    if (this.course.completedAt) {
      return this.totalLessonsCount;
    }
    return this.course.sections.reduce((sum, section) => {
      return (
        sum +
        section.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.isCompleted ? 1 : 0), 0)
      );
    }, 0);
  }

  get totalLessonsCount(): number {
    return this.course?.sections.reduce((sum, section) => sum + section.lessons.length, 0) ?? 0;
  }

  formatPathProgress(path: CourseLearningPathProgress): string {
    if (!path.totalCourses) return '0%';
    return `${path.completedCourses}/${path.totalCourses} · ${path.completionPercent}%`;
  }

  ngOnDestroy(): void {
    this.cleanupCourseThumbnail();

    this.authSubscription?.unsubscribe();
  }

  private loadCourseThumbnail(thumbnailUrl?: string | null): void {
    this.cleanupCourseThumbnail();

    if (!thumbnailUrl) {
      this.courseThumbnailUrl = null;
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.courseThumbnailUrl = null;
      return;
    }

    const resolvedUrl = resolveMediaUrl(thumbnailUrl);

    this.courseThumbnailSubscription = this.http
      .get(resolvedUrl, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          this.courseThumbnailObjectUrl = URL.createObjectURL(blob);
          this.courseThumbnailUrl = this.courseThumbnailObjectUrl;
        },
        error: () => {
          this.courseThumbnailUrl = null;
        },
      });
  }

  private cleanupCourseThumbnail(): void {
    if (this.courseThumbnailSubscription) {
      this.courseThumbnailSubscription.unsubscribe();
      this.courseThumbnailSubscription = undefined;
    }
    if (this.courseThumbnailObjectUrl) {
      URL.revokeObjectURL(this.courseThumbnailObjectUrl);
      this.courseThumbnailObjectUrl = null;
    }
  }

  private markLessonCompleted(lessonId: number): void {
    if (!this.course) {
      return;
    }
    for (const section of this.course.sections) {
      const lesson = section.lessons.find((entry) => entry.id === lessonId);
      if (lesson) {
        lesson.isCompleted = true;
        break;
      }
    }
  }
}
