import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly baseUrl = 'https://localhost:7150/api/lms'; // عدّل البورت لو مختلف

  constructor(private http: HttpClient) {}

  getTools(): Observable<PublicTool[]> {
    return this.http.get<PublicTool[]>(`${this.baseUrl}/tools`);
  }
}
