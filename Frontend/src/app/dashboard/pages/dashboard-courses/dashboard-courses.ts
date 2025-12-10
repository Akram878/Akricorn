import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgForOf } from '@angular/common';
import {
  AdminCoursesService,
  AdminCourseDto,
  CreateCourseRequest,
} from '../../../core/services/admin-courses.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminPathsService,
  AdminLearningPathDto,
} from '../../../core/services/admin-paths.service';

import { CourseContentEditor } from './course-content-editor/course-content-editor';

@Component({
  selector: 'app-dashboard-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, CurrencyPipe, ReactiveFormsModule, CourseContentEditor],
  templateUrl: './dashboard-courses.html',
  styleUrl: './dashboard-courses.scss',
})
export class DashboardCourses implements OnInit {
  @ViewChild(CourseContentEditor)
  contentEditor!: CourseContentEditor;

  courses: AdminCourseDto[] = [];
  paths: AdminLearningPathDto[] = [];

  isLoading = false;
  isSaving = false;
  isEditorOpen = false;
  isCreateMode = false;

  error: string | null = null;
  selectedCourse: AdminCourseDto | null = null;

  courseForm: FormGroup;

  constructor(
    private adminCourses: AdminCoursesService,
    private adminPaths: AdminPathsService,
    private fb: FormBuilder
  ) {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      category: ['', Validators.required],
      price: [0, Validators.required],
      hours: [0, Validators.required],
      thumbnailUrl: [''],
      description: ['', Validators.required],
      isActive: [true],

      learningPathId: [null],
    });
  }

  ngOnInit(): void {
    this.loadCourses();
    this.loadPaths();
  }

  loadCourses(): void {
    this.isLoading = true;
    this.adminCourses.getAll().subscribe({
      next: (res) => {
        this.courses = res;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load courses';
        this.isLoading = false;
      },
    });
  }

  loadPaths(): void {
    this.adminPaths.getAll().subscribe({
      next: (res) => (this.paths = res),
      error: () => {},
    });
  }

  // ===================== CREATE =====================
  openCreateEditor(): void {
    this.isEditorOpen = true;
    this.isCreateMode = true;
    this.selectedCourse = null;

    this.courseForm.reset({
      title: '',
      category: '',
      price: 0,
      hours: 0,
      thumbnailUrl: '',
      description: '',
      isActive: true,

      learningPathId: null,
    });
  }

  // ===================== EDIT =====================
  openEditEditor(course: AdminCourseDto): void {
    this.isEditorOpen = true;
    this.isCreateMode = false;
    this.selectedCourse = course;

    this.courseForm.setValue({
      title: course.title,
      category: course.category ?? '',
      price: course.price,
      hours: course.hours ?? 0,
      thumbnailUrl: course.thumbnailUrl ?? '',
      description: course.description,
      isActive: course.isActive,

      learningPathId: course.pathIds?.length ? course.pathIds[0] : null,
    });

    setTimeout(() => {
      this.contentEditor.courseId = course.id;
      this.contentEditor.loadContent();
    });
  }

  // ===================== SAVE =====================
  onSubmitEditor(): void {
    if (this.courseForm.invalid || this.isSaving) return;

    this.isSaving = true;

    const v = this.courseForm.value;

    const payload: CreateCourseRequest = {
      title: v.title,
      description: v.description,
      price: v.price,
      isActive: v.isActive,
      hours: v.hours,
      category: v.category,
      rating: 0,
      thumbnailUrl: v.thumbnailUrl,

      pathIds: v.learningPathId ? [v.learningPathId] : [],
    };

    if (this.isCreateMode) {
      this.adminCourses.create(payload).subscribe({
        next: (res) => {
          this.isSaving = false;
          this.isCreateMode = false;

          this.selectedCourse = {
            ...payload,
            id: res.id,
          };

          setTimeout(() => {
            this.contentEditor.courseId = res.id;
            this.contentEditor.loadContent();
          });

          this.loadCourses();
        },
        error: () => {
          this.error = 'Failed to create course';
          this.isSaving = false;
        },
      });
    } else if (this.selectedCourse) {
      this.adminCourses.update(this.selectedCourse.id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.loadCourses();
        },
        error: () => {
          this.error = 'Failed to update course';
          this.isSaving = false;
        },
      });
    }
  }

  // ===================== TOGGLE =====================
  onToggle(course: AdminCourseDto): void {
    this.adminCourses.toggleActive(course.id).subscribe({
      next: (res) => (course.isActive = res.isActive),
      error: () => (this.error = 'Failed to change status'),
    });
  }

  // ===================== DELETE =====================
  onDelete(course: AdminCourseDto): void {
    if (!confirm(`Delete course "${course.title}" ?`)) return;

    this.adminCourses.delete(course.id).subscribe({
      next: () => {
        this.courses = this.courses.filter((c) => c.id !== course.id);
      },
      error: () => (this.error = 'Failed to delete course'),
    });
  }

  closeEditor(): void {
    this.isEditorOpen = false;
  }

  reloadCourses(): void {
    this.loadCourses();
  }

  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    this.adminCourses.uploadThumbnail(file).subscribe({
      next: (res) => this.courseForm.patchValue({ thumbnailUrl: res.url }),
      error: () => (this.error = 'Failed to upload thumbnail'),
    });

    input.value = '';
  }
}
