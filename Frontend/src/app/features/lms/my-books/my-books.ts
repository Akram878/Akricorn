import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { PublicBooksService, MyBook } from '../../../core/services/public-books.service';
import { NotificationService } from '../../../core/services/notification.service';

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
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
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
          this.error = 'Please log in to see your books.';
        } else if (err?.error?.message) {
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

    window.open(book.fileUrl, '_blank');
  }
}
