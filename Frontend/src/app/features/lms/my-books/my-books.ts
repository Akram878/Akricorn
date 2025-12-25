import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { PublicBooksService, MyBook } from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Router } from '@angular/router';
import { resolveMediaUrl } from '../../../core/utils/media-url';
@Component({
  selector: 'app-lms-my-books',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, DatePipe],
  templateUrl: './my-books.html',
  styleUrls: ['./my-books.scss'],
})
export class MyBooks implements OnInit {
  myBooks: MyBook[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private booksService: PublicBooksService,
    private notification: NotificationService,
    private router: Router
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

    const url = this.withAuthToken(resolveMediaUrl(book.fileUrl));
    window.open(url, '_blank', 'noopener');
  }

  private withAuthToken(url: string): string {
    const token = localStorage.getItem('auth_token');
    if (!token || url.includes('token=')) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
}
