import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { UserStoreService } from './user-store.service';
import { API_BASE_URL } from '../config/api.config';
import { getTokenExpiry, isTokenExpired } from '../utils/auth-token';
// ============================
//       واجهات البيانات
// ============================

export interface User {
  id?: number;
  guestId?: string;

  name?: string;
  family?: string;
  countryCode?: string;
  number?: string;
  email?: string;

  city?: string;
  birthDate?: string;

  password?: string; // لاستعماله في التسجيل فقط (لن نستقبله من الباك إند)
  confirmPassword?: string;
  acceptedPolicy?: boolean;
  isGuest?: boolean;

  canEditBirthDate?: boolean;
}

// استجابة Auth من الباك إند (user + token)
export interface AuthResponse {
  user: User;
  token: string;
}

// طلب تعديل المعلومات الشخصية
export interface UpdateProfileRequest {
  id: number;
  name: string;
  family: string;
  city: string;
  birthDate: string;
  currentPassword: string;
}

// طلب إعدادات الحساب
export interface UpdateAccountSettingsRequest {
  id: number;
  email: string;
  countryCode: string;
  number: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${API_BASE_URL}/api/auth`;
  private readonly tokenStorageKey = 'auth_token';
  // ✅ هنا التعديل المهم
  currentUser$!: Observable<User | null>;
  isLoggedIn$!: Observable<boolean>;

  private authStateSubject: BehaviorSubject<AuthState>;
  authState$: Observable<AuthState>;
  isAuthenticated$: Observable<boolean>;

  private logoutInProgress = false;
  private expiryTimeoutId?: ReturnType<typeof setTimeout>;

  constructor(
    private http: HttpClient,
    private userStore: UserStoreService,
    private router: Router
  ) {
    this.currentUser$ = this.userStore.currentUser$;
    this.isLoggedIn$ = this.userStore.isLoggedIn$;

    const storedToken = this.getStoredToken();
    const initialState = this.buildAuthState(storedToken);

    this.authStateSubject = new BehaviorSubject<AuthState>(initialState);
    this.authState$ = this.authStateSubject.asObservable();
    this.isAuthenticated$ = this.authState$.pipe(map((state) => state.isAuthenticated));

    if (initialState.isAuthenticated && initialState.expiresAt) {
      this.scheduleExpiry(initialState.expiresAt);
    }

    if (!initialState.isAuthenticated && storedToken) {
      this.clearStoredToken();
      this.userStore.setGuest();
      if (initialState.isExpired) {
        this.logout({ redirectToLogin: true });
      }
    }
  }

  // ============================
  //           Login
  // ============================

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response: AuthResponse) => {
        const userFromApi = response.user;
        const token = response.token;

        // تخزين المستخدم
        this.userStore.setUser(
          {
            ...userFromApi,
            isGuest: false,
          },
          true
        );

        // تخزين التوكن
        if (token) {
          this.setToken(token);
        }
      }),
      map((response: AuthResponse) => response.user)
    );
  }

  // ============================
  //           Sign up
  // ============================

  signup(user: User): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, user).pipe(
      tap((response: AuthResponse) => {
        const createdUser = response.user;
        const token = response.token;

        this.userStore.setUser(
          {
            ...createdUser,
            isGuest: false,
          },
          true
        );

        if (token) {
          this.setToken(token);
        }
      }),
      map((response: AuthResponse) => response.user)
    );
  }

  // ============================
  //      Update profile
  // ============================

  updateProfile(payload: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, payload).pipe(
      tap((updated: User) => {
        this.userStore.setUser(
          {
            ...updated,
            isGuest: false,
          },
          true
        );
      })
    );
  }

  // ============================
  //   Update account settings
  // ============================

  updateAccountSettings(payload: UpdateAccountSettingsRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/account`, payload).pipe(
      tap((updated: User) => {
        this.userStore.setUser(
          {
            ...updated,
            isGuest: false,
          },
          true
        );
      })
    );
  }

  // ============================
  //        Delete account
  // ============================

  deleteAccount(userId: number, currentPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { id: userId, currentPassword }).pipe(
      tap(() => {
        this.logout({ redirectToLogin: true });
      })
    );
  }

  // ============================
  //           Logout
  // ============================

  logout(options?: { redirectToLogin?: boolean }): void {
    if (this.logoutInProgress) {
      return;
    }

    this.logoutInProgress = true;
    this.clearStoredToken();
    this.clearExpiryTimer();
    this.authStateSubject.next({
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      isExpired: false,
    });
    this.userStore.setGuest();

    if (options?.redirectToLogin) {
      const currentUrl = this.router.url;
      const isAuthRoute = currentUrl.startsWith('/auth');
      if (!isAuthRoute) {
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: currentUrl },
        });
      }
    }

    setTimeout(() => {
      this.logoutInProgress = false;
    }, 0);
  }

  // ============================
  //      Get current user
  // ============================

  getUser(): User {
    return this.userStore.getUser();
  }

  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  setUser(user: User | null, saveToStorage: boolean = true): void {
    this.userStore.setUser(user ?? null, saveToStorage);
  }

  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  handleAuthFailure(): void {
    if (this.authStateSubject.value.isAuthenticated) {
      this.logout({ redirectToLogin: true });
    }
  }

  getAccessToken(): string | null {
    const token = this.authStateSubject.value.token;
    if (!token) {
      return null;
    }

    if (isTokenExpired(token)) {
      this.handleAuthFailure();
      return null;
    }

    return token;
  }

  private setToken(token: string): void {
    const nextState = this.buildAuthState(token);
    this.storeToken(token);
    this.authStateSubject.next(nextState);

    if (nextState.isAuthenticated && nextState.expiresAt) {
      this.scheduleExpiry(nextState.expiresAt);
    } else {
      this.clearExpiryTimer();
    }
  }

  private scheduleExpiry(expiresAt: number): void {
    this.clearExpiryTimer();

    const timeoutMs = Math.max(0, expiresAt - Date.now());
    this.expiryTimeoutId = setTimeout(() => {
      this.handleAuthFailure();
    }, timeoutMs);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimeoutId) {
      clearTimeout(this.expiryTimeoutId);
      this.expiryTimeoutId = undefined;
    }
  }

  private buildAuthState(token: string | null): AuthState {
    if (!token) {
      return {
        token: null,
        expiresAt: null,
        isAuthenticated: false,
        isExpired: false,
      };
    }

    const expiresAt = getTokenExpiry(token);
    const expired = expiresAt ? Date.now() >= expiresAt : true;

    return {
      token: expired ? null : token,
      expiresAt: expired ? null : expiresAt,
      isAuthenticated: !expired,
      isExpired: expired,
    };
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenStorageKey, token);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  private clearStoredToken(): void {
    localStorage.removeItem(this.tokenStorageKey);
  }
}

export interface AuthState {
  token: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  isExpired: boolean;
}
