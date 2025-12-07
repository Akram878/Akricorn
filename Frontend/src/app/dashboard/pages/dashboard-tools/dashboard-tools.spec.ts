import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardTools } from './dashboard-tools';

describe('DashboardTools', () => {
  let component: DashboardTools;
  let fixture: ComponentFixture<DashboardTools>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardTools]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardTools);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
