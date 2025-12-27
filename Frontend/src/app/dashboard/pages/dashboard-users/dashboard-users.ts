import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminUsersService, AdminUserDto } from '../../../core/services/admin-users.service';

@Component({
  selector: 'app-dashboard-users',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, RouterLink, FormsModule],
  templateUrl: './dashboard-users.html',
  styleUrl: './dashboard-users.scss',
})
export class DashboardUsers implements OnInit {
  users: AdminUserDto[] = [];
  isLoading = false;
  error: string | null = null;
  roleOptions: string[] = ['Admin', 'User'];

  constructor(private adminUsers: AdminUsersService, private router: Router) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.error = null;

    this.adminUsers.getAll().subscribe({
      next: (data) => {
        this.users = data;
        const roles = new Set(this.roleOptions);
        data.forEach((u) => roles.add(u.role));
        this.roleOptions = Array.from(roles);
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

  onRoleChange(user: AdminUserDto, newRole: string): void {
    if (!newRole || newRole === user.role) return;

    this.adminUsers.changeRole(user.id, newRole).subscribe({
      next: (res) => {
        user.role = res.role;
      },
      error: () => {
        this.error = 'Failed to update role.';
      },
    });
  }

  goToDetail(user: AdminUserDto): void {
    this.router.navigate(['/dashboard/users', user.id]);
  }
}
