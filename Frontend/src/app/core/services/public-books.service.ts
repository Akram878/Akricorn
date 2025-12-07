import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicBook {
  id: number;
  title: string;
  description: string;
  price: number;
  fileUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class PublicBooksService {
  private readonly baseUrl = 'https://localhost:7150/api/lms';

  constructor(private http: HttpClient) {}

  getBooks(): Observable<PublicBook[]> {
    return this.http.get<PublicBook[]>(`${this.baseUrl}/books`);
  }

  // لو حبيت لاحقاً تجيب كتاب واحد بالتفصيل:
  // getBook(id: number): Observable<PublicBook> {
  //   return this.http.get<PublicBook>(`${this.baseUrl}/books/${id}`);
  // }
}
