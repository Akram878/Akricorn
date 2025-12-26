import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  PublicBooksService,
  PublicBook,
  MyBook,
} from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { resolveMediaUrl } from '../../../core/utils/media-url';
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
  selector: 'app-lms-library',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, BookCardComponent, LmsFiltersComponent],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library implements OnInit, OnDestroy {
  // كل الكتب المتاحة (حتى للزائر)
  books: PublicBook[] = [];

  filteredBooks: PublicBook[] = [];

  filters: FilterDefinition<PublicBook>[] = [];
  filterState: FilterState = {};

  // IDs للكتب المملوكة
  private ownedBookIds: Set<number> = new Set<number>();
  bookThumbnails: Record<number, string> = {};
  private thumbnailObjectUrls: Map<number, string> = new Map();
  private thumbnailSubscriptions: Map<number, Subscription> = new Map();
  private authSubscription?: Subscription;
  isLoading = false;
  error: string | null = null;
  processingBookId: number | null = null;

  constructor(
    private booksService: PublicBooksService,
    private notification: NotificationService,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadBooks();
    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.loadMyBooks();
        this.loadBookThumbnails(this.books);
      } else {
        this.ownedBookIds.clear();
        this.resetThumbnails();
      }
    });
  }

  ngOnDestroy(): void {
    this.resetThumbnails();
    this.authSubscription?.unsubscribe();
  }

  // تحميل الكتب العامة
  loadBooks(): void {
    this.isLoading = true;
    this.error = null;

    this.booksService.getBooks().subscribe({
      next: (data) => {
        this.resetThumbnails();
        this.books = data;
        this.filters = buildBookFilters(data);
        this.filterState = buildFilterState(this.filters);
        this.applyFilters(this.filterState);
        this.loadBookThumbnails(this.books);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'حدث خطأ أثناء تحميل الكتب. حاول مرة أخرى لاحقاً.';
        this.isLoading = false;
      },
    });
  }

  // تحميل الكتب التي يملكها المستخدم
  loadMyBooks(): void {
    this.booksService.getMyBooks().subscribe({
      next: (data: MyBook[]) => {
        this.ownedBookIds = new Set(data.map((b) => b.id));
      },
      error: () => {
        // في حال المستخدم غير مسجّل أو حصل خطأ 401، نتجاهله
      },
    });
  }

  // هل هذا الكتاب مملوك؟
  isBookOwned(book: PublicBook): boolean {
    return this.ownedBookIds.has(book.id);
  }

  trackByBookId(index: number, book: PublicBook): number {
    return book.id;
  }

  applyFilters(state: FilterState): void {
    this.filterState = state;
    this.filteredBooks = applyFilterSet(this.books, this.filters, state);
  }

  // المنطق: شراء / عرض في My Books
  onView(book: PublicBook): void {
    if (this.isBookOwned(book)) {
      this.router.navigate(['/lms/my-books']);
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/sign'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.notification.showError('Purchase the book to access it.');
  }

  onBuy(book: PublicBook): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/sign'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    if (this.processingBookId) {
      return;
    }

    this.processingBookId = book.id;

    this.booksService.purchaseBook(book.id).subscribe({
      next: () => {
        this.notification.showSuccess('Book purchased successfully.');
        this.ownedBookIds.add(book.id);
        this.processingBookId = null;
      },
      error: (err) => {
        if (err?.status === 401) {
          this.notification.showError('Please log in to purchase this book.');
        } else if (err?.error?.message) {
          this.notification.showError(err.error.message);
        } else {
          this.notification.showError('Failed to purchase book.');
        }

        this.processingBookId = null;
      },
    });
  }

  resetFilters(): void {
    this.filterState = buildFilterState(this.filters);
    this.filteredBooks = applyFilterSet(this.books, this.filters, this.filterState);
  }

  private loadBookThumbnails(books: PublicBook[]): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    for (const book of books) {
      if (!book.thumbnailUrl || this.bookThumbnails[book.id]) {
        continue;
      }

      const resolvedUrl = resolveMediaUrl(book.thumbnailUrl);
      const subscription = this.http.get(resolvedUrl, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.bookThumbnails[book.id] = objectUrl;
          this.thumbnailObjectUrls.set(book.id, objectUrl);
        },
        error: () => {
          // ignore thumbnail errors to avoid console noise
        },
      });

      this.thumbnailSubscriptions.set(book.id, subscription);
    }
  }

  private resetThumbnails(): void {
    for (const subscription of this.thumbnailSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.thumbnailSubscriptions.clear();

    for (const objectUrl of this.thumbnailObjectUrls.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    this.thumbnailObjectUrls.clear();
    this.bookThumbnails = {};
  }
}
