import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { AdminToolsService, AdminToolDto } from '../../../core/services/admin-tools.service';

@Component({
  selector: 'app-dashboard-tools',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf],
  templateUrl: './dashboard-tools.html',
  styleUrl: './dashboard-tools.scss',
})
export class DashboardTools implements OnInit {
  tools: AdminToolDto[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private adminTools: AdminToolsService) {}

  ngOnInit(): void {
    this.loadTools();
  }

  loadTools(): void {
    this.isLoading = true;
    this.error = null;

    this.adminTools.getAll().subscribe({
      next: (data) => {
        this.tools = data;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load tools.';
        this.isLoading = false;
      },
    });
  }

  onToggle(tool: AdminToolDto): void {
    this.adminTools.toggleActive(tool.id).subscribe({
      next: (res) => {
        tool.isActive = res.isActive;
      },
      error: () => {
        this.error = 'Failed to change status.';
      },
    });
  }

  onDelete(tool: AdminToolDto): void {
    const confirmDelete = confirm(`Delete tool "${tool.name}" ?`);
    if (!confirmDelete) return;

    this.adminTools.delete(tool.id).subscribe({
      next: () => {
        this.tools = this.tools.filter((t) => t.id !== tool.id);
      },
      error: () => {
        this.error = 'Failed to delete tool.';
      },
    });
  }
}
