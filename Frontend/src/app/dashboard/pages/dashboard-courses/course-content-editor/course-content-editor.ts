import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

import { NgIf, NgForOf, NgClass, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminCourseContentService } from '../../../../core/services/admin-course-content.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-course-content-editor',
  standalone: true,
  templateUrl: './course-content-editor.html',
  styleUrls: ['./course-content-editor.scss'],
  imports: [NgIf, NgForOf, NgClass, FormsModule, ReactiveFormsModule, CurrencyPipe],
})
export class CourseContentEditor implements OnChanges {
  @Input() courseId!: number;
  @Input() courseTitle!: string;
  @Input() isCreateMode!: boolean;
  @Input() form: any;
  @Input() paths: any[] = [];

  @Output() closeEditor = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() reloadCourses = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  content: any = null;

  newSectionTitle = '';
  newSectionOrder = 1;

  newLessonTitle: { [id: number]: string } = {};
  newLessonOrder: { [id: number]: number } = {};

  constructor(private api: AdminCourseContentService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isCreateMode && changes['courseId']) this.loadContent();
  }

  // ==================== LOAD CONTENT ====================
  loadContent(): void {
    this.loading = true;

    this.api.getCourseContent(this.courseId).subscribe({
      next: (res) => {
        this.content = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load course content';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== SECTIONS ====================
  addSection(): void {
    if (!this.newSectionTitle.trim()) return;

    this.api
      .createSection(this.courseId, {
        title: this.newSectionTitle.trim(),
        order: this.newSectionOrder,
      })
      .subscribe({
        next: () => {
          this.newSectionTitle = '';
          this.newSectionOrder = 1;

          this.loadContent();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Failed to create section';
          this.cdr.detectChanges();
        },
      });
  }

  saveSection(section: any): void {
    this.api
      .updateSection(section.id, {
        title: section.title,
        order: section.order,
      })
      .subscribe({
        next: () => {
          this.loadContent();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Failed to update section';
          this.cdr.detectChanges();
        },
      });
  }

  deleteSection(sectionId: number): void {
    if (!confirm('Delete this section?')) return;

    this.api.deleteSection(sectionId).subscribe({
      next: () => {
        this.loadContent();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to delete section';
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== LESSONS ====================
  addLesson(section: any): void {
    const title = this.newLessonTitle[section.id]?.trim() || 'Lesson';
    const order = this.newLessonOrder[section.id] || 1;

    this.api.createLesson(section.id, { title, order }).subscribe({
      next: () => {
        this.newLessonTitle[section.id] = '';
        this.newLessonOrder[section.id] = 1;

        this.loadContent();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to create lesson';
        this.cdr.detectChanges();
      },
    });
  }

  deleteLesson(lessonId: number): void {
    if (!confirm('Delete this lesson?')) return;

    this.api.deleteLesson(lessonId).subscribe({
      next: () => {
        this.loadContent();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to delete lesson';
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== FILES ====================
  onFilesSelected(event: Event, lessonId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);

    files.forEach((file) => {
      this.api.uploadLessonFile(lessonId, file).subscribe({
        next: () => {
          this.loadContent();
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Failed to upload file';
          this.cdr.detectChanges();
        },
      });
    });

    input.value = '';
  }

  deleteFile(fileId: number): void {
    if (!confirm('Delete file?')) return;

    this.api.deleteLessonFile(fileId).subscribe({
      next: () => {
        this.loadContent();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to delete file';
        this.cdr.detectChanges();
      },
    });
  }

  // ==================== THUMBNAIL PREVIEW ONLY ====================
  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const reader = new FileReader();
    reader.onload = () => this.form.patchValue({ thumbnailUrl: reader.result });

    reader.readAsDataURL(input.files[0]);
    input.value = '';
  }
}
