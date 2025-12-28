import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
// الكورسات العامة لصفحة /lms/courses
export interface PublicCourse {
  id: number;
  title: string;
  description: string;

  price: number;
  discount?: number;
  finalPrice?: number;
  thumbnailUrl?: string | null;
  createdAt?: string;
  // الحقول الإضافية (اختيارية حالياً)
  hours?: number; // عدد الساعات
  category?: string; // Beginner / Intermediate / ...
  rating?: number; // من 0 إلى 5
  pathTitle?: string | null; // اسم الـ Path إن وجد
}

// الكورسات التي يملكها المستخدم (My Courses)
export interface MyCourse {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnailUrl?: string | null;
  purchasedAt?: string;

  completedAt?: string | null;

  // 🆕 حقول إضافية مستخدمة في my-courses.html
  category?: string; // Beginner / Intermediate / Advanced / ... (اختياري)
  hours?: number; // عدد الساعات (اختياري)
  pathTitle?: string | null; // اسم الـ learning path إن وجد (اختياري)
}

export interface CourseLessonFile {
  id: number;
  name: string;
  url: string;
  uploadedAt?: string;
}

export interface CourseLessonView {
  id: number;
  title: string;
  order: number;
  files: CourseLessonFile[];
}

export interface CourseSectionView {
  id: number;
  title: string;
  order: number;
  lessons: CourseLessonView[];
}

export interface CourseLearningPathProgress {
  learningPathId: number;
  learningPathTitle: string;
  totalCourses: number;
  completedCourses: number;
  completionPercent: number;
}

export interface MyCourseDetail extends MyCourse {
  rating?: number;
  sections: CourseSectionView[];
  learningPaths: CourseLearningPathProgress[];
}

export interface CourseCompletionResponse {
  message: string;
  completedAt?: string;
  learningPaths: CourseLearningPathProgress[];
}
// رد الـ API عند شراء كورس عبر نظام الدفع
export interface CoursePaymentResponse {
  message: string;
  paymentId: number;
  courseId: number;
  courseTitle: string;
  amount: number;
  currency: string;
  provider: string;
}

@Injectable({
  providedIn: 'root',
})
export class PublicCoursesService {
  // Endpoint الـ LMS الأساسي
  private baseUrl = `${API_BASE_URL}/api/lms`;
  private coursesBaseUrl = `${API_BASE_URL}/api/courses`;
  // Endpoint للدفع الافتراضي
  private paymentsBaseUrl = `${API_BASE_URL}/api/payments`;

  constructor(private http: HttpClient) {}

  // جلب قائمة الكورسات العامة
  getCourses(): Observable<PublicCourse[]> {
    return this.http.get<PublicCourse[]>(`${this.coursesBaseUrl}`);
  }

  // Latest featured courses (published only)
  getFeaturedCourses(): Observable<PublicCourse[]> {
    return this.http.get<PublicCourse[]>(`${this.coursesBaseUrl}/featured`);
  }

  // شراء كورس (الآن عبر نظام المدفوعات)
  purchaseCourse(courseId: number): Observable<CoursePaymentResponse> {
    return this.http.post<CoursePaymentResponse>(`${this.paymentsBaseUrl}/course/${courseId}`, {});
  }

  // كورسات المستخدم (My Courses)
  getMyCourses(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>(`${this.baseUrl}/my-courses`);
  }

  // تفاصيل كورس مملوك مع المحتوى والملفات
  getMyCourse(courseId: number): Observable<MyCourseDetail> {
    return this.http.get<MyCourseDetail>(`${this.baseUrl}/my-courses/${courseId}`);
  }

  // إنهاء كورس وتحديث تقدّم المسارات
  completeMyCourse(courseId: number): Observable<CourseCompletionResponse> {
    return this.http.post<CourseCompletionResponse>(
      `${this.baseUrl}/my-courses/${courseId}/complete`,
      {}
    );
  }
}
