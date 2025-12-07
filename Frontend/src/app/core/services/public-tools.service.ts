import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicTool {
  id: number;
  name: string;
  description: string;
  // أضف الحقول اللي عندك في الـ Model لاحقاً
}

@Injectable({
  providedIn: 'root',
})
export class PublicToolsService {
  private readonly baseUrl = 'https://localhost:7150/api/lms';

  constructor(private http: HttpClient) {}

  getTools(): Observable<PublicTool[]> {
    return this.http.get<PublicTool[]>(`${this.baseUrl}/tools`);
  }
}
