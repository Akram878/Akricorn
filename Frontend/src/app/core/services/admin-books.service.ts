import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

export interface AdminBookDto {
  id: number;
  title: string;
  description: string;
  price: number;
  fileUrl: string;
  isActive: boolean;
}

export interface CreateBookRequest {
  title: string;
  description: string;
  price: number;
  fileUrl: string;
  isActive: boolean;
}

export interface UpdateBookRequest extends CreateBookRequest {}

@Injectable({
  providedIn: 'root',
})
export class AdminBooksService {
  private apiUrl = 'https://localhost:7150/api/admin/books'; // غيّر البورت لو الباك إند عندك غير

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getAll(): Observable<AdminBookDto[]> {
    return this.http.get<AdminBookDto[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  create(data: CreateBookRequest): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: this.getAuthHeaders(),
    });
  }

  update(id: number, data: UpdateBookRequest): Observable<any> {
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
