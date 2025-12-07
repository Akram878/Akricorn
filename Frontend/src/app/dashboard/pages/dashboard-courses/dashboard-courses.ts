import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgForOf } from '@angular/common';
import {
  AdminCoursesService,
  AdminCourseDto,
  CreateCourseRequest,
  UpdateCourseRequest,
} from '../../../core/services/admin-courses.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminPathsService,
  AdminLearningPathDto,
} from '../../../core/services/admin-paths.service';

@Component({
  selector: 'app-dashboard-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, CurrencyPipe, ReactiveFormsModule],
  templateUrl: './dashboard-courses.html',
  styleUrl: './dashboard-courses.scss',
})
export class DashboardCourses implements OnInit {
  courses: AdminCourseDto[] = [];
  isLoading = false;
  error: string | null = null;

  // learning paths للـ select
  paths: AdminLearningPathDto[] = [];
  isLoadingPaths = false;

  // فورم الإنشاء / التعديل
  courseForm: FormGroup;
  isSaving = false;
  editMode = false;
  editingCourseId: number | null = null;

  // هل المودال مفتوح؟
  showForm = false;

  constructor(
    private adminCourses: AdminCoursesService,
    private adminPaths: AdminPathsService,
    private fb: FormBuilder
  ) {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      category: ['', [Validators.required, Validators.maxLength(100)]],
      price: [0, [Validators.required, Validators.min(0)]],
      hours: [0, [Validators.required, Validators.min(0)]],
      thumbnailUrl: ['', [Validators.required, Validators.maxLength(500)]],
      description: ['', [Validators.required, Validators.maxLength(4000)]],
      isActive: [true],
      // إدخال IDs الكتب كنص
      bookIdsText: [''],
      learningPathId: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadCourses();
    this.loadPaths();
  }

  // تحميل الكورسات
  loadCourses(): void {
    this.isLoading = true;
    this.error = null;

    this.adminCourses.getAll().subscribe({
      next: (data) => {
        this.courses = data;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load courses.';
        this.isLoading = false;
      },
    });
  }

  // تحميل الـ learning paths لاستخدامها في الـ select
  loadPaths(): void {
    this.isLoadingPaths = true;

    this.adminPaths.getAll().subscribe({
      next: (data) => {
        this.paths = data;
        this.isLoadingPaths = false;
      },
      error: () => {
        this.isLoadingPaths = false;
        // نخلي الكورسات تشتغل حتى لو paths فشلت
      },
    });
  }

  // تحويل النص إلى قائمة IDs
  private parseBookIds(text: string): number[] {
    if (!text || !text.trim()) return [];
    return text
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x !== '')
      .map((x) => Number(x))
      .filter((x) => !Number.isNaN(x));
  }

  // فتح الفورم لإنشاء كورس جديد
  openCreateForm(): void {
    this.editMode = false;
    this.editingCourseId = null;
    this.courseForm.reset({
      title: '',
      category: '',
      price: 0,
      hours: 0,
      thumbnailUrl: '',
      description: '',
      isActive: true,
      bookIdsText: '',
      learningPathId: this.paths.length > 0 ? this.paths[0].id : null,
    });
    this.error = null;
    this.isSaving = false;
    this.showForm = true;
  }

  // تعبئة الفورم للتعديل
  onEdit(course: AdminCourseDto): void {
    this.editMode = true;
    this.editingCourseId = course.id;

    this.courseForm.setValue({
      title: course.title,
      category: course.category || '',
      price: course.price,
      hours: course.hours ?? 0,
      thumbnailUrl: course.thumbnailUrl || '',
      description: course.description,
      isActive: course.isActive,
      bookIdsText: (course.bookIds || []).join(','),
      learningPathId: course.learningPathId ?? this.paths[0]?.id ?? null,
    });

    this.error = null;
    this.isSaving = false;
    this.showForm = true;
  }

  // إغلاق الفورم / إعادة للوضع الافتراضي
  resetForm(): void {
    this.editMode = false;
    this.editingCourseId = null;
    this.courseForm.reset({
      title: '',
      category: '',
      price: 0,
      hours: 0,
      thumbnailUrl: '',
      description: '',
      isActive: true,
      bookIdsText: '',
      learningPathId: null,
    });
    this.isSaving = false;
    this.error = null;
    this.showForm = false;
  }

  // إرسال الفورم (إنشاء أو تعديل)
  onSubmit(): void {
    if (this.courseForm.invalid || this.isSaving) return;

    this.isSaving = true;
    this.error = null;

    const value = this.courseForm.value;
    const payload: CreateCourseRequest | UpdateCourseRequest = {
      title: value.title,
      category: value.category,
      price: value.price,
      hours: value.hours,
      thumbnailUrl: value.thumbnailUrl,
      description: value.description,
      isActive: value.isActive,
      bookIds: this.parseBookIds(value.bookIdsText),
      learningPathId: value.learningPathId,
    };

    if (this.editMode && this.editingCourseId != null) {
      // تعديل
      this.adminCourses.update(this.editingCourseId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadCourses();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to update course.';
        },
      });
    } else {
      // إنشاء
      this.adminCourses.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadCourses();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to create course.';
        },
      });
    }
  }

  // تفعيل / تعطيل
  onToggle(course: AdminCourseDto): void {
    this.adminCourses.toggleActive(course.id).subscribe({
      next: (res) => {
        course.isActive = res.isActive;
      },
      error: () => {
        this.error = 'Failed to change status.';
      },
    });
  }

  // حذف
  onDelete(course: AdminCourseDto): void {
    const confirmDelete = confirm(`Delete course "${course.title}" ?`);
    if (!confirmDelete) return;

    this.adminCourses.delete(course.id).subscribe({
      next: () => {
        this.courses = this.courses.filter((c) => c.id !== course.id);
      },
      error: () => {
        this.error = 'Failed to delete course.';
      },
    });
  }
}
