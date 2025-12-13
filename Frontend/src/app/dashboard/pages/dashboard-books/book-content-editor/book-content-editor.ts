import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgForOf } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminBooksService, BookFileDto } from '../../../../core/services/admin-books.service';

@Component({
  selector: 'app-book-editor',
  standalone: true,
  templateUrl: './book-content-editor.html',
  styleUrls: ['./book-content-editor.scss'],
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgForOf, CurrencyPipe],
})
export class BookEditorComponent implements OnChanges {
  @Input() form!: FormGroup;
  @Input() bookId!: number;
  @Input() isCreateMode = false;
  @Input() isSaving = false;
  @Input() isLoadingDetails = false;
  @Input() files: BookFileDto[] = [];

  @Output() closeEditor = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() thumbnailSelected = new EventEmitter<File>();
  @Output() filesUpdated = new EventEmitter<BookFileDto[]>();

  bookFiles: BookFileDto[] = [];
  uploading = false;
  deletingFileId: number | null = null;
  error: string | null = null;

  constructor(private adminBooks: AdminBooksService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['files']) {
      this.bookFiles = [...(this.files ?? [])];
    }
  }

  onSubmit(): void {
    this.submitForm.emit();
  }

  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => this.form.patchValue({ thumbnailUrl: reader.result });
    reader.readAsDataURL(file);

    this.thumbnailSelected.emit(file);
    input.value = '';
  }

  onFilesSelected(event: Event): void {
    if (this.isCreateMode || !this.bookId) return;

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    this.uploading = true;

    let completed = 0;
    files.forEach((file) => {
      this.adminBooks.uploadFile(this.bookId, file).subscribe({
        next: (res) => {
          this.bookFiles = res.book?.files ?? this.bookFiles;
          this.filesUpdated.emit(this.bookFiles);
          completed++;
          if (completed === files.length) this.uploading = false;
        },
        error: () => {
          this.error = 'Failed to upload file';
          completed++;
          if (completed === files.length) this.uploading = false;
        },
      });
    });

    input.value = '';
  }

  deleteFile(file: BookFileDto): void {
    if (!confirm('Delete file?')) return;
    this.deletingFileId = file.id;

    this.adminBooks.deleteFile(file.id).subscribe({
      next: () => {
        this.bookFiles = this.bookFiles.filter((f) => f.id !== file.id);
        this.filesUpdated.emit(this.bookFiles);
        this.deletingFileId = null;
      },
      error: () => {
        this.error = 'Failed to delete file';
        this.deletingFileId = null;
      },
    });
  }
}
