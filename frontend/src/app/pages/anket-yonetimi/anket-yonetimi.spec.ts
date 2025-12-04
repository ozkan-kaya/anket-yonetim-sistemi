import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuyuruYonetimi } from './duyuru-yonetimi';

describe('DuyuruYonetimi', () => {
  let component: DuyuruYonetimi;
  let fixture: ComponentFixture<DuyuruYonetimi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuyuruYonetimi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DuyuruYonetimi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
