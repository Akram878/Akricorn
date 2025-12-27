import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import {
  AdminPathsService,
  AdminLearningPathDto,
  CreateLearningPathRequest,
  UpdateLearningPathRequest,
} from '../../../core/services/admin-paths.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminCoursesService, AdminCourseDto } from '../../../core/services/admin-courses.service';

type PathView = AdminLearningPathDto & {
  price?: number;
  discount?: number;
  rating?: number;
  ratingCount?: number;
};

@Component({
  selector: 'app-dashboard-paths',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, ReactiveFormsModule],
  templateUrl: './dashboard-paths.html',
  styleUrl: './dashboard-paths.scss',
})
export class DashboardPaths implements OnInit {
  paths: PathView[] = [];
  isLoading = false;
  error: string | null = null;

  // كل الكورسات المتاحة في النظام
  courses: AdminCourseDto[] = [];
  isLoadingCourses = false;

  // الكورسات التي تنتمي للمسار الحالي وبالترتيب
  selectedCourseIds: number[] = [];

  // فورم المسار
  pathForm: FormGroup;
  isSaving = false;
  editMode = false;
  editingPathId: number | null = null;

  // هل مودال المسار مفتوح؟
  showForm = false;

  constructor(
    private adminPaths: AdminPathsService,
    private adminCourses: AdminCoursesService,
    private fb: FormBuilder
  ) {
    this.pathForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      thumbnailUrl: ['', [Validators.maxLength(500)]],

      price: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadPaths();
    this.loadCourses();
  }

  loadPaths(): void {
    this.isLoading = true;
    this.error = null;

    this.adminPaths.getAll().subscribe({
      next: (data) => {
        this.paths = data as PathView[];
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load learning paths.';
        this.isLoading = false;
      },
    });
  }

  loadCourses(): void {
    this.isLoadingCourses = true;

    this.adminCourses.getAll().subscribe({
      next: (data) => {
        this.courses = data;
        this.isLoadingCourses = false;
      },
      error: () => {
        this.isLoadingCourses = false;
      },
    });
  }

  // اسم الكورس من الـ ID (للعرض)
  getCourseTitle(id: number): string {
    const c = this.courses.find((x) => x.id === id);
    return c ? c.title : `Course #${id}`;
  }

  // فتح مودال إنشاء مسار جديد
  openCreateForm(): void {
    this.editMode = false;
    this.editingPathId = null;
    this.pathForm.reset({
      title: '',
      description: '',
      thumbnailUrl: '',

      price: 0,
      discount: 0,
      isActive: true,
    });
    this.selectedCourseIds = [];
    this.error = null;
    this.isSaving = false;
    this.showForm = true;
  }

  // فتح مودال تعديل مسار
  onEdit(path: PathView): void {
    this.editMode = true;
    this.editingPathId = path.id;

    this.pathForm.setValue({
      title: path.title,
      description: path.description,
      thumbnailUrl: path.thumbnailUrl ?? '',

      price: path.price ?? 0,
      discount: path.discount ?? 0,
      isActive: path.isActive,
    });

    this.selectedCourseIds = [...(path.courseIds || [])];

    this.error = null;
    this.isSaving = false;
    this.showForm = true;
  }

  // إغلاق المودال
  resetForm(): void {
    this.editMode = false;
    this.editingPathId = null;
    this.pathForm.reset({
      title: '',
      description: '',
      thumbnailUrl: '',

      price: 0,
      discount: 0,
      isActive: true,
    });
    this.selectedCourseIds = [];
    this.isSaving = false;
    this.error = null;
    this.showForm = false;
  }

  // إضافة كورس للمسار
  onAddCourse(courseIdStr: string): void {
    const id = Number(courseIdStr);
    if (!id || Number.isNaN(id)) return;
    if (this.selectedCourseIds.includes(id)) return;
    this.selectedCourseIds.push(id);
  }

  // إزالة كورس من المسار
  removeCourse(index: number): void {
    this.selectedCourseIds.splice(index, 1);
  }

  // تحريك كورس للأعلى
  moveCourseUp(index: number): void {
    if (index <= 0) return;
    const tmp = this.selectedCourseIds[index - 1];
    this.selectedCourseIds[index - 1] = this.selectedCourseIds[index];
    this.selectedCourseIds[index] = tmp;
  }

  // تحريك كورس للأسفل
  moveCourseDown(index: number): void {
    if (index >= this.selectedCourseIds.length - 1) return;
    const tmp = this.selectedCourseIds[index + 1];
    this.selectedCourseIds[index + 1] = this.selectedCourseIds[index];
    this.selectedCourseIds[index] = tmp;
  }

  // حفظ المسار (إنشاء / تعديل)
  onSubmit(): void {
    if (this.pathForm.invalid || this.isSaving) return;

    this.isSaving = true;
    this.error = null;

    const value = this.pathForm.value;
    const payload: any = {
      title: value.title,
      description: value.description,
      thumbnailUrl: value.thumbnailUrl,

      price: value.price,
      discount: value.discount,
      isActive: value.isActive,
      courseIds: [...this.selectedCourseIds], // الترتيب مهم هنا
    };

    if (this.editMode && this.editingPathId != null) {
      this.adminPaths.update(this.editingPathId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadPaths();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to update learning path.';
        },
      });
    } else {
      this.adminPaths.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.resetForm();
          this.loadPaths();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to create learning path.';
        },
      });
    }
  }

  // تفعيل / تعطيل مسار
  onToggle(path: AdminLearningPathDto): void {
    this.adminPaths.toggleActive(path.id).subscribe({
      next: (res) => {
        path.isActive = res.isActive;
      },
      error: () => {
        this.error = 'Failed to change status.';
      },
    });
  }

  // حذف مسار
  onDelete(path: AdminLearningPathDto): void {
    const confirmDelete = confirm(`Delete learning path "${path.title}" ?`);
    if (!confirmDelete) return;

    this.adminPaths.delete(path.id).subscribe({
      next: () => {
        this.paths = this.paths.filter((p) => p.id !== path.id);
      },
      error: () => {
        this.error = 'Failed to delete learning path.';
      },
    });
  }
}
