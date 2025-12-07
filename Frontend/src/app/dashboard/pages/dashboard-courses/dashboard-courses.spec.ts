import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCourses } from './dashboard-courses/dashboard-courses';

describe('DashboardCourses', () => {
  let component: DashboardCourses;
  let fixture: ComponentFixture<DashboardCourses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCourses],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCourses);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
