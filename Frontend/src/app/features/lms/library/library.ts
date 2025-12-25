import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, NgIf, NgForOf } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  PublicBooksService,
  PublicBook,
  MyBook,
} from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { resolveMediaUrl } from '../../../core/utils/media-url';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-lms-library',
  standalone: true,
  imports: [CommonModule, DecimalPipe, NgIf, NgForOf, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library implements OnInit, OnDestroy {
  // كل الكتب المتاحة (حتى للزائر)
  books: PublicBook[] = [];

  filteredBooks: PublicBook[] = [];

  categories: string[] = [];
  selectedCategory: string = 'all';
  searchTerm = '';

  // IDs للكتب المملوكة
  private ownedBookIds: Set<number> = new Set<number>();
  bookThumbnails: Record<number, string> = {};
  private thumbnailObjectUrls: Map<number, string> = new Map();
  private thumbnailSubscriptions: Map<number, Subscription> = new Map();

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
    this.loadMyBooks(); // لو المستخدم مسجّل، نملأ الـ ownedBookIds
  }

  ngOnDestroy(): void {
    this.resetThumbnails();
  }

  // تحميل الكتب العامة
  loadBooks(): void {
    this.isLoading = true;
    this.error = null;

    this.booksService.getBooks().subscribe({
      next: (data) => {
        this.resetThumbnails();
        this.books = data;
        this.buildCategories();
        this.applyFilters();
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

  onCategoryChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  private buildCategories(): void {
    const categorySet = new Set<string>();

    for (const b of this.books) {
      if (b.category && b.category.trim() !== '') {
        categorySet.add(b.category);
      }
    }

    this.categories = Array.from(categorySet).sort();
  }

  private applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredBooks = this.books.filter((b) => {
      if (this.selectedCategory !== 'all') {
        const category = b.category || '';
        if (category !== this.selectedCategory) {
          return false;
        }
      }

      if (search) {
        const title = b.title?.toLowerCase() || '';
        const desc = b.description?.toLowerCase() || '';

        if (!title.includes(search) && !desc.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }

  // المنطق: شراء / عرض في My Books
  onAction(book: PublicBook): void {
    // لو مملوك → ننتقل إلى My Books
    if (this.isBookOwned(book)) {
      this.router.navigate(['/lms/my-books']);
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

  private loadBookThumbnails(books: PublicBook[]): void {
    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    for (const book of books) {
      if (!book.thumbnailUrl || this.bookThumbnails[book.id]) {
        continue;
      }

      const resolvedUrl = resolveMediaUrl(book.thumbnailUrl);
      const subscription = this.http.get(resolvedUrl, { responseType: 'blob', headers }).subscribe({
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
