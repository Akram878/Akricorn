import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookContentEditor } from './book-content-editor';

describe('BookContentEditor', () => {
  let component: BookContentEditor;
  let fixture: ComponentFixture<BookContentEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookContentEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(BookContentEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
