import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuyuruCard } from './duyuru-card';

describe('DuyuruCard', () => {
  let component: DuyuruCard;
  let fixture: ComponentFixture<DuyuruCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuyuruCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DuyuruCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
