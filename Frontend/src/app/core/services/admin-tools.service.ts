import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

export interface AdminToolDto {
  id: number;
  name: string;
  description: string;
  url: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
}

export interface CreateToolRequest {
  name: string;
  description: string;
  url: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
}

export interface UpdateToolRequest extends CreateToolRequest {}

@Injectable({
  providedIn: 'root',
})
export class AdminToolsService {
  private apiUrl = 'https://localhost:7150/api/admin/tools';

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getAll(): Observable<AdminToolDto[]> {
    return this.http.get<AdminToolDto[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  create(data: CreateToolRequest): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: this.getAuthHeaders(),
    });
  }

  update(id: number, data: UpdateToolRequest): Observable<any> {
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
