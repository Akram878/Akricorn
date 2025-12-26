import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
export interface AdminCourseDto {
  id: number;
  title: string;
  description: string;
  price: number;
  isActive: boolean;
  hours: number;
  category: string;
  rating: number;
  thumbnailUrl?: string | null;

  pathIds: number[];
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  price: number;
  isActive: boolean;
  hours: number;
  category: string;
  rating: number;
  thumbnailUrl?: string | null;

  pathIds: number[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminCoursesService {
  private apiUrl = `${API_BASE_URL}/api/admin/courses`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AdminCourseDto[]> {
    return this.http.get<AdminCourseDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<AdminCourseDto> {
    return this.http.get<AdminCourseDto>(`${this.apiUrl}/${id}`);
  }

  create(body: CreateCourseRequest): Observable<any> {
    return this.http.post(this.apiUrl, body);
  }

  update(id: number, body: CreateCourseRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {});
  }

  /**
   * Upload course thumbnail (image file)
   * Backend endpoint: POST /api/admin/courses/upload-thumbnail
   * Expects multipart/form-data with field name "file"
   */
  uploadThumbnail(courseId: number, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file); // MUST be "file" to match IFormFile file

    return this.http.post<{ url: string }>(`${this.apiUrl}/${courseId}/upload-thumbnail`, formData);
  }
}
