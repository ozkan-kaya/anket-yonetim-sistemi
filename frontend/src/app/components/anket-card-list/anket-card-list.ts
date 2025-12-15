import { Component, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnketService } from '../../services/anket-api/anket';
import { AnketCard } from '../anket-card/anket-card';
import { Anket, Departman } from '../../interfaces/anket-interface';

@Component({
  selector: 'app-anket-card-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AnketCard],
  templateUrl: './anket-card-list.html',
  styleUrls: ['./anket-card-list.css']
})
export class AnketCardList {

  anketler = signal<Anket[]>([]);
  departmanlar = signal<Departman[]>([]);

  searchText = signal('');
  debouncedSearchText = signal('');
  tarihStart = signal<string | null>(null);
  tarihEnd = signal<string | null>(null);
  sortField = signal('tarih');
  sortDir = signal('desc');
  selectedDepartment = signal<number | null>(null);

  showFilters = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(6);

  private searchTimeout?: number;

  constructor(private anketService: AnketService, private router: Router) {
    this.loadAnketler();
    this.loadDepartmanlar();
    this.setupSearchDebounce();
  }

  setupSearchDebounce() {
    effect(() => {
      const search = this.searchText();

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      this.searchTimeout = window.setTimeout(() => {
        this.debouncedSearchText.set(search);
        this.currentPage.set(1);
      }, 300);
    });
  }

  loadAnketler() {
    this.anketService.getAnketler().subscribe({
      next: data => this.anketler.set(data),
      error: err => console.error(err)
    });
  }

  loadDepartmanlar() {
    this.anketService.getDepartmanlar().subscribe({
      next: data => this.departmanlar.set(data),
      error: err => console.error(err)
    });
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters() {
    this.searchText.set('');
    this.tarihStart.set(null);
    this.tarihEnd.set(null);
    this.selectedDepartment.set(null);
    this.currentPage.set(1);
  }

  onAnketClick(anket: Anket): void {
    this.router.navigate(['/anket-detay', anket.id]);
  }

  filteredAnketler = computed(() => {
    let temp = [...this.anketler()];

    // Arama
    if (this.debouncedSearchText().trim()) {
      const q = this.debouncedSearchText().toLowerCase();
      temp = temp.filter(d => d.title.toLowerCase().includes(q) || d.aciklama.toLowerCase().includes(q));
    }

    // Tarih aralığı (Başlangıç tarihine göre)
    if (this.tarihStart()) {
      const start = new Date(this.tarihStart()!);
      temp = temp.filter(d => new Date(d.start_date) >= start);
    }
    if (this.tarihEnd()) {
      const end = new Date(this.tarihEnd()!);
      temp = temp.filter(d => new Date(d.start_date) <= end);
    }

    // Departman Filtresi
    if (this.selectedDepartment()) {
      const deptId = Number(this.selectedDepartment());
      temp = temp.filter(d => d.departmanlar && d.departmanlar.some((dept: any) => (dept.id || dept) === deptId));
    }

    // Sıralama
    temp.sort((a, b) => {
      let comp = 0;
      if (this.sortField() === 'tarih') {
        comp = new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
      }
      return this.sortDir() === 'asc' ? comp : -comp;
    });

    return temp;
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredAnketler().length / this.pageSize());
  });

  pages = computed(() =>
    Array.from({ length: this.totalPages() })
  );

  paginatedAnketler = computed(() => {
    const filtered = this.filteredAnketler();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }
}
