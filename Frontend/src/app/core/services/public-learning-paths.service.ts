import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
export interface PublicLearningPath {
  id: number;
  title: string;
  description: string;
  coursesCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class PublicLearningPathsService {
  private readonly baseUrl = `${API_BASE_URL}/api/lms`;

  constructor(private http: HttpClient) {}

  getPaths(): Observable<PublicLearningPath[]> {
    return this.http.get<PublicLearningPath[]>(`${this.baseUrl}/paths`);
  }
}
