import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';
import { API_BASE_URL } from '../config/api.config';
export interface AdminToolDto {
  id: number;
  name: string;
  description: string;
  url: string;
  category?: string;
  isActive: boolean;
  displayOrder?: number;
  avatarUrl?: string | null;
  files?: ToolFileDto[];
}

export interface CreateToolRequest {
  name: string;
  description: string;
  url: string;

  isActive: boolean;
  category?: string;
  displayOrder?: number;
  avatarUrl?: string;
}

export interface UpdateToolRequest extends CreateToolRequest {}

export interface ToolFileDto {
  id?: number;
  fileName: string;
  fileUrl: string;
  sizeBytes: number;
  contentType: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminToolsService {
  private apiUrl = `${API_BASE_URL}/api/admin/tools`;

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

  uploadAvatar(toolId: number, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.apiUrl}/${toolId}/upload-avatar`, formData, {
      headers: this.getAuthHeaders(),
    });
  }

  uploadFile(
    toolId: number,
    file: File
  ): Observable<{ message: string; fileId: number; url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ message: string; fileId: number; url: string }>(
      `${this.apiUrl}/${toolId}/files/upload`,
      formData,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  deleteFile(fileId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/files/${fileId}`, {
      headers: this.getAuthHeaders(),
    });
  }
}
