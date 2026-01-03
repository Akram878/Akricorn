import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
export interface PublicLearningPath {
  id: number;
  title: string;
  description: string;
  price: number;
  finalPrice?: number | null;
  discount?: number | null;
  isOwned?: boolean;
  rating?: number | null;
  ratingCount?: number | null;
  coursesCount: number;
  completedCourses: number;
  completionPercent: number;
  completedAt?: string | null;
  courses: LearningPathCourseSummary[];
}

export interface LearningPathCourseSummary {
  courseId: number;
  stepOrder: number;
  title: string;
  description: string;
  price: number;
  category?: string | null;
  hours?: number | null;
  rating?: number | null;
  thumbnailUrl?: string | null;
  isCompleted: boolean;
  isOwned?: boolean;
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

  purchasePath(pathId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/learning-paths/${pathId}/purchase`, {});
  }

  ratePath(
    pathId: number,
    rating: number
  ): Observable<{ averageRating: number; ratingCount: number }> {
    return this.http.post<{ averageRating: number; ratingCount: number }>(
      `${API_BASE_URL}/api/ratings/path/${pathId}`,
      { rating }
    );
  }
}
