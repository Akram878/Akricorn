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
  purchasedAt: string;

  hours?: number;
  category?: string;
  pathTitle?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PublicCoursesService {
  private readonly baseUrl = 'https://localhost:7150/api/lms';

  constructor(private http: HttpClient) {}

  // الكورسات المتاحة للجميع
  getCourses(): Observable<PublicCourse[]> {
    return this.http.get<PublicCourse[]>(`${this.baseUrl}/courses`);
  }

  // شراء كورس
  purchaseCourse(courseId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/courses/${courseId}/purchase`, {});
  }

  // كورسات المستخدم
  getMyCourses(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>(`${this.baseUrl}/my-courses`);
  }
}
