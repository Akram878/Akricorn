import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LMS } from './lms';

describe('LMS', () => {
  let component: LMS;
  let fixture: ComponentFixture<LMS>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LMS]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LMS);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
