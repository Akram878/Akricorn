import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardPaths } from './dashboard-paths';

describe('DashboardPaths', () => {
  let component: DashboardPaths;
  let fixture: ComponentFixture<DashboardPaths>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPaths]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardPaths);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
