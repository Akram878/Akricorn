import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DemoLearningPath {
  id: number;
  title: string;
  subtitle: string;
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
export class LearningPath {
  demoPaths: DemoLearningPath[] = [
    {
      id: 1,
      title: 'Fullstack Web Developer',
      subtitle: 'From HTML & CSS to backend APIs and databases.',
      level: 'Intermediate',
      estimatedWeeks: 16,
      coursesCount: 6,
      focusArea: 'Web Development',
    },
    {
      id: 2,
      title: 'Data & Algorithms Starter',
      subtitle: 'Learn the fundamentals of data structures and algorithms.',
      level: 'Beginner',
      estimatedWeeks: 10,
      coursesCount: 4,
      focusArea: 'Computer Science',
    },
    {
      id: 3,
      title: 'Database & SQL Specialist',
      subtitle: 'Design, query, and optimize relational databases.',
      level: 'Intermediate',
      estimatedWeeks: 12,
      coursesCount: 5,
      focusArea: 'Databases',
    },
  ];
}
