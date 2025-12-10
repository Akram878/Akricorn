import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, NgIf, NgForOf } from '@angular/common';
import { Router } from '@angular/router';
import {
  PublicBooksService,
  PublicBook,
  MyBook,
} from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-lms-library',
  standalone: true,
  imports: [CommonModule, DecimalPipe, NgIf, NgForOf],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library implements OnInit {
  // كل الكتب المتاحة (حتى للزائر)
  books: PublicBook[] = [];

  // IDs للكتب المملوكة
  private ownedBookIds: Set<number> = new Set<number>();

  isLoading = false;
  error: string | null = null;
  processingBookId: number | null = null;

  constructor(
    private booksService: PublicBooksService,
    private notification: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBooks();
    this.loadMyBooks(); // لو المستخدم مسجّل، نملأ الـ ownedBookIds
  }

  // تحميل الكتب العامة
  loadBooks(): void {
    this.isLoading = true;
    this.error = null;

    this.booksService.getBooks().subscribe({
      next: (data) => {
        this.books = data;
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
}
