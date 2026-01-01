import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

import { NgIf, NgForOf, NgClass, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  AdminCourseContentService,
  CourseContentDto,
  CourseContentResponse,
} from '../../../../core/services/admin-course-content.service';
import { ChangeDetectorRef } from '@angular/core';
import { getImageDimensions } from '../../../../shared/utils/image-dimensions';
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
  @Output() thumbnailSelected = new EventEmitter<File>();

  loading = false;
  error: string | null = null;
  content: CourseContentDto | null = null;
  thumbnailPreview: string | null = null;
  newSectionTitle = '';
  newSectionOrder = 1;

  newLessonTitle: { [id: number]: string } = {};
  newLessonOrder: { [id: number]: number } = {};

  constructor(private api: AdminCourseContentService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['courseId'] || changes['isCreateMode']) {
      this.thumbnailPreview = null;
    }

    if (!this.isCreateMode && changes['courseId']) this.loadContent();
  }

  // ==================== LOAD CONTENT ====================
  loadContent(): void {
    this.loading = true;

    this.api.getCourseContent(this.courseId).subscribe({
      next: (res) => {
        this.applyContent(res);
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
    const payload = {
      title: this.newSectionTitle.trim(),
      order: this.newSectionOrder,
    };

    this.api.createSection(this.courseId, payload).subscribe({
      next: (res) => {
        this.newSectionTitle = '';
        this.newSectionOrder = 1;
        this.applyContent(res.content);
      },
      error: (err) => {
        if (err.status === 409 && confirm('Section order exists. Insert here and shift others?')) {
          this.api
            .createSection(this.courseId, { ...payload, forceInsert: true })
            .subscribe((res: CourseContentResponse) => {
              this.newSectionTitle = '';
              this.newSectionOrder = 1;
              this.applyContent(res.content);
            });
          return;
        }

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
        next: (res) => this.applyContent(res.content),
        error: () => {
          this.error = 'Failed to update section';
          this.cdr.detectChanges();
        },
      });
  }

  deleteSection(sectionId: number): void {
    if (!confirm('Delete this section?')) return;

    this.api.deleteSection(sectionId).subscribe({
      next: (res) => this.applyContent(res.content),
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

    const payload = { title, order };

    this.api.createLesson(section.id, payload).subscribe({
      next: (res) => {
        this.newLessonTitle[section.id] = '';
        this.newLessonOrder[section.id] = 1;

        this.applyContent(res.content);
      },
      error: (err) => {
        if (err.status === 409 && confirm('Lesson order exists. Place here and move others?')) {
          this.api
            .createLesson(section.id, { ...payload, forceInsert: true })
            .subscribe((res: CourseContentResponse) => {
              this.newLessonTitle[section.id] = '';
              this.newLessonOrder[section.id] = 1;
              this.applyContent(res.content);
            });
          return;
        }
        this.error = 'Failed to create lesson';
        this.cdr.detectChanges();
      },
    });
  }

  saveLesson(lesson: any): void {
    this.api.updateLesson(lesson.id, { title: lesson.title, order: lesson.order }).subscribe({
      next: (res) => this.applyContent(res.content),
      error: () => {
        this.error = 'Failed to update lesson';
        this.cdr.detectChanges();
      },
    });
  }

  deleteLesson(lessonId: number): void {
    if (!confirm('Delete this lesson?')) return;

    this.api.deleteLesson(lessonId).subscribe({
      next: (res) => this.applyContent(res.content),
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
        next: (res) => this.applyContent(res.content),
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
      next: (res) => this.applyContent(res.content),
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

    const file = input.files[0];
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
        reader.onload = () => {
          this.thumbnailPreview = typeof reader.result === 'string' ? reader.result : null;
        };
        reader.readAsDataURL(file);
        this.thumbnailSelected.emit(file);
        input.value = '';
      })
      .catch(() => {
        this.error = 'Failed to load selected thumbnail.';
        input.value = '';
      });
  }

  private applyContent(res?: CourseContentDto | CourseContentResponse | null): void {
    if (!res) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    const content = (res as CourseContentResponse).content ?? (res as CourseContentDto);
    if (content) {
      this.content = content;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
