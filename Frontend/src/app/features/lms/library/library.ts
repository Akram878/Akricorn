import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, NgIf, NgForOf } from '@angular/common';
import { PublicBooksService, PublicBook } from '../../../core/services/public-books.service';

@Component({
  selector: 'app-lms-library',
  standalone: true,
  imports: [CommonModule, DecimalPipe, NgIf, NgForOf],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library implements OnInit {
  books: PublicBook[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private publicBooksService: PublicBooksService) {}

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.isLoading = true;
    this.error = null;

    this.publicBooksService.getBooks().subscribe({
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

  trackByBookId(index: number, book: PublicBook): number {
    return book.id;
  }
}
