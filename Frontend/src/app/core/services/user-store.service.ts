import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from './auth.service';

const USER_STORAGE_KEY = 'user';

@Injectable({
  providedIn: 'root',
})
export class UserStoreService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();

  constructor() {
    // Auto-load من localStorage عند بدء التطبيق
    const storedUserJson = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUserJson) {
      try {
        const user: User = JSON.parse(storedUserJson);
        // لو عندنا user في التخزين ⇒ اعتبره مسجّل
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(!user.isGuest);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        this.setGuest();
      }
    } else {
      this.setGuest();
    }
  }

  // تعيين المستخدم الحالي
  setUser(user: User | null, saveToStorage: boolean = true): void {
    if (!user) {
      this.setGuest();
      return;
    }

    const normalizedUser: User = {
      ...user,
      isGuest: user.isGuest ?? false,
    };

    this.currentUserSubject.next(normalizedUser);
    this.isLoggedInSubject.next(!normalizedUser.isGuest);

    if (saveToStorage) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    }
  }

  // تحويل الوضع إلى ضيف
  setGuest(): void {
    const guestUser: User = {
      id: undefined,
      guestId: this.generateGuestId(),
      isGuest: true,
      name: 'Guest',
      email: undefined,
    };

    this.currentUserSubject.next(guestUser);
    this.isLoggedInSubject.next(false);

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(guestUser));
  }

  // استرجاع المستخدم الحالي بشكل sync (استعمل بحذر)
  getUser(): User {
    return (
      this.currentUserSubject.value ?? {
        isGuest: true,
        guestId: this.generateGuestId(),
      }
    );
  }

  // توليد guestId بسيط
  private generateGuestId(): string {
    return 'guest-' + Math.random().toString(36).substring(2, 11);
  }
}
