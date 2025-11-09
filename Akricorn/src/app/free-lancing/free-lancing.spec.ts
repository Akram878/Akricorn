import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreeLancing } from './free-lancing';

describe('FreeLancing', () => {
  let component: FreeLancing;
  let fixture: ComponentFixture<FreeLancing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreeLancing]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreeLancing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
