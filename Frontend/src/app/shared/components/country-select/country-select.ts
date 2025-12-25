import { Component, ElementRef, forwardRef, HostListener, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  ControlValueAccessor,
  FormsModule,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
} from '@angular/forms';
import { COUNTRY_OPTIONS, CountryOption } from '../../../core/utils/country-data';

@Component({
  selector: 'app-country-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './country-select.html',
  styleUrls: ['./country-select.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CountrySelectComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => CountrySelectComponent),
      multi: true,
    },
  ],
})
export class CountrySelectComponent implements ControlValueAccessor {
  @Input() options: CountryOption[] = COUNTRY_OPTIONS;
  @Input() required = false;
  @Input() invalid = false;
  @Input() placeholder = '+';
  @Input() searchPlaceholder = 'Search by country or dial code';
  @Input() disabled = false;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  open = false;
  searchTerm = '';
  value = '+';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  get selectedOption(): CountryOption | undefined {
    return this.options.find((option) => option.dialCode === this.value);
  }

  get filteredOptions(): CountryOption[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.options;

    return this.options.filter((option) => {
      const name = option.name.toLowerCase();
      const dial = option.dialCode.toLowerCase();
      const iso = option.isoCode.toLowerCase();
      return name.includes(query) || dial.includes(query) || iso.includes(query);
    });
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.open = !this.open;

    if (this.open) {
      setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
    }
  }

  selectOption(option: CountryOption): void {
    if (this.disabled) return;
    this.value = option.dialCode;
    this.onChange(this.value);
    this.onTouched();
    this.open = false;
    this.searchTerm = '';
  }

  writeValue(value: string | null): void {
    this.value = value && value.trim() ? value : '+';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.required) return null;
    const rawValue = `${control.value ?? this.value ?? ''}`.trim();
    if (!rawValue || rawValue === '+') {
      return { required: true };
    }

    const hasMatch = this.options.some((option) => option.dialCode === rawValue);
    if (!hasMatch) {
      return { invalidCountryCode: true };
    }
    return null;
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.open = false;
      this.searchTerm = '';
      this.onTouched();
    }
  }
}
