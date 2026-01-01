import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrls: ['./dashboard-home.scss'],
})
export class DashboardHome implements OnInit {
  stats: {
    totalUsers: number;
    activeUsers: number;
    courses: number;
    books: number;
    learningPaths: number;
    tools: number;
  } | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    this.isLoading = true;
    this.error = null;

    this.http.get<any>(`${API_BASE_URL}/api/admin/dashboard/summary`).subscribe({
      next: (data) => {
        this.stats = {
          totalUsers: data.totalUsers ?? 0,
          activeUsers: data.activeUsers ?? 0,
          courses: data.courses ?? 0,
          books: data.books ?? 0,
          learningPaths: data.learningPaths ?? 0,
          tools: data.tools ?? 0,
        };
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load dashboard summary.';
        this.isLoading = false;
      },
    });
  }
}
