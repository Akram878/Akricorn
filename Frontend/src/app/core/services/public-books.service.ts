import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicBook {
  id: number;
  title: string;
  description: string;
  price: number;
}

export interface MyBook {
  id: number;
  title: string;
  description: string;
  price: number;
  fileUrl: string;
  grantedAt: string | null;
  isFromCourse: boolean | null;
}

@Injectable({
  providedIn: 'root',
})
export class PublicBooksService {
  private readonly baseUrl = 'https://localhost:7150/api/lms'; // عدّل البورت لو مختلف

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
}
