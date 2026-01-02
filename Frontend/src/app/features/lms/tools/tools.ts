import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicToolsService, PublicTool } from '../../../core/services/public-tools.service';
import { ToolCardComponent } from '../tool-card/tool-card';
import { LmsFiltersComponent } from '../../../shared/components/lms-filters/lms-filters';
import {
  applyFilters as applyFilterSet,
  buildFilterState,
} from '../../../shared/components/lms-filters/lms-filters.utils';
import {
  FilterDefinition,
  FilterState,
} from '../../../shared/components/lms-filters/lms-filters.types';
import { buildToolFilters } from '../filters/lms-filter-config';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { appendAuthToken, resolveMediaUrl } from '../../../core/utils/media-url';

@Component({
  selector: 'app-lms-tools',
  standalone: true,
  imports: [CommonModule, ToolCardComponent, LmsFiltersComponent],
  templateUrl: './tools.html',
  styleUrls: ['./tools.scss'],
})
export class LmsTools implements OnInit {
  tools: PublicTool[] = [];
  filteredTools: PublicTool[] = [];
  isLoading = false;
  error: string | null = null;
  filters: FilterDefinition<PublicTool>[] = [];
  filterState: FilterState = {};
  constructor(
    private toolsService: PublicToolsService,
    private authService: AuthService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTools();
  }

  loadTools(): void {
    this.isLoading = true;
    this.error = null;

    this.toolsService.getTools().subscribe({
      next: (data) => {
        this.tools = data;
        this.filters = buildToolFilters(data);
        this.filterState = buildFilterState(this.filters);
        this.applyFilters(this.filterState);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load tools. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  trackByToolId(index: number, tool: PublicTool): number {
    return tool.id;
  }

  openTool(tool: PublicTool): void {
    if (!tool.url) {
      return;
    }

    window.open(tool.url, '_blank');
  }

  downloadTool(tool: PublicTool): void {
    if (!tool.downloadUrl) {
      this.notification.showError('File is not available.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.notification.showError('يرجى تسجيل الدخول للوصول إلى الملف.');
      return;
    }

    const token = this.authService.getAccessToken();
    const url = appendAuthToken(resolveMediaUrl(tool.downloadUrl), token);
    window.open(url, '_blank', 'noopener');
  }

  applyFilters(state: FilterState): void {
    this.filterState = state;
    this.filteredTools = applyFilterSet(this.tools, this.filters, state);
  }

  resetFilters(): void {
    this.filterState = buildFilterState(this.filters);
    this.filteredTools = applyFilterSet(this.tools, this.filters, this.filterState);
  }
}
