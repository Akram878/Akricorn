import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { PublicBooksService, MyBook } from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';

import { resolveMediaUrl } from '../../../core/utils/media-url';
import { HttpClient } from '@angular/common/http';
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
  private authSubscription?: Subscription;
  constructor(
    private booksService: PublicBooksService,
    private notification: NotificationService,

    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.loadBooks();
      } else {
        this.resetState();
      }
    });
  }

  loadBooks(): void {
    if (!this.authService.isAuthenticated()) {
      this.resetState();
      return;
    }
    this.isLoading = true;
    this.error = null;

    this.booksService.getMyBooks().subscribe({
      next: (books) => {
        this.myBooks = books;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;

        if (err?.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Failed to load your books.';
        }
      },
    });
  }

  openFile(book: MyBook): void {
    if (!book.fileUrl) {
      this.notification.showError('File is not available.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.notification.showError('يرجى تسجيل الدخول للوصول إلى الملف.');
      return;
    }

    this.cleanupObjectUrl();
    const url = resolveMediaUrl(book.fileUrl);
    this.downloadSubscription = this.http.get(url, { responseType: 'blob' }).subscribe({
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
    this.authSubscription?.unsubscribe();
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
  private resetState(): void {
    this.cleanupObjectUrl();
    this.myBooks = [];
    this.isLoading = false;
    this.error = null;
  }
}
