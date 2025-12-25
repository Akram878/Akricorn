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
  @Output() purchased = new EventEmitter<number>();

  isProcessing = false;

  constructor(
    private publicCoursesService: PublicCoursesService,
    private notification: NotificationService,
    private router: Router,
    private authService: AuthService
  ) {}

  onPurchase(): void {
    if (this.owned) {
      this.router.navigate(['/lms/my-courses']);
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

  getThumbnailUrl(): string | null {
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

    const maxLength = 120;
    if (description.length <= maxLength) {
      return description;
    }

    return `${description.slice(0, maxLength).trim()}…`;
  }
}
