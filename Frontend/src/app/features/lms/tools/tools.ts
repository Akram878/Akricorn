import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DemoTool {
  id: number;
  name: string;
  description: string;
  category: string;
  status: 'Beta' | 'Stable';
  tag: string;
}

@Component({
  selector: 'app-lms-tools',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tools.html',
  styleUrls: ['./tools.scss'],
})
export class LmsTools {
  demoTools: DemoTool[] = [
    {
      id: 1,
      name: 'Code Playground',
      description: 'Run small code snippets directly in the browser.',
      category: 'Coding',
      status: 'Beta',
      tag: 'Interactive',
    },
    {
      id: 2,
      name: 'Quiz Builder',
      description: 'Generate quizzes from course content and notes.',
      category: 'Assessment',
      status: 'Stable',
      tag: 'Exams',
    },
    {
      id: 3,
      name: 'Study Planner',
      description: 'Plan your weekly study schedule and track progress.',
      category: 'Productivity',
      status: 'Stable',
      tag: 'Planning',
    },
  ];
}
