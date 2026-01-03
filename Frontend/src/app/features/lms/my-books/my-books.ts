import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { PublicBooksService, MyBook } from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';

import { appendAuthToken, resolveMediaUrl } from '../../../core/utils/media-url';
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
  selectedBook: MyBook | null = null;

  isRatingModalOpen = false;
  ratingStars = [1, 2, 3, 4, 5];
  ratingValue = 0;
  isSubmittingRating = false;

  private authSubscription?: Subscription;
  private viewedBookIds = new Set<number>();
  private ratedBookIds = new Set<number>();
  private readonly viewedStorageKey = 'lms_viewed_books';
  constructor(
    private booksService: PublicBooksService,
    private notification: NotificationService,

    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.restoreViewedBooks();
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
    const fileUrl = this.resolveBookFileUrl(book);
    if (!fileUrl) {
      this.notification.showError('File is not available.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.notification.showError('Please sign in to access the file.');
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      this.notification.showError('Please sign in to access the file.');
      return;
    }
    const url = appendAuthToken(resolveMediaUrl(fileUrl), token);

    const opened = window.open(url, '_blank', 'noopener');
    if (!opened) {
      this.notification.showError('Please allow pop-ups to view this book.');
      return;
    }
    this.viewedBookIds.add(book.id);
    this.persistViewedBooks();
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
    this.authSubscription?.unsubscribe();
  }

  openRatingModal(book: MyBook): void {
    if (!this.canRateBook(book)) {
      return;
    }

    this.selectedBook = book;
    this.ratingValue = 0;
    this.isRatingModalOpen = true;
  }

  closeRatingModal(): void {
    this.isRatingModalOpen = false;
    this.selectedBook = null;
  }

  selectRating(value: number): void {
    this.ratingValue = value;
  }

  submitRating(): void {
    if (!this.selectedBook || this.ratingValue < 1 || this.ratingValue > 5) {
      this.notification.showError('Please choose a valid rating.');
      return;
    }

    if (this.isSubmittingRating) {
      return;
    }

    this.isSubmittingRating = true;
    this.booksService.rateBook(this.selectedBook.id, this.ratingValue).subscribe({
      next: (response) => {
        this.notification.showSuccess(response.message);
        this.updateBookRating(this.selectedBook!.id, response.averageRating, response.ratingCount);
        this.ratedBookIds.add(this.selectedBook!.id);
        this.isSubmittingRating = false;
        this.isRatingModalOpen = false;
        this.selectedBook = null;
      },
      error: (err) => {
        if (err?.error?.message) {
          this.notification.showError(err.error.message);
        } else {
          this.notification.showError('Could not submit the rating.');
        }
        this.isSubmittingRating = false;
      },
    });
  }

  canRateBook(book: MyBook): boolean {
    return Boolean(this.viewedBookIds.has(book.id) && !this.ratedBookIds.has(book.id));
  }
  hasViewedBook(book: MyBook): boolean {
    return this.viewedBookIds.has(book.id);
  }
  private resetState(): void {
    this.myBooks = [];
    this.filteredBooks = [];
    this.filters = [];
    this.filterState = {};
    this.isLoading = false;
    this.error = null;
    this.selectedBook = null;

    this.isRatingModalOpen = false;
    this.ratingValue = 0;
    this.isSubmittingRating = false;
    this.viewedBookIds.clear();
    this.ratedBookIds.clear();
    localStorage.removeItem(this.viewedStorageKey);
  }

  private resolveBookFileUrl(book: MyBook): string | null {
    if (book.downloadUrl && book.downloadUrl.trim()) {
      return book.downloadUrl;
    }
    if (book.fileUrl && book.fileUrl.trim()) {
      return book.fileUrl;
    }
    return null;
  }

  private restoreViewedBooks(): void {
    try {
      const stored = localStorage.getItem(this.viewedStorageKey);
      if (!stored) {
        this.viewedBookIds.clear();
        return;
      }
      const ids = JSON.parse(stored);
      if (Array.isArray(ids)) {
        this.viewedBookIds = new Set(ids.filter((id) => typeof id === 'number'));
      }
    } catch {
      this.viewedBookIds.clear();
    }
  }

  private persistViewedBooks(): void {
    localStorage.setItem(this.viewedStorageKey, JSON.stringify(Array.from(this.viewedBookIds)));
  }

  private updateBookRating(bookId: number, rating: number, ratingCount: number): void {
    const book = this.myBooks.find((item) => item.id === bookId);
    if (book) {
      book.rating = rating;
      book.ratingCount = ratingCount;
    }
  }
}
