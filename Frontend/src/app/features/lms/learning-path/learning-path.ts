import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PublicLearningPathsService,
  PublicLearningPath,
} from '../../../core/services/public-learning-paths.service';

interface UiLearningPath {
  id: number;
  title: string;
  subtitle: string; // description
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedWeeks: number;
  coursesCount: number;
  focusArea: string;
}

@Component({
  selector: 'app-lms-learning-path',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-path.html',
  styleUrls: ['./learning-path.scss'],
})
export class LearningPath implements OnInit {
  paths: UiLearningPath[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private pathsService: PublicLearningPathsService) {}

  ngOnInit(): void {
    this.loadPaths();
  }

  loadPaths(): void {
    this.isLoading = true;
    this.error = null;

    this.pathsService.getPaths().subscribe({
      next: (data: PublicLearningPath[]) => {
        this.paths = data.map((p) => {
          const level: UiLearningPath['level'] =
            p.coursesCount <= 2 ? 'Beginner' : p.coursesCount <= 5 ? 'Intermediate' : 'Advanced';

          const estimatedWeeks = Math.max(4, (p.coursesCount || 2) * 2);

          return {
            id: p.id,
            title: p.title,
            subtitle: p.description,
            level,
            estimatedWeeks,
            coursesCount: p.coursesCount,
            focusArea: 'Mixed topics',
          };
        });

        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load learning paths. Please try again later.';
        this.isLoading = false;
      },
    });
  }

  trackByPathId(index: number, path: UiLearningPath): number {
    return path.id;
  }
}
