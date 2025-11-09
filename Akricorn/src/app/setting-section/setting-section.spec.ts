import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingSection } from './setting-section';

describe('SettingSection', () => {
  let component: SettingSection;
  let fixture: ComponentFixture<SettingSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingSection],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
