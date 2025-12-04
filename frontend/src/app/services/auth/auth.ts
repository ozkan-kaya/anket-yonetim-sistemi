import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// Kullanıcının login, logout, oturum durumunu (isLoggedIn, user$) ve token'ı yöneten merkezi servistir.

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<any | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      this.userSubject.next(user);
    }
  }

  login(sicil: string, sifre: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { sicil, sifre })
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.userSubject.next(response.user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  getProfil(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profil`);
  }

  getUserYetkiler(): string[] {
    const user = this.userSubject.value;
    return user?.yetkiler || [];
  }

  hasAnyYetki(yetkiler: string[]): boolean {
    const userYetkiler = this.getUserYetkiler();
    return yetkiler.some(yetki => userYetkiler.includes(yetki));
  }

  isAdmin(): boolean {
    return this.getUserYetkiler().includes('admin');
  }

  canViewReports(): boolean {
    return this.isAdmin() || this.hasAnyYetki(['anket_raporlama', 'anket_yonetimi']);
  }

  canManageSurveys(): boolean {
    return this.isAdmin() || this.hasAnyYetki(['anket_yonetimi']);
  }
}
