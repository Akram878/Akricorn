import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

export interface LessonFileDto {
  id: number;
  fileName: string;
  fileUrl: string;
}

export interface LessonDto {
  id: number;
  title: string;
  order: number;
  files: LessonFileDto[];
}

export interface SectionDto {
  id: number;
  title: string;
  order: number;
  lessons: LessonDto[];
}

export interface CourseContentDto {
  courseId: number;
  sections: SectionDto[];
}

export interface CourseContentResponse {
  message?: string;
  id?: number;
  url?: string;
  content: CourseContentDto;
}

@Injectable({
  providedIn: 'root',
})
export class AdminCourseContentService {
  private baseUrl = 'https://localhost:7150/api/admin/course-content';

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  // =============================================
  // GET COURSE CONTENT
  // =============================================
  getCourseContent(courseId: number): Observable<CourseContentDto> {
    return this.http.get<CourseContentDto>(`${this.baseUrl}/${courseId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // =============================================
  // SECTIONS
  // =============================================
  createSection(
    courseId: number,
    body: { title: string; order: number; forceInsert?: boolean }
  ): Observable<CourseContentResponse> {
    return this.http.post<CourseContentResponse>(`${this.baseUrl}/${courseId}/sections`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  updateSection(
    sectionId: number,
    body: { title: string; order: number }
  ): Observable<CourseContentResponse> {
    return this.http.put<CourseContentResponse>(`${this.baseUrl}/sections/${sectionId}`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteSection(sectionId: number): Observable<CourseContentResponse> {
    return this.http.delete<CourseContentResponse>(`${this.baseUrl}/sections/${sectionId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // =============================================
  // LESSONS
  // =============================================
  createLesson(
    sectionId: number,
    body: { title: string; order: number; forceInsert?: boolean }
  ): Observable<CourseContentResponse> {
    return this.http.post<CourseContentResponse>(
      `${this.baseUrl}/sections/${sectionId}/lessons`,
      body,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  updateLesson(
    lessonId: number,
    body: { title: string; order: number }
  ): Observable<CourseContentResponse> {
    return this.http.put<CourseContentResponse>(`${this.baseUrl}/lessons/${lessonId}`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteLesson(lessonId: number): Observable<CourseContentResponse> {
    return this.http.delete<CourseContentResponse>(`${this.baseUrl}/lessons/${lessonId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // =============================================
  // FILES
  // =============================================
  uploadLessonFile(lessonId: number, file: File): Observable<CourseContentResponse> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post<CourseContentResponse>(
      `${this.baseUrl}/lessons/${lessonId}/upload`,
      form,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  deleteLessonFile(fileId: number): Observable<CourseContentResponse> {
    return this.http.delete<CourseContentResponse>(`${this.baseUrl}/files/${fileId}`, {
      headers: this.getAuthHeaders(),
    });
  }
}
