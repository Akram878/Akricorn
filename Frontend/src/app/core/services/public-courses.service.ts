import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// الكورسات العامة لصفحة /lms/courses
export interface PublicCourse {
  id: number;
  title: string;
  description: string;
  price: number;

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
  purchasedAt?: string;

  // 🆕 حقول إضافية مستخدمة في my-courses.html
  category?: string; // Beginner / Intermediate / Advanced / ... (اختياري)
  hours?: number; // عدد الساعات (اختياري)
  pathTitle?: string | null; // اسم الـ learning path إن وجد (اختياري)
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
  private baseUrl = 'https://localhost:7150/api/lms';

  // Endpoint للدفع الافتراضي
  private paymentsBaseUrl = 'https://localhost:7150/api/payments';

  constructor(private http: HttpClient) {}

  // جلب قائمة الكورسات العامة
  getCourses(): Observable<PublicCourse[]> {
    return this.http.get<PublicCourse[]>(`${this.baseUrl}/courses`);
  }

  // شراء كورس (الآن عبر نظام المدفوعات)
  purchaseCourse(courseId: number): Observable<CoursePaymentResponse> {
    return this.http.post<CoursePaymentResponse>(`${this.paymentsBaseUrl}/course/${courseId}`, {});
  }

  // كورسات المستخدم (My Courses)
  getMyCourses(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>(`${this.baseUrl}/my-courses`);
  }
}
