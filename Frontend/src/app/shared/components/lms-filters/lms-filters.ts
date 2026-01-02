import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterDefinition, FilterState, FilterValue } from './lms-filters.types';

@Component({
  selector: 'app-lms-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lms-filters.html',
  styleUrl: './lms-filters.scss',
})
export class LmsFiltersComponent<T> implements OnInit {
  @Input({ required: true }) filters: FilterDefinition<T>[] = [];
  @Input({ required: true }) state: FilterState = {};
  @Input() resultCount: number | null = null;

  @Output() stateChange = new EventEmitter<FilterState>();
  @Output() reset = new EventEmitter<void>();

  isOpen = false;

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 993px)').matches) {
      this.isOpen = true;
    }
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  closePanel(): void {
    this.isOpen = false;
  }

  updateValue(filterId: string, value: FilterValue): void {
    this.stateChange.emit({
      ...this.state,
      [filterId]: value,
    });
  }

  updateRange(filterId: string, key: 'min' | 'max', value: number | null): void {
    const current = (this.state[filterId] as { min?: number | null; max?: number | null }) || {};
    this.updateValue(filterId, {
      ...current,
      [key]: value,
    });
  }

  clearFilters(): void {
    this.reset.emit();
  }

  getActiveCount(): number {
    return Object.values(this.state).reduce<number>((count, value) => {
      if (value == null) {
        return count;
      }

      if (typeof value === 'string') {
        return value.trim() ? count + 1 : count;
      }

      if (typeof value === 'number') {
        return count + 1;
      }

      const min = value?.min ?? null;
      const max = value?.max ?? null;
      return min != null || max != null ? count + 1 : count;
    }, 0);
  }

  getRangeValue(filterId: string, key: 'min' | 'max'): number | null {
    const value = this.state[filterId];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value[key] ?? null;
    }
    return null;
  }
}
