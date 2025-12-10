import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private baseUrl = 'https://localhost:7150/api/payments';

  constructor(private http: HttpClient) {}

  getMyPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.baseUrl}/my`);
  }
}
