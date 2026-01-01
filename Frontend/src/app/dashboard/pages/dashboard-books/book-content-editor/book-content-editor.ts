import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgForOf } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminBooksService, BookFileDto } from '../../../../core/services/admin-books.service';
import { getImageDimensions } from '../../../../shared/utils/image-dimensions';
type BookFileView = BookFileDto & {
  originalName?: string;
  downloadUrl?: string;
  size?: number;
  mimeType?: string;
};

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
  @Input() files: BookFileView[] = [];

  @Output() closeEditor = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() thumbnailSelected = new EventEmitter<File>();
  @Output() filesUpdated = new EventEmitter<BookFileView[]>();

  bookFiles: BookFileView[] = [];
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
    this.error = null;

    if (!file.type.startsWith('image/')) {
      this.error = 'Thumbnail must be an image file.';
      input.value = '';
      return;
    }

    this.error = null;

    getImageDimensions(file)
      .then(({ width, height }) => {
        const isValid = width <= 50 && height <= 50;
        if (!isValid) {
          this.error = 'Thumbnail must be 50x50 or smaller.';
          input.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = () => this.form.patchValue({ thumbnailUrl: reader.result });
        reader.readAsDataURL(file);
        this.thumbnailSelected.emit(file);
        input.value = '';
      })
      .catch(() => {
        this.error = 'Failed to load selected thumbnail.';
        input.value = '';
      });
  }

  onFilesSelected(event: Event): void {
    if (this.isCreateMode || !this.bookId) return;

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.error = null;
    const files = Array.from(input.files);
    const validFiles = files.filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length !== files.length) {
      this.error = 'Only PDF files can be uploaded.';
    }

    if (validFiles.length === 0) {
      input.value = '';
      return;
    }
    this.uploading = true;

    let completed = 0;
    validFiles.forEach((file) => {
      this.adminBooks.uploadFile(this.bookId, file).subscribe({
        next: (res) => {
          this.bookFiles = (res.book?.files as BookFileView[]) ?? this.bookFiles;
          this.filesUpdated.emit(this.bookFiles);
          completed++;
          if (completed === validFiles.length) this.uploading = false;
        },
        error: () => {
          this.error = 'Failed to upload file';
          completed++;
          if (completed === validFiles.length) this.uploading = false;
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
