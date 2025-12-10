import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

export interface AdminLearningPathDto {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
  courseIds: number[];
}

export interface CreateLearningPathRequest {
  title: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
  courseIds: number[];
}

export interface UpdateLearningPathRequest extends CreateLearningPathRequest {}

@Injectable({
  providedIn: 'root',
})
export class AdminPathsService {
  private apiUrl = 'https://localhost:7150/api/admin/paths';

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getAll(): Observable<AdminLearningPathDto[]> {
    return this.http.get<AdminLearningPathDto[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  getById(id: number): Observable<AdminLearningPathDto> {
    return this.http.get<AdminLearningPathDto>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  create(data: CreateLearningPathRequest): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: this.getAuthHeaders(),
    });
  }

  update(id: number, data: UpdateLearningPathRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
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
}
