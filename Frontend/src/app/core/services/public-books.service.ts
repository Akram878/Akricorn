import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
export interface PublicBook {
  id: number;
  title: string;
  description: string;
  price: number;
  category?: string | null;
  thumbnailUrl?: string | null;
  rating?: number | null;
}

export interface MyBook {
  id: number;
  title: string;
  description: string;
  price: number;
  category?: string | null;
  thumbnailUrl?: string | null;
  downloadUrl?: string;
  fileUrl?: string;
  rating?: number | null;
  ratingCount?: number | null;
  grantedAt: string | null;
  isFromCourse: boolean | null;
}

export interface BookRatingResponse {
  message: string;
  averageRating: number;
  ratingCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class PublicBooksService {
  private readonly baseUrl = `${API_BASE_URL}/api/lms`;

  constructor(private http: HttpClient) {}

  // الكتب العامة (اللايبرري) — متاحة للجميع
  getBooks(): Observable<PublicBook[]> {
    return this.http.get<PublicBook[]>(`${this.baseUrl}/books`);
  }

  // الكتب التي يملكها المستخدم
  getMyBooks(): Observable<MyBook[]> {
    return this.http.get<MyBook[]>(`${this.baseUrl}/my-books`);
  }

  // شراء كتاب واحد
  purchaseBook(bookId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/books/${bookId}/purchase`, {});
  }

  rateBook(bookId: number, rating: number, comment?: string): Observable<BookRatingResponse> {
    return this.http.post<BookRatingResponse>(`${API_BASE_URL}/api/ratings/book/${bookId}`, {
      rating,
      comment,
    });
  }
}
