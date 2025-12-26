import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';

import { AuthService } from './auth.service';

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
  private apiUrl = `${API_BASE_URL}/api/admin`;
  isLoggedIn$: Observable<boolean>;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.isLoggedIn$ = this.authService.adminIsAuthenticated$;
  }

  login(username: string, password: string): Observable<AdminLoginResponse> {
    const body: AdminLoginRequest = { username, password };

    return this.http.post<AdminLoginResponse>(`${this.apiUrl}/login`, body).pipe(
      tap((response) => {
        this.authService.loginAdmin(response.token);
      })
    );
  }

  logout(): void {
    this.authService.logoutAdmin({ redirectToLogin: true });
  }

  getAccessToken(): string | null {
    return this.authService.getAdminAccessToken();
  }

  isAuthenticated(): boolean {
    return this.authService.isAdminAuthenticated();
  }
}
