import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseContentEditor } from './course-content-editor';

describe('CourseContentEditor', () => {
  let component: CourseContentEditor;
  let fixture: ComponentFixture<CourseContentEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseContentEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseContentEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
