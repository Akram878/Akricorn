import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sign } from './sign';

describe('Sign', () => {
  let component: Sign;
  let fixture: ComponentFixture<Sign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sign]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sign);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
