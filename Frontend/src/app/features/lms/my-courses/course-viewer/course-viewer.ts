import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
export class CourseViewer implements OnInit, OnDestroy {
  courseId!: number;
  course: MyCourseDetail | null = null;

  selectedFile: SelectedLessonFile | null = null;

  isLoading = false;
  isCompleting = false;
  error: string | null = null;
  isMediaLoading = false;

  private activeObjectUrl: string | null = null;
  private mediaSubscription?: Subscription;
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

    this.cleanupMediaUrl();
    this.selectedFile = {
      id: file.id,
      name: file.name,
      url: resolvedUrl,
      displayUrl: '',
      safeUrl: undefined,
      type,
      lessonTitle,
      sectionTitle,
    };

    if (type === 'embed') {
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(resolvedUrl);
      this.selectedFile = { ...this.selectedFile, displayUrl: resolvedUrl, safeUrl };
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.handleMediaError(type);
      return;
    }

    this.isMediaLoading = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.mediaSubscription = this.http
      .get(resolvedUrl, { responseType: 'blob', headers })
      .subscribe({
        next: (blob) => {
          if (this.selectedFile?.id !== file.id) {
            this.isMediaLoading = false;
            return;
          }
          this.activeObjectUrl = URL.createObjectURL(blob);
          const safeUrl =
            type === 'pdf'
              ? this.sanitizer.bypassSecurityTrustResourceUrl(this.activeObjectUrl)
              : undefined;
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
}
