import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { PublicBooksService, MyBook } from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Router } from '@angular/router';
import { resolveMediaUrl } from '../../../core/utils/media-url';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
@Component({
  selector: 'app-lms-my-books',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, DatePipe],
  templateUrl: './my-books.html',
  styleUrls: ['./my-books.scss'],
})
export class MyBooks implements OnInit, OnDestroy {
  myBooks: MyBook[] = [];
  isLoading = false;
  error: string | null = null;
  private activeObjectUrl: string | null = null;
  private downloadSubscription?: Subscription;

  constructor(
    private booksService: PublicBooksService,
    private notification: NotificationService,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('auth_token');

    if (!token || this.isTokenExpired(token)) {
      this.router.navigate(['/auth/sign'], {
        queryParams: { returnUrl: '/lms/my-books' },
      });
      return;
    }
    this.loadBooks();
  }

  loadBooks(): void {
    this.isLoading = true;
    this.error = null;

    this.booksService.getMyBooks().subscribe({
      next: (books) => {
        this.myBooks = books;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;

        if (err?.status === 401) {
          this.router.navigate(['/auth/sign'], {
            queryParams: { returnUrl: '/lms/my-books' },
          });
        } else if (err?.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Failed to load your books.';
        }
      },
    });
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadSegment = token.split('.')[1];
      if (!payloadSegment) {
        return true;
      }

      const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '='
      );
      const payload = JSON.parse(atob(padded));

      if (!payload?.exp) {
        return true;
      }

      const expiryMs = payload.exp * 1000;
      return Date.now() >= expiryMs;
    } catch {
      return true;
    }
  }

  openFile(book: MyBook): void {
    if (!book.fileUrl) {
      this.notification.showError('File is not available.');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.notification.showError('يرجى تسجيل الدخول للوصول إلى الملف.');
      return;
    }

    this.cleanupObjectUrl();
    const url = resolveMediaUrl(book.fileUrl);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.downloadSubscription = this.http.get(url, { responseType: 'blob', headers }).subscribe({
      next: (blob) => {
        this.activeObjectUrl = URL.createObjectURL(blob);
        window.open(this.activeObjectUrl, '_blank', 'noopener');
      },
      error: () => {
        this.notification.showError('Failed to load the file.');
      },
    });
  }

  ngOnDestroy(): void {
    this.cleanupObjectUrl();
  }
  private cleanupObjectUrl(): void {
    if (this.downloadSubscription) {
      this.downloadSubscription.unsubscribe();
      this.downloadSubscription = undefined;
    }
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
  }
}
