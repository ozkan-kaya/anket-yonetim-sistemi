import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, AsyncPipe, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  // Theme settings
  appliedTheme: 'light' | 'dark' = 'light';
  themePreference: 'light' | 'dark' | 'system' = 'system';
  isThemeMenuActive = false;

  // Navbar burger menu states
  isMenuOpen = false;
  isUserDropdownActive = false;

  private colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private colorSchemeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    const savedPreference = (localStorage.getItem('themePreference') as 'light' | 'dark' | 'system') || 'system';
    this.setPreference(savedPreference);

    this.colorSchemeListener = () => {
      if (this.themePreference === 'system') this.applySystemTheme();
    };
    this.colorSchemeQuery.addEventListener('change', this.colorSchemeListener);
  }

  ngOnDestroy(): void {
    if (this.colorSchemeListener) {
      this.colorSchemeQuery.removeEventListener('change', this.colorSchemeListener);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    const themeDropdown = this.elementRef.nativeElement.querySelector('#theme-dropdown');
    if (this.isThemeMenuActive && themeDropdown && !themeDropdown.contains(target)) {
      const themeTrigger = this.elementRef.nativeElement.querySelector('.dropdown-trigger');
      if (!themeTrigger?.contains(target)) {
        this.isThemeMenuActive = false;
      }
    }

    const userDropdown = this.elementRef.nativeElement.querySelector('#user-dropdown');
    if (this.isUserDropdownActive && userDropdown && !userDropdown.contains(target)) {
      const userTrigger = this.elementRef.nativeElement.querySelectorAll('.dropdown-trigger')[1];
      if (userTrigger && !userTrigger.contains(target)) {
        this.isUserDropdownActive = false;
      }
    }
  }

  // Theme methods
  setPreference(preference: 'light' | 'dark' | 'system'): void {
    this.themePreference = preference;
    localStorage.setItem('themePreference', preference);
    this.isThemeMenuActive = false;

    if (preference === 'system') {
      this.applySystemTheme();
    } else {
      this.applyTheme(preference);
    }
  }

  applyTheme(theme: 'light' | 'dark'): void {
    this.appliedTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  applySystemTheme(): void {
    const isDark = this.colorSchemeQuery.matches;
    this.applyTheme(isDark ? 'dark' : 'light');
  }

  toggleThemeMenu(): void {
    this.isThemeMenuActive = !this.isThemeMenuActive;
    this.closeOtherMenus('theme');
  }

  // Navbar menu methods
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    this.closeOtherMenus('menu');
  }

  toggleUserDropdown(): void {
    this.isUserDropdownActive = !this.isUserDropdownActive;
    this.closeOtherMenus('user');
  }

  closeAllMenus(): void {
    this.isMenuOpen = false;
    this.isThemeMenuActive = false;
    this.isUserDropdownActive = false;
  }

  private closeOtherMenus(except?: 'menu' | 'user' | 'theme'): void {
    if (except !== 'menu') this.isMenuOpen = false;
    if (except !== 'user') this.isUserDropdownActive = false;
    if (except !== 'theme') this.isThemeMenuActive = false;
  }

  //  Logout method
  logout(): void {
    this.closeAllMenus();
    this.authService.logout();
  }
}
