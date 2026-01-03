import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, defer, map, of, shareReplay, tap } from 'rxjs';
import { UserStoreService } from './user-store.service';
import { API_BASE_URL } from '../config/api.config';

// ============================
//       Data interfaces
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

  password?: string; // To be used for signup only (we will not receive it from the back end)
  confirmPassword?: string;
  acceptedPolicy?: boolean;
  isGuest?: boolean;

  canEditBirthDate?: boolean;
}

// Auth response from the back end (user + token)
export interface AuthResponse {
  user: User;
  token: string;
}

// Request to update personal information
export interface UpdateProfileRequest {
  name: string;
  family: string;
  city: string;
  birthDate: string;
  currentPassword: string;
}

// Request for account settings
export interface UpdateAccountSettingsRequest {
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
  private readonly adminTokenStorageKey = 'adminToken';
  // ✅ Important change here
  currentUser$!: Observable<User | null>;
  isLoggedIn$!: Observable<boolean>;

  private authStateSubject: BehaviorSubject<AuthState>;
  authState$: Observable<AuthState>;
  isAuthenticated$: Observable<boolean>;

  private adminAuthStateSubject: BehaviorSubject<AuthState>;
  adminAuthState$: Observable<AuthState>;
  adminIsAuthenticated$: Observable<boolean>;

  private logoutInProgress = false;
  private expiryTimeoutId?: ReturnType<typeof setTimeout>;
  private adminLogoutInProgress = false;
  private adminExpiryTimeoutId?: ReturnType<typeof setTimeout>;
  private adminSessionRestored = false;
  private adminSessionRestore$?: Observable<void>;

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

    this.adminAuthStateSubject = new BehaviorSubject<AuthState>(this.buildAuthState(null));
    this.adminAuthState$ = this.adminAuthStateSubject.asObservable();
    this.adminIsAuthenticated$ = this.adminAuthState$.pipe(map((state) => state.isAuthenticated));

    if (initialState.isAuthenticated && initialState.expiresAt) {
      this.scheduleExpiry(initialState.expiresAt, 'user');
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

        // Store the user
        this.userStore.setUser(
          {
            ...userFromApi,
            isGuest: false,
          },
          true
        );

        // Store the token
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

  deleteAccount(currentPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/delete`, { currentPassword }).pipe(
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
    this.clearExpiryTimer('user');
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

  getAdminAccessToken(): string | null {
    const token = this.adminAuthStateSubject.value.token;
    if (!token) {
      return null;
    }

    return token;
  }

  restoreAdminSession(): Observable<void> {
    if (this.adminSessionRestore$) {
      return this.adminSessionRestore$;
    }

    this.adminSessionRestore$ = defer(() => {
      if (!this.adminSessionRestored) {
        this.adminSessionRestored = true;
        const storedAdminToken = this.getStoredAdminToken();
        const nextState = this.buildAuthState(storedAdminToken);
        this.adminAuthStateSubject.next(nextState);

        if (nextState.isAuthenticated && nextState.expiresAt) {
          this.scheduleExpiry(nextState.expiresAt, 'admin');
        } else {
          this.clearExpiryTimer('admin');
        }

        if (!nextState.isAuthenticated && storedAdminToken) {
          this.clearStoredAdminToken();
        }
      }

      return of(undefined);
    }).pipe(shareReplay({ bufferSize: 1, refCount: false }));

    return this.adminSessionRestore$;
  }

  private setToken(token: string): void {
    const nextState = this.buildAuthState(token);
    this.storeToken(token);
    this.authStateSubject.next(nextState);

    if (nextState.isAuthenticated && nextState.expiresAt) {
      this.scheduleExpiry(nextState.expiresAt, 'user');
    } else {
      this.clearExpiryTimer('user');
    }
  }

  private setAdminToken(token: string): void {
    const nextState = this.buildAuthState(token);
    this.storeAdminToken(token);
    this.adminAuthStateSubject.next(nextState);

    if (nextState.isAuthenticated && nextState.expiresAt) {
      this.scheduleExpiry(nextState.expiresAt, 'admin');
    } else {
      this.clearExpiryTimer('admin');
    }
  }

  private scheduleExpiry(expiresAt: number, scope: 'user' | 'admin'): void {
    this.clearExpiryTimer(scope);

    const timeoutMs = Math.max(0, expiresAt - Date.now());
    if (scope === 'user') {
      this.expiryTimeoutId = setTimeout(() => {
        this.handleAuthFailure();
      }, timeoutMs);
    } else {
      this.adminExpiryTimeoutId = setTimeout(() => {
        this.handleAdminAuthFailure();
      }, timeoutMs);
    }
  }

  private clearExpiryTimer(scope: 'user' | 'admin'): void {
    if (scope === 'user' && this.expiryTimeoutId) {
      clearTimeout(this.expiryTimeoutId);
      this.expiryTimeoutId = undefined;
    }
    if (scope === 'admin' && this.adminExpiryTimeoutId) {
      clearTimeout(this.adminExpiryTimeoutId);
      this.adminExpiryTimeoutId = undefined;
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
    if (!expiresAt) {
      return {
        token,
        expiresAt: null,
        isAuthenticated: true,
        isExpired: false,
      };
    }

    const expired = Date.now() >= expiresAt;

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

  private storeAdminToken(token: string): void {
    localStorage.setItem(this.adminTokenStorageKey, token);
  }

  private getStoredAdminToken(): string | null {
    return localStorage.getItem(this.adminTokenStorageKey);
  }

  private clearStoredAdminToken(): void {
    localStorage.removeItem(this.adminTokenStorageKey);
  }

  isAdminAuthenticated(): boolean {
    return this.adminAuthStateSubject.value.isAuthenticated;
  }

  handleAdminAuthFailure(): void {
    if (this.adminAuthStateSubject.value.isAuthenticated) {
      this.logoutAdmin({ redirectToLogin: true });
    }
  }

  loginAdmin(token: string): void {
    if (token) {
      this.setAdminToken(token);
    }
  }

  logoutAdmin(options?: { redirectToLogin?: boolean }): void {
    if (this.adminLogoutInProgress) {
      return;
    }

    this.adminLogoutInProgress = true;
    this.clearStoredAdminToken();
    this.clearExpiryTimer('admin');
    this.adminAuthStateSubject.next({
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      isExpired: false,
    });

    if (options?.redirectToLogin) {
      const currentUrl = this.router.url;
      const isAuthRoute = currentUrl.startsWith('/dashboard/login');
      if (!isAuthRoute) {
        this.router.navigate(['/dashboard/login']);
      }
    }

    setTimeout(() => {
      this.adminLogoutInProgress = false;
    }, 0);
  }
}

export interface AuthState {
  token: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  isExpired: boolean;
}

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

const decodePayload = (token: string): JwtPayload | null => {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

const getTokenExpiry = (token: string): number | null => {
  const payload = decodePayload(token);
  if (!payload?.exp) {
    return null;
  }

  return payload.exp * 1000;
};

const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) {
    return false;
  }
  return Date.now() >= expiry;
};
