import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgForOf } from '@angular/common';

import {
  AdminBooksService,
  AdminBookDto,
  CreateBookRequest,
  BookFileDto,
} from '../../../core/services/admin-books.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookEditorComponent } from './book-content-editor/book-content-editor';
type BookFileView = BookFileDto & {
  originalName?: string;
  downloadUrl?: string;
  size?: number;
  mimeType?: string;
};

type BookView = AdminBookDto & { rating?: number; ratingCount?: number; files?: BookFileView[] };

@Component({
  selector: 'app-dashboard-books',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, CurrencyPipe, ReactiveFormsModule, BookEditorComponent],
  templateUrl: './dashboard-books.html',
  styleUrl: './dashboard-books.scss',
})
export class DashboardBooks implements OnInit {
  @ViewChild(BookEditorComponent)
  editorComponent!: BookEditorComponent;

  books: BookView[] = [];
  bookFiles: BookFileView[] = [];

  // فورم إنشاء / تعديل كتاب
  isLoading = false;
  isSaving = false;
  isEditorOpen = false;
  isCreateMode = false;
  isLoadingDetails = false;

  error: string | null = null;
  selectedBook: AdminBookDto | null = null;
  selectedThumbnailFile: File | null = null;
  bookForm: FormGroup;

  constructor(private adminBooks: AdminBooksService, private fb: FormBuilder) {
    this.bookForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      category: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', [Validators.required, Validators.maxLength(4000)]],
      price: [0, [Validators.required, Validators.min(0)]],
      thumbnailUrl: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.isLoading = true;
    this.error = null;

    this.adminBooks.getAll().subscribe({
      next: (data) => {
        this.books = data as BookView[];
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load books.';
        this.isLoading = false;
      },
    });
  }

  // فتح المودال لإنشاء كتاب جديد
  openCreateEditor(): void {
    this.isEditorOpen = true;
    this.isCreateMode = true;
    this.selectedBook = null;
    this.selectedThumbnailFile = null;
    this.bookFiles = [];

    this.bookForm.reset({
      title: '',
      category: '',
      description: '',
      price: 0,
      thumbnailUrl: '',
      isActive: true,
    });
  }

  openEditEditor(book: AdminBookDto): void {
    this.isEditorOpen = true;
    this.isCreateMode = false;
    this.isLoadingDetails = true;
    this.selectedBook = book;
    this.selectedThumbnailFile = null;
    this.bookFiles = [];

    this.adminBooks.getById(book.id).subscribe({
      next: (res) => {
        this.isLoadingDetails = false;
        this.selectedBook = res as BookView;
        this.bookFiles = (res.files as BookFileView[]) ?? [];

        this.bookForm.setValue({
          title: res.title,
          category: res.category,
          description: res.description,
          price: res.price,
          thumbnailUrl: res.thumbnailUrl ?? '',
          isActive: res.isActive,
        });
      },
      error: () => {
        this.error = 'Failed to load book details';
        this.isLoadingDetails = false;
      },
    });
  }

  // إرسال الفورم (إنشاء أو تعديل)
  onSubmitEditor(): void {
    if (this.bookForm.invalid || this.isSaving) return;

    this.isSaving = true;
    const v = this.bookForm.value;

    const payload: CreateBookRequest = {
      title: v.title,
      description: v.description,
      category: v.category,
      price: v.price,
      fileUrl: '',
      thumbnailUrl: this.selectedThumbnailFile
        ? this.selectedBook?.thumbnailUrl ?? ''
        : v.thumbnailUrl,
      isActive: v.isActive,
    };

    if (this.isCreateMode) {
      this.adminBooks.create(payload).subscribe({
        next: (res) => {
          this.isSaving = false;
          this.isCreateMode = false;

          this.selectedBook = {
            ...payload,
            id: res.bookId,
            files: [],
          } as AdminBookDto;

          this.uploadThumbnailIfNeeded(res.bookId);
          this.loadBooks();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to create book.';
        },
      });
    } else if (this.selectedBook) {
      this.adminBooks.update(this.selectedBook.id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.uploadThumbnailIfNeeded(this.selectedBook!.id);
          this.loadBooks();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to update book.';
        },
      });
    }
  }

  onToggle(book: AdminBookDto): void {
    this.adminBooks.toggleActive(book.id).subscribe({
      next: (res) => {
        book.isActive = res.isActive;
      },
      error: () => {
        this.error = 'Failed to change status.';
      },
    });
  }

  onDelete(book: AdminBookDto): void {
    const confirmDelete = confirm(`Delete book "${book.title}" ?`);
    if (!confirmDelete) return;

    this.adminBooks.delete(book.id).subscribe({
      next: () => {
        this.books = this.books.filter((b) => b.id !== book.id);
      },
      error: () => {
        this.error = 'Failed to delete book.';
      },
    });
  }

  closeEditor(): void {
    this.isEditorOpen = false;
  }

  handleThumbnailSelected(file: File): void {
    this.selectedThumbnailFile = file;
  }

  handleFilesUpdated(files: BookFileView[]): void {
    this.bookFiles = files;
  }

  reloadBooks(): void {
    this.loadBooks();
  }

  private uploadThumbnailIfNeeded(bookId: number): void {
    if (!this.selectedThumbnailFile) return;

    const file = this.selectedThumbnailFile;
    this.selectedThumbnailFile = null;

    this.adminBooks.uploadThumbnail(bookId, file).subscribe({
      next: (res) => {
        this.bookForm.patchValue({ thumbnailUrl: res.url });
        const updated = this.books.find((b) => b.id === bookId);
        if (updated) {
          updated.thumbnailUrl = res.url;
        }
      },
      error: () => {
        this.error = 'Failed to upload thumbnail';
      },
    });
  }
}
