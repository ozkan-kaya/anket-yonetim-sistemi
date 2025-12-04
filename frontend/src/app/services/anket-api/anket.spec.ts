import { TestBed } from '@angular/core/testing';

import { AnketService } from './anket';

describe('Anket', () => {
  let service: AnketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
