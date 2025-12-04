import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuyuruCardList } from './duyuru-card-list';

describe('DuyuruCardList', () => {
  let component: DuyuruCardList;
  let fixture: ComponentFixture<DuyuruCardList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuyuruCardList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DuyuruCardList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
