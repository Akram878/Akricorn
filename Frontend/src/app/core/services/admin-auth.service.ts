import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';

import { getTokenExpiry, isTokenExpired } from '../utils/auth-token';

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
  private readonly tokenStorageKey = 'adminToken';

  private _isLoggedIn$ = new BehaviorSubject<boolean>(this.hasValidToken());
  isLoggedIn$ = this._isLoggedIn$.asObservable();
  private expiryTimeoutId?: ReturnType<typeof setTimeout>;
  private logoutInProgress = false;
  constructor(private http: HttpClient, private router: Router) {
    const token = this.getToken();
    if (token && !isTokenExpired(token)) {
      this.scheduleExpiry(token);
    }
  }

  login(username: string, password: string): Observable<AdminLoginResponse> {
    const body: AdminLoginRequest = { username, password };

    return this.http.post<AdminLoginResponse>(`${this.apiUrl}/login`, body).pipe(
      tap((response) => {
        this.setToken(response.token);
        this._isLoggedIn$.next(this.hasValidToken());
      })
    );
  }

  logout(): void {
    if (this.logoutInProgress) {
      return;
    }

    this.logoutInProgress = true;
    localStorage.removeItem(this.tokenStorageKey);
    this.clearExpiryTimer();
    this._isLoggedIn$.next(false);
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/dashboard/login')) {
      this.router.navigate(['/dashboard/login']);
    }

    setTimeout(() => {
      this.logoutInProgress = false;
    }, 0);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  getAccessToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    if (isTokenExpired(token)) {
      this.logout();
      return null;
    }

    return token;
  }

  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenStorageKey, token);
    this.scheduleExpiry(token);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.tokenStorageKey);
    if (!token) {
      return false;
    }

    return !isTokenExpired(token);
  }

  private scheduleExpiry(token: string): void {
    this.clearExpiryTimer();
    const expiresAt = getTokenExpiry(token);
    if (!expiresAt) {
      return;
    }

    const timeoutMs = Math.max(0, expiresAt - Date.now());
    this.expiryTimeoutId = setTimeout(() => {
      this.logout();
    }, timeoutMs);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimeoutId) {
      clearTimeout(this.expiryTimeoutId);
      this.expiryTimeoutId = undefined;
    }
  }
}
