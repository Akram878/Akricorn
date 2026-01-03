import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';

import { AuthService } from './auth.service';

interface AdminLoginRequest {
  Username: string;
  Password: string;
}

interface AdminLoginResponse {
  token?: string;
  username?: string;
  role?: string;
  Token?: string;
  Username?: string;
  Role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  // Adjust the URL if your backend is on a different port
  private apiUrl = `${API_BASE_URL}/api/admin`;
  isLoggedIn$: Observable<boolean>;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.isLoggedIn$ = this.authService.adminIsAuthenticated$;
  }

  login(username: string, password: string): Observable<AdminLoginResponse> {
    const body: AdminLoginRequest = { Username: username, Password: password };

    return this.http.post<AdminLoginResponse>(`${this.apiUrl}/login`, body).pipe(
      tap((response) => {
        const token = response.token ?? (response as any).Token;
        if (token) {
          this.authService.loginAdmin(token);
        }
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

  restoreAdminSession(): Observable<void> {
    return this.authService.restoreAdminSession();
  }
}
