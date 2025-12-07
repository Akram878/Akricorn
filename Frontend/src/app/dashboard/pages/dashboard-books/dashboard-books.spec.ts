import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardBooks } from './dashboard-books';

describe('DashboardBooks', () => {
  let component: DashboardBooks;
  let fixture: ComponentFixture<DashboardBooks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardBooks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardBooks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
