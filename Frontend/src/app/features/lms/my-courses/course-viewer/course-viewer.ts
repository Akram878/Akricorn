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
import { resolveMediaUrl } from '../../../../core/utils/media-url';
type ViewerType = 'video' | 'pdf' | 'image' | 'audio' | 'embed' | 'download';

interface SelectedLessonFile {
  id: number;
  name: string;
  url: string;
  displayUrl: string;
  safeUrl?: SafeResourceUrl;
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
    const token = localStorage.getItem('auth_token');
    if (!token || this.isTokenExpired(token)) {
      this.error = 'يرجى تسجيل الدخول للوصول إلى الكورس.';
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
    const displayUrl = this.withAuthToken(resolvedUrl);
    const safeUrl =
      type === 'pdf' || type === 'embed'
        ? this.sanitizer.bypassSecurityTrustResourceUrl(displayUrl)
        : undefined;
    this.selectedFile = {
      id: file.id,
      name: file.name,
      url: resolvedUrl,
      displayUrl,
      safeUrl,
      type,
      lessonTitle,
      sectionTitle,
    };
  }

  closeViewer(): void {
    this.selectedFile = null;
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

  private getAuthToken(): string | undefined {
    const userToken = localStorage.getItem('auth_token');
    return userToken ?? undefined;
  }

  private withAuthToken(url: string): string {
    if (typeof window === 'undefined') {
      return url;
    }

    const token = this.getAuthToken();
    if (!token || url.includes('token=')) {
      return url;
    }

    if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
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

  private isTokenExpired(token: string): boolean {
    try {
      const payloadSegment = token.split('.')[1];
      if (!payloadSegment) {
        return true;
      }

      const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '='
      );
      const payload = JSON.parse(atob(padded));

      if (!payload?.exp) {
        return true;
      }

      const expiryMs = payload.exp * 1000;
      return Date.now() >= expiryMs;
    } catch {
      return true;
    }
  }
}
