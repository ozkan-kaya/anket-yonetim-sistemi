import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { canActivateLoggedIn, canActivateRaporlama, canActivateAnketYonetimi } from './auth-guard';
import { AuthService } from './auth';

describe('Auth Guards', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'getUserYetkiler']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  describe('canActivateLoggedIn', () => {
    it('should allow access when user is logged in', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        canActivateLoggedIn({} as any, {} as any)
      );

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to login when user is not logged in', () => {
      mockAuthService.isLoggedIn.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        canActivateLoggedIn({} as any, {} as any)
      );

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('canActivateRaporlama', () => {
    it('should allow access for admin yetki', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);
      mockAuthService.getUserYetkiler.and.returnValue(['admin']);

      const result = TestBed.runInInjectionContext(() =>
        canActivateRaporlama({} as any, {} as any)
      );

      expect(result).toBe(true);
    });

    it('should allow access for anket_raporlama yetki', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);
      mockAuthService.getUserYetkiler.and.returnValue(['anket_raporlama']);

      const result = TestBed.runInInjectionContext(() =>
        canActivateRaporlama({} as any, {} as any)
      );

      expect(result).toBe(true);
    });

    it('should allow access for anket_yonetimi yetki', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);
      mockAuthService.getUserYetkiler.and.returnValue(['anket_yonetimi']);

      const result = TestBed.runInInjectionContext(() =>
        canActivateRaporlama({} as any, {} as any)
      );

      expect(result).toBe(true);
    });

    it('should redirect to home for unauthorized yetki', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);
      mockAuthService.getUserYetkiler.and.returnValue(['kullanici']);

      const result = TestBed.runInInjectionContext(() =>
        canActivateRaporlama({} as any, {} as any)
      );

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should redirect to login when not logged in', () => {
      mockAuthService.isLoggedIn.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        canActivateRaporlama({} as any, {} as any)
      );

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('canActivateAnketYonetimi', () => {
    it('should allow access for admin yetki', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);
      mockAuthService.getUserYetkiler.and.returnValue(['admin']);

      const result = TestBed.runInInjectionContext(() =>
        canActivateAnketYonetimi({} as any, {} as any)
      );

      expect(result).toBe(true);
    });

    it('should allow access for anket_yonetimi yetki', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);
      mockAuthService.getUserYetkiler.and.returnValue(['anket_yonetimi']);

      const result = TestBed.runInInjectionContext(() =>
        canActivateAnketYonetimi({} as any, {} as any)
      );

      expect(result).toBe(true);
    });

    it('should redirect to home for unauthorized yetki', () => {
      mockAuthService.isLoggedIn.and.returnValue(true);
      mockAuthService.getUserYetkiler.and.returnValue(['kullanici']);

      const result = TestBed.runInInjectionContext(() =>
        canActivateAnketYonetimi({} as any, {} as any)
      );

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });


});
