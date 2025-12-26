import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
export interface AdminBookDto {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  fileUrl: string;
  thumbnailUrl?: string | null;
  isActive: boolean;

  files: BookFileDto[];
}

export interface CreateBookRequest {
  title: string;
  description: string;
  category: string;
  price: number;
  fileUrl: string;
  thumbnailUrl?: string | null;
  isActive: boolean;
}

export interface UpdateBookRequest extends CreateBookRequest {}

export interface BookFileDto {
  id: number;
  fileName: string;
  fileUrl: string;
  sizeBytes: number;
  contentType: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminBooksService {
  private apiUrl = `${API_BASE_URL}/api/admin/books`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AdminBookDto[]> {
    return this.http.get<AdminBookDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<AdminBookDto> {
    return this.http.get<AdminBookDto>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateBookRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  update(id: number, data: UpdateBookRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {});
  }
  uploadThumbnail(bookId: number, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.apiUrl}/${bookId}/upload-thumbnail`, formData);
  }

  uploadFile(bookId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(`${this.apiUrl}/${bookId}/files/upload`, formData);
  }

  deleteFile(fileId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/files/${fileId}`);
  }
}
