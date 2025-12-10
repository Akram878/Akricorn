import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicToolsService, PublicTool } from '../../../core/services/public-tools.service';

interface UiTool extends PublicTool {
  status: 'Beta' | 'Stable';
  tag: string;
}

@Component({
  selector: 'app-lms-tools',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tools.html',
  styleUrls: ['./tools.scss'],
})
export class LmsTools implements OnInit {
  tools: UiTool[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private toolsService: PublicToolsService) {}

  ngOnInit(): void {
    this.loadTools();
  }

  loadTools(): void {
    this.isLoading = true;
    this.error = null;

    this.toolsService.getTools().subscribe({
      next: (data) => {
        // نضيف status/tag فقط للواجهة حتى نحافظ على نفس الديزاين
        this.tools = data.map((t) => ({
          ...t,
          status: 'Stable',
          tag: t.category,
        }));
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load tools. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  trackByToolId(index: number, tool: UiTool): number {
    return tool.id;
  }

  openTool(tool: UiTool): void {
    if (!tool.url) {
      return;
    }

    window.open(tool.url, '_blank');
  }
}
