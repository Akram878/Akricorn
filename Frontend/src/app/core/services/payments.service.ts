import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
export interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  targetType: string;
  targetId: number;
  description: string;
  provider: string;
  externalReference: string;
  createdAt: string;
  completedAt?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private baseUrl = `${API_BASE_URL}/api/payments`;

  constructor(private http: HttpClient) {}

  getMyPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.baseUrl}/my`);
  }
}
