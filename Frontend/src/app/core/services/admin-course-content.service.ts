import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
export interface LessonFileDto {
  id: number;
  name: string;
  downloadUrl: string;
  fileName?: string;
  fileUrl?: string;
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
  private baseUrl = `${API_BASE_URL}/api/admin/course-content`;

  constructor(private http: HttpClient) {}

  // =============================================
  // GET COURSE CONTENT
  // =============================================
  getCourseContent(courseId: number): Observable<CourseContentDto> {
    return this.http.get<CourseContentDto>(`${this.baseUrl}/${courseId}`);
  }

  // =============================================
  // SECTIONS
  // =============================================
  createSection(
    courseId: number,
    body: { title: string; order: number; forceInsert?: boolean }
  ): Observable<CourseContentResponse> {
    return this.http.post<CourseContentResponse>(`${this.baseUrl}/${courseId}/sections`, body);
  }

  updateSection(
    sectionId: number,
    body: { title: string; order: number }
  ): Observable<CourseContentResponse> {
    return this.http.put<CourseContentResponse>(`${this.baseUrl}/sections/${sectionId}`, body);
  }

  deleteSection(sectionId: number): Observable<CourseContentResponse> {
    return this.http.delete<CourseContentResponse>(`${this.baseUrl}/sections/${sectionId}`);
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
      body
    );
  }

  updateLesson(
    lessonId: number,
    body: { title: string; order: number }
  ): Observable<CourseContentResponse> {
    return this.http.put<CourseContentResponse>(`${this.baseUrl}/lessons/${lessonId}`, body);
  }

  deleteLesson(lessonId: number): Observable<CourseContentResponse> {
    return this.http.delete<CourseContentResponse>(`${this.baseUrl}/lessons/${lessonId}`);
  }

  // =============================================
  // FILES
  // =============================================
  uploadLessonFile(lessonId: number, file: File): Observable<CourseContentResponse> {
    const form = new FormData();
    form.append('file', file);

    return this.http.post<CourseContentResponse>(
      `${this.baseUrl}/lessons/${lessonId}/upload`,
      form
    );
  }

  deleteLessonFile(fileId: number): Observable<CourseContentResponse> {
    return this.http.delete<CourseContentResponse>(`${this.baseUrl}/files/${fileId}`);
  }
}
