import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface LmsStats {
  activeCourses: number;
  activeLearningPaths: number;
  activeBooks: number;
}

@Injectable({
  providedIn: 'root',
})
export class LmsStatsService {
  private readonly baseUrl = `${API_BASE_URL}/api/lms`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<LmsStats> {
    return this.http.get<LmsStats>(`${this.baseUrl}/stats`);
  }
}
