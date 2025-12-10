import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

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
  getCourseContent(courseId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${courseId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // =============================================
  // SECTIONS
  // =============================================
  createSection(courseId: number, body: { title: string; order: number }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${courseId}/sections`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  updateSection(sectionId: number, body: { title?: string; order?: number }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/sections/${sectionId}`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteSection(sectionId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/sections/${sectionId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // =============================================
  // LESSONS
  // =============================================
  createLesson(sectionId: number, body: { title: string; order: number }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sections/${sectionId}/lessons`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteLesson(lessonId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/lessons/${lessonId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // =============================================
  // FILES
  // =============================================
  uploadLessonFile(lessonId: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post<any>(`${this.baseUrl}/lessons/${lessonId}/upload`, form, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteLessonFile(fileId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/files/${fileId}`, {
      headers: this.getAuthHeaders(),
    });
  }
}
