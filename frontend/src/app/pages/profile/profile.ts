import { Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { AnketService } from '../../services/anket-api/anket';
import { AuthService } from '../../services/auth/auth';
import { Anket } from '../../interfaces/anket-interface';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit, OnDestroy {
  katildigimAnketler: Anket[] = [];
  filteredKatildigimAnketler: Anket[] = [];
  message = '';
  currentUser: any | null = null;

  // Arama
  searchQuery = '';
  private searchChange$ = new Subject<string>();
  private searchSub?: Subscription;

  // Sıralama
  sortOrder: 'created-new-to-old' | 'created-old-to-new' | 'participation-new-to-old' | 'participation-old-to-new' = 'participation-new-to-old';

  private destroy$ = new Subject<void>();

  constructor(
    private anketService: AnketService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Mevcut kullanıcı bilgisini localStorage'dan al
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
    });

    this.loadKatildigimAnketler();

    // Gecikmeli arama
    this.searchSub = this.searchChange$
      .pipe(
        map(v => (v || '').trim()),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.applySearchAndSort();
      });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadKatildigimAnketler(): void {
    this.anketService.getKatildigimAnketler().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.katildigimAnketler = data;
        this.applySearchAndSort();
      },
      error: (error) => {
        console.error('Anket listesi yüklenirken hata:', error);
        this.message = 'Anket listesi yüklenirken hata oluştu.';
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchChange$.next(value);
  }

  performSearch(): void {
    this.applySearchAndSort();
  }

  onSortChange(): void {
    this.applySearchAndSort();
  }

  private applySearchAndSort(): void {
    const query = this.searchQuery.trim().toLowerCase();

    // Arama
    if (query.length >= 2) {
      this.filteredKatildigimAnketler = this.katildigimAnketler.filter(anket => {
        return anket.title?.toLowerCase().includes(query) ||
          anket.aciklama?.toLowerCase().includes(query);
      });
    } else {
      this.filteredKatildigimAnketler = [...this.katildigimAnketler];
    }

    // Sıralama
    this.sortFilteredList();
  }

  private sortFilteredList(): void {
    switch (this.sortOrder) {
      case 'created-new-to-old':
        this.filteredKatildigimAnketler.sort((a, b) =>
          new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()
        );
        break;
      case 'created-old-to-new':
        this.filteredKatildigimAnketler.sort((a, b) =>
          new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()
        );
        break;
      case 'participation-new-to-old':
        this.filteredKatildigimAnketler.sort((a, b) =>
          new Date(b.participation_date || 0).getTime() - new Date(a.participation_date || 0).getTime()
        );
        break;
      case 'participation-old-to-new':
        this.filteredKatildigimAnketler.sort((a, b) =>
          new Date(a.participation_date || 0).getTime() - new Date(b.participation_date || 0).getTime()
        );
        break;
    }
  }

  goToAnketDetay(id: number): void {
    this.router.navigate(['/anket-detay', id]);
  }
}
