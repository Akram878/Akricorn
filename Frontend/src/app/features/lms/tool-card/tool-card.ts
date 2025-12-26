import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicTool } from '../../../core/services/public-tools.service';

@Component({
  selector: 'app-tool-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tool-card.html',
  styleUrl: './tool-card.scss',
})
export class ToolCardComponent {
  @Input({ required: true }) tool!: PublicTool;
  @Input() isDownloadAvailable = false;

  @Output() open = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();

  getToolAvatar(): string {
    const name = this.tool.name?.trim() || '';
    if (!name) {
      return '•';
    }

    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase()).join('');
  }

  onOpen(): void {
    this.open.emit();
  }

  onDownload(): void {
    if (!this.isDownloadAvailable) {
      return;
    }
    this.download.emit();
  }
}
