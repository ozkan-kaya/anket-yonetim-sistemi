import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnketYonetimi } from './anket-yonetimi';

describe('AnketYonetimi', () => {
  let component: AnketYonetimi;
  let fixture: ComponentFixture<AnketYonetimi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnketYonetimi]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AnketYonetimi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
