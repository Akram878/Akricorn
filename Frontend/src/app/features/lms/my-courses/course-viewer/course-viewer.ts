import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import {
  PublicCoursesService,
  MyCourseDetail,
  CourseLessonFile,
  CourseLearningPathProgress,
} from '../../../../core/services/public-courses.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { resolveMediaUrl } from '../../../../core/utils/media-url';
type ViewerType = 'video' | 'pdf' | 'image' | 'audio' | 'embed' | 'download';

interface SelectedLessonFile {
  id: number;
  name: string;
  url: string;
  displayUrl: string;
  safeUrl: SafeResourceUrl | null;
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
export class CourseViewer implements OnInit, OnDestroy {
  courseId!: number;
  course: MyCourseDetail | null = null;

  selectedFile: SelectedLessonFile | null = null;
  courseThumbnailUrl: string | null = null;
  isLoading = false;
  error: string | null = null;
  isMediaLoading = false;
  isSidebarOpen = true;
  completingLessons = new Set<number>();
  private activeObjectUrl: string | null = null;
  private courseThumbnailObjectUrl: string | null = null;
  private mediaSubscription?: Subscription;
  private courseThumbnailSubscription?: Subscription;
  private authSubscription?: Subscription;
  constructor(
    private route: ActivatedRoute,
    private coursesService: PublicCoursesService,
    private sanitizer: DomSanitizer,
    private notifications: NotificationService,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('id');
    this.courseId = param ? Number(param) : NaN;

    if (!this.courseId || Number.isNaN(this.courseId)) {
      this.error = 'لم يتم العثور على الكورس المطلوب.';
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.error = 'يرجى تسجيل الدخول للوصول إلى الكورس.';
      return;
    }

    this.authSubscription = this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (!isAuthenticated) {
        this.cleanupMediaUrl();
        this.cleanupCourseThumbnail();
        this.course = null;
        this.selectedFile = null;
        this.error = 'يرجى تسجيل الدخول للوصول إلى الكورس.';
      }
    });
    this.loadCourse();
  }

  loadCourse(): void {
    this.isLoading = true;
    this.error = null;

    this.coursesService.getMyCourse(this.courseId).subscribe({
      next: (course) => {
        this.course = course;
        this.loadCourseThumbnail(course.thumbnailUrl);
        this.isLoading = false;
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

  selectFile(file: CourseLessonFile, lessonTitle: string, sectionTitle: string): void {
    const type = this.detectFileType(file);
    const resolvedUrl = resolveMediaUrl(file.url);

    this.cleanupMediaUrl();
    this.selectedFile = {
      id: file.id,
      name: file.name,
      url: resolvedUrl,
      displayUrl: '',
      safeUrl: null,
      type,
      lessonTitle,
      sectionTitle,
    };

    if (type === 'embed') {
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(resolvedUrl);
      this.selectedFile = { ...this.selectedFile, displayUrl: resolvedUrl, safeUrl };
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.handleMediaError(type);
      return;
    }

    this.isMediaLoading = true;

    this.mediaSubscription = this.http.get(resolvedUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (this.selectedFile?.id !== file.id) {
          this.isMediaLoading = false;
          return;
        }
        this.activeObjectUrl = URL.createObjectURL(blob);
        const safeUrl =
          type === 'pdf'
            ? this.sanitizer.bypassSecurityTrustResourceUrl(this.activeObjectUrl)
            : null;
        this.selectedFile = {
          ...this.selectedFile,
          displayUrl: this.activeObjectUrl,
          safeUrl,
        };
        this.isMediaLoading = false;
      },
      error: () => {
        this.isMediaLoading = false;
        this.handleMediaError(type);
      },
    });
  }

  closeViewer(): void {
    this.cleanupMediaUrl();
    this.selectedFile = null;
  }
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  completeLesson(lessonId: number): void {
    if (this.completingLessons.has(lessonId) || !this.course) {
      return;
    }

    this.completingLessons.add(lessonId);
    this.coursesService.completeLesson(this.courseId, lessonId).subscribe({
      next: (res) => {
        this.markLessonCompleted(lessonId);
        this.notifications.showSuccess(res.message || 'تم إنهاء الدرس.');
        if (res.courseCompleted) {
          this.loadCourse();
        }
        this.completingLessons.delete(lessonId);
      },
      error: (err) => {
        const message = err?.error?.message || 'تعذر إنهاء الدرس.';
        this.notifications.showError(message);
        this.completingLessons.delete(lessonId);
      },
    });
  }

  isLessonCompleting(lessonId: number): boolean {
    return this.completingLessons.has(lessonId);
  }

  get hasSections(): boolean {
    return (this.course?.sections?.length ?? 0) > 0;
  }

  get hasLearningPaths(): boolean {
    return (this.course?.learningPaths?.length ?? 0) > 0;
  }

  get courseProgressPercent(): number {
    const total = this.totalLessonsCount;
    if (!this.course) {
      return 0;
    }
    if (total === 0) {
      return 100;
    }
    if (this.course.completedAt) {
      return 100;
    }
    return Math.round((this.completedLessonsCount / total) * 100);
  }

  get completedLessonsCount(): number {
    if (!this.course) {
      return 0;
    }
    if (this.course.completedAt) {
      return this.totalLessonsCount;
    }
    return this.course.sections.reduce((sum, section) => {
      return (
        sum +
        section.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.isCompleted ? 1 : 0), 0)
      );
    }, 0);
  }

  get totalLessonsCount(): number {
    return this.course?.sections.reduce((sum, section) => sum + section.lessons.length, 0) ?? 0;
  }

  private detectFileType(file: Pick<CourseLessonFile, 'name' | 'url'>): ViewerType {
    const normalizedName = file.name.toLowerCase();
    const normalizedUrl = file.url.toLowerCase();
    const extension =
      normalizedName.split('.').pop()?.split('?')[0] ||
      normalizedUrl.split('.').pop()?.split('?')[0] ||
      '';

    if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'aac', 'm4a'].includes(extension)) return 'audio';
    if (extension === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) return 'image';

    // لو رابط خارجي يمكن تضمينه
    if (normalizedUrl.startsWith('http')) return 'embed';

    return 'download';
  }

  formatPathProgress(path: CourseLearningPathProgress): string {
    if (!path.totalCourses) return '0%';
    return `${path.completedCourses}/${path.totalCourses} · ${path.completionPercent}%`;
  }

  handleMediaError(type: ViewerType): void {
    const messageMap: Record<ViewerType, string> = {
      video: 'تعذر تحميل الفيديو حالياً. حاول مرة أخرى لاحقاً.',
      audio: 'تعذر تشغيل الملف الصوتي حالياً.',
      image: 'تعذر تحميل الصورة.',
      pdf: 'تعذر تحميل ملف PDF.',
      embed: 'تعذر تحميل المحتوى الخارجي.',
      download: 'تعذر تحميل الملف.',
    };

    const message = messageMap[type] || 'تعذر تحميل الملف.';
    this.notifications.showError(message);
  }

  ngOnDestroy(): void {
    this.cleanupMediaUrl();
    this.cleanupCourseThumbnail();

    this.authSubscription?.unsubscribe();
  }

  private cleanupMediaUrl(): void {
    if (this.mediaSubscription) {
      this.mediaSubscription.unsubscribe();
      this.mediaSubscription = undefined;
    }
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
    this.isMediaLoading = false;
  }

  private loadCourseThumbnail(thumbnailUrl?: string | null): void {
    this.cleanupCourseThumbnail();

    if (!thumbnailUrl) {
      this.courseThumbnailUrl = null;
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.courseThumbnailUrl = null;
      return;
    }

    const resolvedUrl = resolveMediaUrl(thumbnailUrl);

    this.courseThumbnailSubscription = this.http
      .get(resolvedUrl, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          this.courseThumbnailObjectUrl = URL.createObjectURL(blob);
          this.courseThumbnailUrl = this.courseThumbnailObjectUrl;
        },
        error: () => {
          this.courseThumbnailUrl = null;
        },
      });
  }

  private cleanupCourseThumbnail(): void {
    if (this.courseThumbnailSubscription) {
      this.courseThumbnailSubscription.unsubscribe();
      this.courseThumbnailSubscription = undefined;
    }
    if (this.courseThumbnailObjectUrl) {
      URL.revokeObjectURL(this.courseThumbnailObjectUrl);
      this.courseThumbnailObjectUrl = null;
    }
  }

  private markLessonCompleted(lessonId: number): void {
    if (!this.course) {
      return;
    }
    for (const section of this.course.sections) {
      const lesson = section.lessons.find((entry) => entry.id === lessonId);
      if (lesson) {
        lesson.isCompleted = true;
        break;
      }
    }
  }
}
