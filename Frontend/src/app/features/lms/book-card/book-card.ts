import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { resolveMediaUrl } from '../../../core/utils/media-url';
import { PublicBook } from '../../../core/services/public-books.service';

export interface BookCardData extends PublicBook {
  rating?: number | null;
}

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-card.html',
  styleUrl: './book-card.scss',
})
export class BookCardComponent {
  @Input({ required: true }) book!: BookCardData;
  @Input() coverUrl?: string | null;
  @Input() owned = false;
  @Input() isProcessing = false;
  @Input() showBuy = true;
  @Input() showRate = false;
  @Input() rateDisabled = false;
  @Output() view = new EventEmitter<void>();
  @Output() buy = new EventEmitter<void>();
  @Output() rate = new EventEmitter<void>();
  isExpanded = false;

  toggleDescription(): void {
    this.isExpanded = !this.isExpanded;
  }

  getCoverUrl(): string | null {
    if (this.coverUrl) {
      return this.coverUrl;
    }
    if (!this.book.thumbnailUrl?.trim()) {
      return null;
    }

    return resolveMediaUrl(this.book.thumbnailUrl);
  }

  getRating(): number {
    return this.book.rating ?? 0;
  }

  hasDescription(): boolean {
    return Boolean(this.book.description && this.book.description.trim().length > 0);
  }

  isLongDescription(): boolean {
    return (this.book.description?.trim().length ?? 0) > 120;
  }

  onView(): void {
    this.view.emit();
  }

  onRate(): void {
    if (this.rateDisabled) {
      return;
    }
    this.rate.emit();
  }
  onBuy(): void {
    if (this.isProcessing) {
      return;
    }
    this.buy.emit();
  }
}
