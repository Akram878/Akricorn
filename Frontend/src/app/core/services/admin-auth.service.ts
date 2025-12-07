import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface AdminLoginRequest {
  username: string;
  password: string;
}

interface AdminLoginResponse {
  token: string;
  username: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  // عدّل الرابط إذا الباك إند عندك على بورت مختلف
  private apiUrl = 'https://localhost:7150/api/admin';

  private _isLoggedIn$ = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<AdminLoginResponse> {
    const body: AdminLoginRequest = { username, password };

    return this.http.post<AdminLoginResponse>(`${this.apiUrl}/login`, body).pipe(
      tap((response) => {
        this.setToken(response.token);
        this._isLoggedIn$.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('adminToken');
    this._isLoggedIn$.next(false);
    this.router.navigate(['/dashboard/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('adminToken');
  }

  private setToken(token: string): void {
    localStorage.setItem('adminToken', token);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('adminToken');
  }
}
