import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { fromEvent, Subscription } from 'rxjs';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist/types/src/display/api';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils';
type ViewerType = 'video' | 'pdf' | 'image' | 'audio' | 'embed' | 'download';

interface SelectedLessonFile {
  id: number;
  name: string;
  url: string;
  displayUrl: string;
  safeUrl: SafeResourceUrl;
  type: ViewerType;
  lessonTitle: string;
  sectionTitle: string;
}

interface PdfJsLib {
  version?: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (
    src:
      | string
      | {
          url: string;
          withCredentials?: boolean;
          httpHeaders?: Record<string, string>;
        }
      | { data: Uint8Array }
  ) => PDFDocumentLoadingTask;
}
@Component({
  selector: 'app-course-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-viewer.html',
  styleUrl: './course-viewer.scss',
})
export class CourseViewer implements OnInit, AfterViewInit, OnDestroy {
  courseId!: number;
  course: MyCourseDetail | null = null;

  selectedFile: SelectedLessonFile | null = null;

  isLoading = false;
  isCompleting = false;
  error: string | null = null;

  @ViewChild('pdfContainer') pdfContainer?: ElementRef<HTMLDivElement>;

  pdfRenderError: string | null = null;
  isRenderingPdf = false;

  private resizeListener?: Subscription;
  private pdfjsLib: PdfJsLib | null = null;
  private pdfjsLibPromise?: Promise<PdfJsLib | null>;
  private pdfDocument: PDFDocumentProxy | null = null;
  private pdfLoadingTask: PDFDocumentLoadingTask | null = null;
  private renderTask: RenderTask | null = null;
  private pdfObjectUrl: string | null = null;
  private mediaObjectUrl: string | null = null;
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

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    this.resizeListener = fromEvent(window, 'resize').subscribe(() => this.renderSelectedPdf());
  }

  ngOnDestroy(): void {
    this.resizeListener?.unsubscribe();
    this.cleanupPdf();
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

  async selectFile(
    file: CourseLessonFile,
    lessonTitle: string,
    sectionTitle: string
  ): Promise<void> {
    const type = this.detectFileType(file);
    this.cleanupPdf();

    const token = this.getAuthToken();
    let displayUrl = file.url;
    let safeUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.url);

    if (type !== 'embed' && type !== 'pdf') {
      try {
        const objectUrl = await this.createObjectUrl(file.url, token);
        displayUrl = objectUrl;
        safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
        this.mediaObjectUrl = objectUrl;
      } catch (err) {
        if (this.isAuthError(err)) {
          this.notifications.showError('لا يمكنك الوصول إلى هذا الملف.');
          return;
        }

        console.error('Failed to prepare media URL', err);
        // حافظ على الرابط الأصلي في حال فشل إنشاء Blob URL حتى يتمكن المتصفح من محاولة تحميله مباشرة
        displayUrl = file.url;
        safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.url);
        this.mediaObjectUrl = null;
      }
    }
    this.selectedFile = {
      id: file.id,
      name: file.name,
      url: file.url,
      displayUrl,
      safeUrl,
      type,
      lessonTitle,
      sectionTitle,
    };

    if (type === 'pdf') {
      setTimeout(() => this.renderSelectedPdf());
    }
  }

  closeViewer(): void {
    this.cleanupPdf();
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

  private async renderSelectedPdf(): Promise<void> {
    if (!this.selectedFile || this.selectedFile.type !== 'pdf' || !this.pdfContainer) {
      return;
    }

    this.cleanupPdf();
    const container = this.pdfContainer.nativeElement;
    try {
      this.isRenderingPdf = true;
      this.pdfRenderError = null;
      const pdfjsLib = await this.loadPdfJs();
      if (!pdfjsLib || !this.selectedFile) {
        return;
      }
      const tokenToUse = this.getAuthToken();

      container.innerHTML = '';

      const pdfBytes = await this.fetchPdfBytes(this.selectedFile.url, tokenToUse);
      console.info('[PDF] Fetched bytes length', pdfBytes.byteLength);
      this.pdfLoadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const workerReadyPromise: Promise<unknown> | undefined =
        (this.pdfLoadingTask as any)?._worker?.promise ||
        (this.pdfLoadingTask as any)?._transport?.workerReadyPromise;

      if (workerReadyPromise) {
        workerReadyPromise
          .then(() => console.info('[PDF] Worker responded'))
          .catch((err) => console.error('[PDF] Worker failed to start', err));
      } else {
        console.warn('[PDF] Worker readiness promise not detected');
      }
      this.pdfDocument = await this.pdfLoadingTask.promise;

      if (!this.pdfDocument) {
        throw new Error('Failed to load PDF document');
      }

      console.info('[PDF] Loaded document pages', this.pdfDocument.numPages);

      const page = await this.pdfDocument.getPage(1);
      const viewport: PageViewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth || viewport.width;
      const scale = containerWidth / viewport.width;
      const scaledViewport: PageViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Cannot render PDF: missing canvas context');
      }

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';

      container.appendChild(canvas);

      this.renderTask = page.render({ canvasContext: context, viewport: scaledViewport, canvas });
      await this.renderTask.promise;
    } catch (err) {
      console.error(err);
      if (this.isAuthError(err)) {
        this.notifications.showError('لا يمكنك الوصول إلى ملف PDF.');
      }
      this.pdfRenderError = 'تعذر تحميل ملف PDF حالياً. حاول مرة أخرى لاحقاً.';
      container.innerHTML = '';
    } finally {
      this.isRenderingPdf = false;
    }
  }

  private async loadPdfJs(): Promise<PdfJsLib | null> {
    if (this.pdfjsLib) return this.pdfjsLib;
    if (this.pdfjsLibPromise) return this.pdfjsLibPromise;
    const workerSrc = `${window.location.origin}/pdfjs/pdf.worker.mjs`;

    this.pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf')
      .then((module: any) => {
        const lib = (module?.default as PdfJsLib) || (module as PdfJsLib | null);
        if (lib?.GlobalWorkerOptions) {
          lib.GlobalWorkerOptions.workerSrc = workerSrc;
        }
        console.info('[PDF] pdf.js version', lib?.version);
        console.info('[PDF] workerSrc configured', lib?.GlobalWorkerOptions?.workerSrc);
        this.pdfjsLib = lib ?? null;
        return lib ?? null;
      })
      .catch((err) => {
        console.error('Failed to load PDF.js', err);
        this.pdfRenderError = 'لم يتم تحميل مكتبة PDF.js. تأكد من تواجدها في مجلد public/pdfjs.';
        return null;
      });
    return this.pdfjsLibPromise;
  }
  private cleanupPdf(): void {
    // if (this.renderTask) {
    //   try {
    //     this.renderTask.cancel();
    //   } catch (err) {
    //     console.warn('Failed to cancel pdf render task', err);
    //   }
    // }

    // if (this.pdfLoadingTask) {
    //   try {
    //     this.pdfLoadingTask.destroy();
    //   } catch (err) {
    //     console.warn('Failed to destroy pdf loading task', err);
    //   }
    // }

    // if (this.pdfDocument) {
    //   try {
    //     this.pdfDocument.destroy();
    //   } catch (err) {
    //     console.warn('Failed to destroy pdf document', err);
    //   }
    if (this.renderTask) {
      try {
        this.renderTask.cancel();
      } catch (err) {
        console.warn('Failed to cancel pdf render task', err);
      }
    }

    if (this.pdfLoadingTask) {
      try {
        this.pdfLoadingTask.destroy();
      } catch (err) {
        console.warn('Failed to destroy pdf loading task', err);
      }
    }

    if (this.pdfDocument) {
      try {
        this.pdfDocument.destroy();
      } catch (err) {
        console.warn('Failed to destroy pdf document', err);
      }
    }

    if (this.mediaObjectUrl) {
      URL.revokeObjectURL(this.mediaObjectUrl);
      this.mediaObjectUrl = null;
    }
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }

    if (this.pdfContainer) {
      this.pdfContainer.nativeElement.innerHTML = '';
    }

    // this.renderTask = null;
    // this.pdfDocument = null;
    // this.pdfLoadingTask = null;
    this.renderTask = null;
    this.pdfDocument = null;
    this.pdfLoadingTask = null;
    this.isRenderingPdf = false;
    this.pdfRenderError = null;
  }

  private async fetchPdfBytes(url: string, token?: string): Promise<Uint8Array> {
    const response = await fetch(url, {
      credentials: 'include',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`PDF request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      console.warn('Unexpected PDF content-type', contentType || 'unknown');
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  private async createObjectUrl(url: string, token?: string): Promise<string> {
    const response = await fetch(url, {
      credentials: 'include',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`Media request failed with status ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  private getAuthToken(): string | undefined {
    const userToken = localStorage.getItem('auth_token');
    return userToken ?? undefined;
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

  private isAuthError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('status 401') ||
      message.includes('status 403') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('forbidden')
    );
  }
}
