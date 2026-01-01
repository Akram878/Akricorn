import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { PublicBooksService, MyBook } from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';

import { resolveMediaUrl } from '../../../core/utils/media-url';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BookCardComponent } from '../book-card/book-card';
import { LmsFiltersComponent } from '../../../shared/components/lms-filters/lms-filters';
import {
  applyFilters as applyFilterSet,
  buildFilterState,
} from '../../../shared/components/lms-filters/lms-filters.utils';
import {
  FilterDefinition,
  FilterState,
} from '../../../shared/components/lms-filters/lms-filters.types';
import { buildBookFilters } from '../filters/lms-filter-config';
@Component({
  selector: 'app-lms-my-books',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, BookCardComponent, LmsFiltersComponent],
  templateUrl: './my-books.html',
  styleUrls: ['./my-books.scss'],
})
export class MyBooks implements OnInit, OnDestroy {
  myBooks: MyBook[] = [];
  filteredBooks: MyBook[] = [];
  filters: FilterDefinition<MyBook>[] = [];
  filterState: FilterState = {};
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
        this.filters = buildBookFilters(books);
        this.filterState = buildFilterState(this.filters);
        this.applyFilters(this.filterState);
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

  trackByBookId(index: number, book: MyBook): number {
    return book.id;
  }

  applyFilters(state: FilterState): void {
    this.filterState = state;
    this.filteredBooks = applyFilterSet(this.myBooks, this.filters, state);
  }

  resetFilters(): void {
    this.filterState = buildFilterState(this.filters);
    this.filteredBooks = applyFilterSet(this.myBooks, this.filters, this.filterState);
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
    this.filteredBooks = [];
    this.filters = [];
    this.filterState = {};
    this.isLoading = false;
    this.error = null;
  }
}
