export type FilterInputType = 'select' | 'range' | 'min' | 'search';

export type FilterValue =
  | string
  | number
  | null
  | {
      min?: number | null;
      max?: number | null;
    };

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition<T> {
  id: string;
  label: string;
  type: FilterInputType;
  options?: FilterOption[];
  placeholder?: string;
  minLabel?: string;
  maxLabel?: string;
  unit?: string;
  predicate: (item: T, value: FilterValue) => boolean;
}

export type FilterState = Record<string, FilterValue>;
