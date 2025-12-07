import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

export interface AdminCourseDto {
  id: number;
  title: string;
  category: string;
  price: number;
  hours: number;
  thumbnailUrl: string;
  description: string;
  isActive: boolean;
  bookIds: number[];
  learningPathId: number | null;
}

export interface CreateCourseRequest {
  title: string;
  category: string;
  price: number;
  hours: number;
  thumbnailUrl: string;
  description: string;
  isActive: boolean;
  bookIds: number[];
  learningPathId: number | null;
}

export interface UpdateCourseRequest extends CreateCourseRequest {}

@Injectable({
  providedIn: 'root',
})
export class AdminCoursesService {
  private apiUrl = 'https://localhost:7150/api/admin/courses'; // عدّل البورت لو مختلف

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getAll(): Observable<AdminCourseDto[]> {
    return this.http.get<AdminCourseDto[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {}, { headers: this.getAuthHeaders() });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  create(data: CreateCourseRequest): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: this.getAuthHeaders(),
    });
  }

  update(id: number, data: UpdateCourseRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: this.getAuthHeaders(),
    });
  }
}
