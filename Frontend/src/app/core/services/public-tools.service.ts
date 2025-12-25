import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
export interface PublicTool {
  id: number;
  name: string;
  description: string;
  url: string;
  category: string;
  displayOrder: number;
}

@Injectable({
  providedIn: 'root',
})
export class PublicToolsService {
  private readonly baseUrl = `${API_BASE_URL}/api/lms`;

  constructor(private http: HttpClient) {}

  getTools(): Observable<PublicTool[]> {
    return this.http.get<PublicTool[]>(`${this.baseUrl}/tools`);
  }
}
