import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  PublicCoursesService,
  MyCourseDetail,
  CourseLessonFile,
  CourseLearningPathProgress,
} from '../../../../core/services/public-courses.service';
import { NotificationService } from '../../../../core/services/notification.service';

type ViewerType = 'video' | 'pdf' | 'image' | 'audio' | 'embed' | 'download';

interface SelectedLessonFile {
  id: number;
  name: string;
  url: string;
  safeUrl: SafeResourceUrl;
  type: ViewerType;
  lessonTitle: string;
  sectionTitle: string;
}

@Component({
  selector: 'app-course-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-viewer.html',
  styleUrl: './course-viewer.scss',
})
export class CourseViewer implements OnInit {
  courseId!: number;
  course: MyCourseDetail | null = null;

  selectedFile: SelectedLessonFile | null = null;

  isLoading = false;
  isCompleting = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private coursesService: PublicCoursesService,
    private sanitizer: DomSanitizer,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('id');
    this.courseId = param ? Number(param) : NaN;

    if (!this.courseId || Number.isNaN(this.courseId)) {
      this.error = 'لم يتم العثور على الكورس المطلوب.';
      return;
    }

    this.loadCourse();
  }

  loadCourse(): void {
    this.isLoading = true;
    this.error = null;

    this.coursesService.getMyCourse(this.courseId).subscribe({
      next: (course) => {
        this.course = course;
        this.isLoading = false;
        this.preselectFirstFile();
      },
      error: (err) => {
        if (err?.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'حدث خطأ أثناء تحميل الكورس.';
        }
        this.isLoading = false;
      },
    });
  }

  private preselectFirstFile(): void {
    if (!this.course || !this.course.sections?.length) {
      return;
    }

    for (const section of this.course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.files?.length) {
          this.selectFile(lesson.files[0], lesson.title, section.title);
          return;
        }
      }
    }
  }

  selectFile(file: CourseLessonFile, lessonTitle: string, sectionTitle: string): void {
    const type = this.detectFileType(file.url);

    this.selectedFile = {
      id: file.id,
      name: file.name,
      url: file.url,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(file.url),
      type,
      lessonTitle,
      sectionTitle,
    };
  }

  finishCourse(): void {
    if (this.isCompleting) {
      return;
    }

    this.isCompleting = true;
    this.coursesService.completeMyCourse(this.courseId).subscribe({
      next: (res) => {
        if (this.course) {
          this.course.completedAt =
            res.completedAt ?? this.course.completedAt ?? new Date().toISOString();
          this.course.learningPaths = res.learningPaths;
        }

        const message = res.message || 'تم إنهاء الكورس بنجاح.';
        this.notifications.showSuccess(message);
        this.isCompleting = false;
      },
      error: (err) => {
        const message = err?.error?.message || 'تعذر إنهاء الكورس.';
        this.notifications.showError(message);
        this.isCompleting = false;
      },
    });
  }

  get hasSections(): boolean {
    return (this.course?.sections?.length ?? 0) > 0;
  }

  get hasLearningPaths(): boolean {
    return (this.course?.learningPaths?.length ?? 0) > 0;
  }

  private detectFileType(url: string): ViewerType {
    const normalized = url.toLowerCase();
    const extension = normalized.split('.').pop()?.split('?')[0] || '';

    if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'aac', 'm4a'].includes(extension)) return 'audio';
    if (extension === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';

    // لو رابط خارجي يمكن تضمينه
    if (normalized.startsWith('http')) return 'embed';

    return 'download';
  }

  formatPathProgress(path: CourseLearningPathProgress): string {
    if (!path.totalCourses) return '0%';
    return `${path.completedCourses}/${path.totalCourses} · ${path.completionPercent}%`;
  }
}
