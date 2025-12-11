import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

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
  private apiUrl = 'https://localhost:7150/api/admin/courses';

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getAll(): Observable<AdminCourseDto[]> {
    return this.http.get<AdminCourseDto[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  getById(id: number): Observable<AdminCourseDto> {
    return this.http.get<AdminCourseDto>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  create(body: CreateCourseRequest): Observable<any> {
    return this.http.post(this.apiUrl, body, {
      headers: this.getAuthHeaders(),
    });
  }

  update(id: number, body: CreateCourseRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, body, {
      headers: this.getAuthHeaders(),
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {}, { headers: this.getAuthHeaders() });
  }

  /**
   * Upload course thumbnail (image file)
   * Backend endpoint: POST /api/admin/courses/upload-thumbnail
   * Expects multipart/form-data with field name "file"
   */
  uploadThumbnail(courseId: number, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file); // MUST be "file" to match IFormFile file

    return this.http.post<{ url: string }>(
      `${this.apiUrl}/${courseId}/upload-thumbnail`,
      formData,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }
}
