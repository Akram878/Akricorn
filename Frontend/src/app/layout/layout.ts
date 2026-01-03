// 👈 [Change 1: Add OnInit and OnDestroy]
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from '../features/home/profile/profile';
import { SettingSection } from '../features/setting-section/setting-section';

// 👈 [Change 2: Import AuthService]
import { AuthService } from '../core/services/auth.service';

// 👈 [Change 3: Import Subscription]
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-Layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SettingSection, ProfileComponent],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
// 👈 [Change 4: Implement interfaces]
export class Layout implements OnInit, OnDestroy {
  showSettings = false;
  showProfileModal = false; // Floating profile modal
  // 👈 [Change 5: Property to store login/subscription state]
  isLoggedIn: boolean = false;
  private authSubscription!: Subscription;
  // 👈 [Change 6: Inject AuthService]
  constructor(private authService: AuthService) {}
  isMobileNavOpen = false; // 👈 New property for toggle state

  ngOnInit(): void {
    // 👈 [Change 7: Subscribe to login state when the component initializes]
    this.authSubscription = this.authService.isAuthenticated$.subscribe((status: boolean) => {
      this.isLoggedIn = status;
    });
  }

  ngOnDestroy(): void {
    // 👈 [Change 8: Unsubscribe to avoid memory leak]
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // 👈 [Change 9: Function to log out]
  onLogout(event: Event) {
    event.preventDefault();
    this.authService.logout();
  }

  openSettings(event: Event) {
    event.preventDefault();
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  mobileNavOpen = false;

  toggleMobileNav(): void {
    this.isMobileNavOpen = !this.isMobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  openProfileModal(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
  }
}
