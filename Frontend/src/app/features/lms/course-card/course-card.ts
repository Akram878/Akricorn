import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PublicCourse, PublicCoursesService } from '../../../core/services/public-courses.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { isTokenExpired } from '../../../core/utils/auth-token';
import { resolveMediaUrl } from '../../../core/utils/media-url';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-card.html',
  styleUrls: ['./course-card.scss'],
})
export class CourseCardComponent {
  @Input({ required: true }) course!: PublicCourse;
  @Input() owned = false;
  @Input() thumbnailUrl?: string | null;
  @Output() purchased = new EventEmitter<number>();

  isProcessing = false;
  isFlipped = false;

  constructor(
    private publicCoursesService: PublicCoursesService,
    private notification: NotificationService,
    private router: Router,
    private authService: AuthService
  ) {}

  onPurchase(): void {
    if (this.owned) {
      this.router.navigate(['/lms/my-courses', this.course.id]);
      return;
    }

    const token = this.authService.getToken();
    if (!token || isTokenExpired(token)) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    this.publicCoursesService.purchaseCourse(this.course.id).subscribe({
      next: () => {
        this.notification.showSuccess('Course purchased successfully.');
        this.purchased.emit(this.course.id);
        this.isProcessing = false;
      },
      error: (err) => {
        if (err?.status === 401) {
          this.router.navigate(['/auth/login']);
        } else if (err?.error?.message) {
          this.notification.showError(err.error.message);
        } else {
          this.notification.showError('Failed to purchase course.');
        }

        this.isProcessing = false;
      },
    });
  }

  toggleFlip(): void {
    this.isFlipped = !this.isFlipped;
  }

  getThumbnailUrl(): string | null {
    if (this.thumbnailUrl) {
      return this.thumbnailUrl;
    }
    if (!this.course.thumbnailUrl?.trim()) {
      return null;
    }

    return resolveMediaUrl(this.course.thumbnailUrl);
  }

  getDescription(): string {
    const description = this.course.description?.trim();
    if (!description) {
      return 'No description available.';
    }

    return description;
  }
}
