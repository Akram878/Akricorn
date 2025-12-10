import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyBooks } from './my-books';

describe('MyBooks', () => {
  let component: MyBooks;
  let fixture: ComponentFixture<MyBooks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyBooks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyBooks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
