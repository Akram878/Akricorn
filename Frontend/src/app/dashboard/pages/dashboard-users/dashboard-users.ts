import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { AdminUsersService, AdminUserDto } from '../../../core/services/admin-users.service';

@Component({
  selector: 'app-dashboard-users',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf],
  templateUrl: './dashboard-users.html',
  styleUrl: './dashboard-users.scss',
})
export class DashboardUsers implements OnInit {
  users: AdminUserDto[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private adminUsers: AdminUsersService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.error = null;

    this.adminUsers.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load users.';
        this.isLoading = false;
      },
    });
  }

  onToggle(user: AdminUserDto): void {
    this.adminUsers.toggleActive(user.id).subscribe({
      next: (res) => {
        user.isActive = res.isActive;
      },
      error: () => {
        this.error = 'Failed to change status.';
      },
    });
  }

  onChangeRole(user: AdminUserDto): void {
    const newRole = prompt(
      `New role for "${user.name} ${user.family}" (current: ${user.role})`,
      user.role
    );
    if (!newRole) return;

    this.adminUsers.changeRole(user.id, newRole).subscribe({
      next: (res) => {
        user.role = res.role;
      },
      error: () => {
        this.error = 'Failed to update role.';
      },
    });
  }
}
