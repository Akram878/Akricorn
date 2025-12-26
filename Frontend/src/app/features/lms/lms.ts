import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { LmsStats, LmsStatsService } from '../../core/services/lms-stats.service';

@Component({
  selector: 'app-lms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './lms.html',
  styleUrls: ['./lms.scss'],
})
export class LMS implements OnInit {
  stats: LmsStats = {
    activeCourses: 0,
    activeLearningPaths: 0,
    activeBooks: 0,
  };

  constructor(private lmsStatsService: LmsStatsService) {}

  ngOnInit(): void {
    const fallbackStats: LmsStats = {
      activeCourses: 0,
      activeLearningPaths: 0,
      activeBooks: 0,
    };

    this.lmsStatsService
      .getStats()
      .pipe(catchError(() => of(fallbackStats)))
      .subscribe((stats) => {
        this.stats = stats ?? fallbackStats;
      });
  }
}
