import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
export interface AdminLearningPathDto {
  id: number;
  title: string;
  description: string;
  isActive: boolean;

  thumbnailUrl?: string;
  courseIds: number[];
  price?: number;
  discount?: number;
  rating?: number;
  ratingCount?: number;
}

export interface CreateLearningPathRequest {
  title: string;
  description: string;
  isActive: boolean;

  thumbnailUrl?: string;
  courseIds: number[];
}

export interface UpdateLearningPathRequest extends CreateLearningPathRequest {}

@Injectable({
  providedIn: 'root',
})
export class AdminPathsService {
  private apiUrl = `${API_BASE_URL}/api/admin/paths`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AdminLearningPathDto[]> {
    return this.http.get<AdminLearningPathDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<AdminLearningPathDto> {
    return this.http.get<AdminLearningPathDto>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateLearningPathRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  update(id: number, data: UpdateLearningPathRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {});
  }
}
