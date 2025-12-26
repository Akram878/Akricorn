import { FilterDefinition, FilterOption, FilterState, FilterValue } from './lms-filters.types';

export const buildFilterState = <T>(definitions: FilterDefinition<T>[]): FilterState => {
  return definitions.reduce<FilterState>((acc, def) => {
    if (def.type === 'range') {
      acc[def.id] = { min: null, max: null };
    } else {
      acc[def.id] = null;
    }
    return acc;
  }, {});
};

export const applyFilters = <T>(
  items: T[],
  definitions: FilterDefinition<T>[],
  state: FilterState
): T[] => {
  return items.filter((item) => definitions.every((def) => def.predicate(item, state[def.id])));
};

const normalizeValue = (value: FilterValue): string | number | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  return null;
};

export const createSelectFilter = <T>(
  id: string,
  label: string,
  options: FilterOption[],
  accessor: (item: T) => string | null | undefined
): FilterDefinition<T> => ({
  id,
  label,
  type: 'select',
  options,
  predicate: (item, value) => {
    const normalized = normalizeValue(value);
    if (!normalized || normalized === 'all') {
      return true;
    }
    return (accessor(item) ?? '') === normalized;
  },
});

export const createRangeFilter = <T>(
  id: string,
  label: string,
  accessor: (item: T) => number | null | undefined,
  minLabel = 'Min',
  maxLabel = 'Max'
): FilterDefinition<T> => ({
  id,
  label,
  type: 'range',
  minLabel,
  maxLabel,
  predicate: (item, value) => {
    const range = typeof value === 'object' && value !== null ? value : {};
    const min = range?.min ?? null;
    const max = range?.max ?? null;
    const numeric = accessor(item) ?? 0;

    if (min != null && numeric < min) {
      return false;
    }
    if (max != null && numeric > max) {
      return false;
    }

    return true;
  },
});

export const createMinFilter = <T>(
  id: string,
  label: string,
  accessor: (item: T) => number | null | undefined,
  placeholder?: string
): FilterDefinition<T> => ({
  id,
  label,
  type: 'min',
  placeholder,
  predicate: (item, value) => {
    const min = typeof value === 'number' ? value : null;
    if (min == null) {
      return true;
    }

    const numeric = accessor(item) ?? 0;
    return numeric >= min;
  },
});

export const createSearchFilter = <T>(
  id: string,
  label: string,
  accessor: (item: T) => string,
  placeholder = 'Search'
): FilterDefinition<T> => ({
  id,
  label,
  type: 'search',
  placeholder,
  predicate: (item, value) => {
    const normalized = normalizeValue(value);
    if (!normalized || typeof normalized !== 'string') {
      return true;
    }

    const haystack = accessor(item).toLowerCase();
    return haystack.includes(normalized.toLowerCase());
  },
});

export const buildSelectOptions = <T>(
  items: T[],
  accessor: (item: T) => string | null | undefined
): FilterOption[] => {
  const values = new Set<string>();
  for (const item of items) {
    const value = accessor(item);
    if (value && value.trim()) {
      values.add(value.trim());
    }
  }

  return Array.from(values)
    .sort()
    .map((value) => ({ label: value, value }));
};
