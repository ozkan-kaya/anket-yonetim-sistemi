import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth';

// Angular'dan backend'e giden her API isteğine (login hariç) otomatik olarak token ekleyen ara yazılımdır.

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    let authReq = req;

    // Token varsa Authorization header ekle
    if (token) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: any) => {
        // 401 veya 403 hatalarında otomatik logout
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401 || error.status === 403) {
            console.error('Auth Interceptor: Geçersiz token, çıkış yapılıyor...');
            this.authService.logout();
          }
        }
        return throwError(() => error);
      })
    );
  }
}
