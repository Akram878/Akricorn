import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
// Public courses for the /lms/courses page
export interface PublicCourse {
  id: number;
  title: string;
  description: string;

  price: number;
  discount?: number;
  finalPrice?: number;
  thumbnailUrl?: string | null;
  createdAt?: string;
  // Additional fields (optional for now)
  hours?: number; // Number of hours
  category?: string; // Beginner / Intermediate / ...
  rating?: number; // From 0 to 5
  ratingCount?: number;
  pathTitle?: string | null; // Path name if available
}

// Courses the user owns (My Courses)
export interface MyCourse {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnailUrl?: string | null;
  purchasedAt?: string;

  completedAt?: string | null;

  // 🆕 Additional fields used in my-courses.html
  category?: string; // Beginner / Intermediate / Advanced / ... (optional)
  hours?: number; // Number of hours (optional)
  pathTitle?: string | null; // Learning path name if available (optional)
  rating?: number;
  ratingCount?: number;
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
  isCompleted?: boolean;
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
  ratingCount?: number;
  userRating?: number | null;
  sections: CourseSectionView[];
  learningPaths: CourseLearningPathProgress[];
}

export interface CourseCompletionResponse {
  message: string;
  completedAt?: string;
  learningPaths: CourseLearningPathProgress[];
}

export interface LessonCompletionResponse {
  message: string;
  courseCompleted: boolean;
}

export interface CourseRatingResponse {
  message: string;
  averageRating: number;
  ratingCount: number;
}
// API response when purchasing a course via the payment system
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
  // Main LMS endpoint
  private baseUrl = `${API_BASE_URL}/api/lms`;
  private coursesBaseUrl = `${API_BASE_URL}/api/courses`;
  // Endpoint for the mock payment
  private paymentsBaseUrl = `${API_BASE_URL}/api/payments`;

  constructor(private http: HttpClient) {}

  // Fetch the list of public courses
  getCourses(): Observable<PublicCourse[]> {
    return this.http.get<PublicCourse[]>(`${this.coursesBaseUrl}`);
  }

  // Latest featured courses (published only)
  getFeaturedCourses(): Observable<PublicCourse[]> {
    return this.http.get<PublicCourse[]>(`${this.coursesBaseUrl}/featured`);
  }

  // Purchase a course (now via the payments system)
  purchaseCourse(courseId: number): Observable<CoursePaymentResponse> {
    return this.http.post<CoursePaymentResponse>(`${this.paymentsBaseUrl}/course/${courseId}`, {});
  }

  // User courses (My Courses)
  getMyCourses(): Observable<MyCourse[]> {
    return this.http.get<MyCourse[]>(`${this.baseUrl}/my-courses`);
  }

  // Owned course details with content and files
  getMyCourse(courseId: number): Observable<MyCourseDetail> {
    return this.http.get<MyCourseDetail>(`${this.baseUrl}/my-courses/${courseId}`);
  }

  // Complete a course and update path progress
  completeMyCourse(courseId: number): Observable<CourseCompletionResponse> {
    return this.http.post<CourseCompletionResponse>(
      `${this.baseUrl}/my-courses/${courseId}/complete`,
      {}
    );
  }

  completeLesson(courseId: number, lessonId: number): Observable<LessonCompletionResponse> {
    return this.http.post<LessonCompletionResponse>(
      `${this.baseUrl}/my-courses/${courseId}/lessons/${lessonId}/complete`,
      {}
    );
  }
  rateCourse(courseId: number, rating: number, comment?: string): Observable<CourseRatingResponse> {
    return this.http.post<CourseRatingResponse>(`${API_BASE_URL}/api/ratings/course/${courseId}`, {
      rating,
      comment,
    });
  }
}
