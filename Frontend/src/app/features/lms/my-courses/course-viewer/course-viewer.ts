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
  safeUrl: SafeResourceUrl;
  type: ViewerType;
  lessonTitle: string;
  sectionTitle: string;
}
interface PdfJsLib {
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

    if (type === 'pdf') {
      setTimeout(() => this.renderSelectedPdf());
    } else {
      this.cleanupPdf();
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
      const userToken = localStorage.getItem('auth_token');
      const adminToken = localStorage.getItem('adminToken');
      const tokenToUse = userToken ?? adminToken ?? undefined;

      container.innerHTML = '';

      const pdfBytes = await this.fetchPdfBytes(this.selectedFile.url, tokenToUse);

      this.pdfLoadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      this.pdfDocument = await this.pdfLoadingTask.promise;

      if (!this.pdfDocument) {
        throw new Error('Failed to load PDF document');
      }

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
      this.pdfRenderError = 'تعذر تحميل ملف PDF حالياً. حاول مرة أخرى لاحقاً.';
      container.innerHTML = '';
    } finally {
      this.isRenderingPdf = false;
    }
  }

  private async loadPdfJs(): Promise<PdfJsLib | null> {
    if (this.pdfjsLib) return this.pdfjsLib;
    if (this.pdfjsLibPromise) return this.pdfjsLibPromise;
    this.pdfjsLibPromise = import('pdfjs-dist')
      .then((module: any) => {
        const lib = (module?.default as PdfJsLib) || (module as PdfJsLib | null);
        if (lib?.GlobalWorkerOptions) {
          lib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        }
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

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
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
