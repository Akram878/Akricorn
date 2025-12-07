import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardLogin } from './dashboard-login';

describe('DashboardLogin', () => {
  let component: DashboardLogin;
  let fixture: ComponentFixture<DashboardLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
