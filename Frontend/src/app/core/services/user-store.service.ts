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
    // Auto-load from localStorage at app start
    const storedUserJson = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUserJson) {
      try {
        const user: User = JSON.parse(storedUserJson);
        // If a user exists in storage ⇒ treat as logged in
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

  // Set the current user
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

  // Switch to guest mode
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

  // Retrieve the current user synchronously (use cautiously)
  getUser(): User {
    return (
      this.currentUserSubject.value ?? {
        isGuest: true,
        guestId: this.generateGuestId(),
      }
    );
  }

  // Generate a simple guestId
  private generateGuestId(): string {
    return 'guest-' + Math.random().toString(36).substring(2, 11);
  }
}
