import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicCoursesService, MyCourse } from '../../../core/services/public-courses.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, DatePipe],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses implements OnInit {
  myCourses: MyCourse[] = [];
  filteredMyCourses: MyCourse[] = [];

  isLoading = false;
  error: string | null = null;

  // خيارات الفئات الموجودة فعلياً
  categories: string[] = [];

  // فلاتر
  minHours: number | null = null;
  selectedCategory: string = 'all';

  constructor(
    private publicCoursesService: PublicCoursesService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadMyCourses();
  }

  loadMyCourses(): void {
    this.isLoading = true;
    this.error = null;

    this.publicCoursesService.getMyCourses().subscribe({
      next: (data: MyCourse[]) => {
        this.myCourses = data;
        this.buildFilterOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading my courses', err);
        this.error = 'حدث خطأ أثناء تحميل كورساتك. حاول مرة أخرى لاحقاً.';
        this.isLoading = false;
      },
    });
  }

  private buildFilterOptions(): void {
    const catSet = new Set<string>();

    for (const c of this.myCourses) {
      if (c.category && c.category.trim() !== '') {
        catSet.add(c.category);
      }
    }

    this.categories = Array.from(catSet).sort();
  }

  applyFilters(): void {
    this.filteredMyCourses = this.myCourses.filter((c) => {
      // الساعات (لو null نخليه 0)
      const hours = c.hours != null ? c.hours : 0;
      if (this.minHours != null && hours < this.minHours) {
        return false;
      }

      // الفئة
      if (this.selectedCategory !== 'all') {
        const cat = c.category || '';
        if (cat !== this.selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }

  resetFilters(): void {
    this.minHours = null;
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  trackByCourseId(index: number, course: MyCourse): number {
    return course.id;
  }

  // مجرد placeholder لو حبّينا نضيف زر "Open course"
  openCourse(course: MyCourse): void {
    this.notification.showInfo('Course player is not implemented yet.');
  }
}
