import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AdminUsersService, AdminUserDto } from '../../../core/services/admin-users.service';

interface UserOverview {
  purchases: {
    courses: any[];
    books: any[];
    paths: any[];
  };
  courses: {
    active: any[];
    completed: any[];
  };
  learningPaths: any[];
}

@Component({
  selector: 'app-dashboard-user-detail',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, RouterLink, HttpClientModule],
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
    this.adminUsers.getAll().subscribe({
      next: (users) => {
        this.user = users.find((u) => u.id === this.userId) ?? null;
      },
      error: () => {},
    });
  }

  private loadOverview(): void {
    this.isLoading = true;
    this.error = null;
    this.http
      .get<UserOverview>(`${API_BASE_URL}/api/admin/users/${this.userId}/lms-overview`)
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
}
