import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgForOf } from '@angular/common';
import {
  AdminBooksService,
  AdminBookDto,
  CreateBookRequest,
  UpdateBookRequest,
} from '../../../core/services/admin-books.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-dashboard-books',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './dashboard-books.html',
  styleUrl: './dashboard-books.scss',
})
export class DashboardBooks implements OnInit {
  books: AdminBookDto[] = [];
  isLoading = false;
  error: string | null = null;

  // فورم إنشاء / تعديل كتاب
  bookForm: FormGroup;
  isSaving = false;
  editMode = false;
  editingBookId: number | null = null;

  // هل المودال مفتوح؟
  showForm = false;

  constructor(private adminBooks: AdminBooksService, private fb: FormBuilder) {
    this.bookForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(4000)]],
      price: [0, [Validators.required, Validators.min(0)]],
      fileUrl: ['', [Validators.required, Validators.maxLength(500)]],
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
        this.books = data;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load books.';
        this.isLoading = false;
      },
    });
  }

  // فتح المودال لإنشاء كتاب جديد
  openCreateForm(): void {
    this.editMode = false;
    this.editingBookId = null;
    this.bookForm.reset({
      title: '',
      description: '',
      price: 0,
      fileUrl: '',
      isActive: true,
    });
    this.error = null;
    this.isSaving = false;
    this.showForm = true;
  }

  // تعبئة المودال للتعديل
  onEdit(book: AdminBookDto): void {
    this.editMode = true;
    this.editingBookId = book.id;

    this.bookForm.setValue({
      title: book.title,
      description: book.description,
      price: book.price,
      fileUrl: book.fileUrl,
      isActive: book.isActive,
    });

    this.error = null;
    this.isSaving = false;
    this.showForm = true;
  }

  // إغلاق المودال وإعادة الفورم
  resetForm(): void {
    this.editMode = false;
    this.editingBookId = null;
    this.bookForm.reset({
      title: '',
      description: '',
      price: 0,
      fileUrl: '',
      isActive: true,
    });
    this.isSaving = false;
    this.error = null;
    this.showForm = false;
  }

  // إرسال الفورم (إنشاء أو تعديل)
  onSubmit(): void {
    if (this.bookForm.invalid || this.isSaving) return;

    this.isSaving = true;
    this.error = null;

    const value = this.bookForm.value;
    const payload: CreateBookRequest | UpdateBookRequest = {
      title: value.title,
      description: value.description,
      price: value.price,
      fileUrl: value.fileUrl,
      isActive: value.isActive,
    };

    if (this.editMode && this.editingBookId != null) {
      // تعديل
      this.adminBooks.update(this.editingBookId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadBooks();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to update book.';
        },
      });
    } else {
      // إنشاء
      this.adminBooks.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadBooks();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to create book.';
        },
      });
    }
  }

  // تفعيل / تعطيل
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

  // حذف
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
}
