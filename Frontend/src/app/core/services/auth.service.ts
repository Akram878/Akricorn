import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { UserStoreService } from './user-store.service';
import { API_BASE_URL } from '../config/api.config';
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

  // ✅ هنا التعديل المهم
  currentUser$!: Observable<User | null>;
  isLoggedIn$!: Observable<boolean>;

  constructor(private http: HttpClient, private userStore: UserStoreService) {
    this.currentUser$ = this.userStore.currentUser$;
    this.isLoggedIn$ = this.userStore.isLoggedIn$;
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
          localStorage.setItem('auth_token', token);
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
          localStorage.setItem('auth_token', token);
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
        this.logout();
      })
    );
  }

  // ============================
  //           Logout
  // ============================

  logout(): void {
    localStorage.removeItem('auth_token');
    this.userStore.setGuest();
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
}
