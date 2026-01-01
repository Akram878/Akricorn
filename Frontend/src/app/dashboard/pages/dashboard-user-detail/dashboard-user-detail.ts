import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AdminUsersService, AdminUserDto } from '../../../core/services/admin-users.service';

interface UserOverview {
  purchases: {
    courses: Array<{
      id?: number;
      courseId?: number;
      title?: string;
      name?: string;
      price?: number;
      purchasedAt?: string;
      rating?: number | null;
    }>;
    books: Array<{
      id?: number;
      bookId?: number;
      title?: string;
      price?: number;
      purchasedAt?: string;
      rating?: number | null;
    }>;
    paths: Array<{
      id?: number;
      learningPathId?: number;
      title?: string;
      price?: number;
      purchasedAt?: string;
      rating?: number | null;
    }>;
  };
  courses: {
    active: Array<{
      courseId?: number;
      courseTitle?: string;
      completionPercent?: number;
      completedAt?: string;
      rating?: number | null;
    }>;
    completed: Array<{
      courseId?: number;
      courseTitle?: string;
      completionPercent?: number;
      completedAt?: string;
      rating?: number | null;
    }>;
  };
}

@Component({
  selector: 'app-dashboard-user-detail',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, RouterLink],
  templateUrl: './dashboard-user-detail.html',
  styleUrl: './dashboard-user-detail.scss',
})
export class DashboardUserDetailComponent implements OnInit {
  userId!: number;
  user: AdminUserDto | null = null;
  overview: UserOverview | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private adminUsers: AdminUsersService
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadUser();
    this.loadOverview();
  }

  private loadUser(): void {
    this.adminUsers.getById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
      },
      error: () => {
        this.user = null;
      },
    });
  }

  private loadOverview(): void {
    this.isLoading = true;
    this.error = null;
    this.http
      .get<UserOverview>(`${API_BASE_URL}/api/admin/users/${this.userId}/lms-overview`, {
        withCredentials: true,
      })
      .subscribe({
        next: (data) => {
          this.overview = data;
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load user details.';
          this.isLoading = false;
        },
      });
  }

  get purchaseRows(): Array<{
    productType: string;
    productId: number | string;
    productName: string;
    price: number | string;
    rating: number | string;
  }> {
    if (!this.overview) return [];

    const toRow = (
      productType: string,
      item: {
        id?: number;
        courseId?: number;
        bookId?: number;
        learningPathId?: number;
        title?: string;
        name?: string;
        price?: number;
        rating?: number | null;
      }
    ) => ({
      productType,
      productId: item.id ?? item.courseId ?? item.bookId ?? item.learningPathId ?? '—',
      productName: item.title ?? item.name ?? '—',
      price: item.price ?? '—',
      rating: item.rating ?? '—',
    });

    return [
      ...(this.overview.purchases?.courses ?? []).map((item) => toRow('كورس', item)),
      ...(this.overview.purchases?.books ?? []).map((item) => toRow('كتاب', item)),
      ...(this.overview.purchases?.paths ?? []).map((item) => toRow('مسار', item)),
    ];
  }

  get courseStatusRows(): Array<{
    courseId: number | string;
    courseTitle: string;
    status: string;
  }> {
    if (!this.overview) return [];

    const toRow = (
      status: string,
      course: {
        id?: number;
        courseId?: number;
        title?: string;
        courseTitle?: string;
      }
    ) => ({
      courseId: course.courseId ?? course.id ?? '—',
      courseTitle: course.courseTitle ?? course.title ?? '—',
      status,
    });

    return [
      ...(this.overview.courses?.active ?? []).map((course) => toRow('نشط', course)),
      ...(this.overview.courses?.completed ?? []).map((course) => toRow('مكتمل', course)),
    ];
  }
}
