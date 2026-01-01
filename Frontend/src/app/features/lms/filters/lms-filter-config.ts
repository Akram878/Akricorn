import {
  buildSelectOptions,
  createMinFilter,
  createRangeFilter,
  createSearchFilter,
  createSelectFilter,
} from '../../../shared/components/lms-filters/lms-filters.utils';
import { FilterDefinition } from '../../../shared/components/lms-filters/lms-filters.types';

import { PublicTool } from '../../../core/services/public-tools.service';

interface CourseFilterData {
  price: number;
  hours?: number | null;
  category?: string | null;
  pathTitle?: string | null;
  rating?: number | null;
}

export const buildCourseFilters = <T extends CourseFilterData>(
  courses: T[]
): FilterDefinition<T>[] => {
  return [
    createRangeFilter('price', 'Price', (course) => course.price, 'Min', 'Max'),
    createMinFilter('hours', 'Min hours', (course) => course.hours ?? 0, 'e.g. 5'),
    createSelectFilter(
      'category',
      'Category',
      buildSelectOptions(courses, (course) => course.category ?? null),
      (course) => course.category ?? null
    ),
    createSelectFilter(
      'path',
      'Path',
      buildSelectOptions(courses, (course) => course.pathTitle ?? null),
      (course) => course.pathTitle ?? null
    ),
    createMinFilter('rating', 'Min rating', (course) => course.rating ?? 0, 'e.g. 4'),
  ];
};

interface BookFilterData {
  title: string;
  description: string;
  price: number;
  category?: string | null;
}

export const buildBookFilters = <T extends BookFilterData>(books: T[]): FilterDefinition<T>[] => {
  return [
    createSearchFilter(
      'search',
      'Search',
      (book) => `${book.title ?? ''} ${book.description ?? ''}`,
      'Search books'
    ),
    createSelectFilter(
      'category',
      'Category',
      buildSelectOptions(books, (book) => book.category ?? null),
      (book) => book.category ?? null
    ),
    createRangeFilter('price', 'Price', (book) => book.price, 'Min', 'Max'),
  ];
};

export const buildToolFilters = (tools: PublicTool[]): FilterDefinition<PublicTool>[] => {
  return [
    createSearchFilter(
      'search',
      'Search',
      (tool) => `${tool.name ?? ''} ${tool.description ?? ''}`,
      'Search tools'
    ),
    createSelectFilter(
      'category',
      'Category',
      buildSelectOptions(tools, (tool) => tool.category ?? null),
      (tool) => tool.category ?? null
    ),
  ];
};

interface LearningPathFilterData {
  title: string;
  description: string;
  coursesCount: number;
}

export const buildLearningPathFilters = <T extends LearningPathFilterData>(
  paths: T[]
): FilterDefinition<T>[] => {
  return [
    createSearchFilter(
      'search',
      'Search',
      (path) => `${path.title ?? ''} ${path.description ?? ''}`,
      'Search paths'
    ),
    createMinFilter('courses', 'Min courses', (path) => path.coursesCount ?? 0, 'e.g. 3'),
  ];
};
