import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// تعريف نوع المستخدم هنا
export interface User {
  name?: string;
  family?: string;
  countryCode?: string;
  number?: string;
  email: string;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://localhost:7150/api/auth';
  private currentUser: User | null = null;

  constructor(private http: HttpClient) {}

  signup(user: User): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/signup`, user);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password });
  }

  setUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): User | null {
    if (this.currentUser) return this.currentUser;

    const saved = localStorage.getItem('user');
    this.currentUser = saved ? JSON.parse(saved) : null;
    return this.currentUser;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('user');
  }
}
