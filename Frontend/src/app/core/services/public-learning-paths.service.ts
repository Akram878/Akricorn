import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly baseUrl = 'https://localhost:7150/api/lms';

  constructor(private http: HttpClient) {}

  getPaths(): Observable<PublicLearningPath[]> {
    return this.http.get<PublicLearningPath[]>(`${this.baseUrl}/paths`);
  }
}
