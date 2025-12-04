import { Component, OnInit, OnDestroy, Renderer2, Inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { AnketService } from '../../services/anket-api/anket';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Anket, Departman } from '../../interfaces/anket-interface';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit, OnDestroy {
  anketListesi: Anket[] = [];
  filteredAnketListesi: Anket[] = [];

  searchQuery = '';
  private searchChange$ = new Subject<string>();
  private searchSub?: Subscription;

  sortOrder: 'id-asc' | 'id-desc' | 'new-to-old' | 'old-to-new' = 'id-desc';

  isModalActive = false;
  modalAnketBasligi = '';
  modalAnketId: number | null = null;
  modalKatilimcilarListesi: any[] = [];
  modalLoading = false;

  currentTab: 'participants' | 'statistics' = 'participants';

  statisticsData: any[] = [];
  charts: any[] = [];

  currentView: 'list' | 'answers' = 'list';
  selectedParticipantAnswers: any[] = [];
  selectedParticipantName = '';

  message = '';
  private destroy$ = new Subject<void>();

  totalAnketCount = 0;
  totalActiveAnketCount = 0;
  departmentChart: any;
  activeDepartmentChart: any;
  departmentList: Departman[] = [];

  constructor(
    private anketService: AnketService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit(): void {
    this.loadAnketler();

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
    this.destroyCharts();
    this.toggleBodyScroll(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeModal(): void {
    this.isModalActive = false;
    this.toggleBodyScroll(false);
    this.destroyCharts();
  }

  private toggleBodyScroll(active: boolean): void {
    const html = this.document.documentElement;
    if (active) {
      this.renderer.addClass(html, 'is-clipped');
    } else {
      this.renderer.removeClass(html, 'is-clipped');
    }
  }

  loadDepartmanlar(): void {
    this.anketService.getDepartmanlar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.departmentList = data;
          if (this.anketListesi.length > 0) {
            this.calculateDashboardStats();
          }
        },
        error: (err) => console.error('Departmanlar yüklenemedi:', err)
      });
  }

  loadAnketler(): void {
    this.message = '';
    this.anketService.getAnketler()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.anketListesi = data;
          this.calculateDashboardStats();
          this.applySearchAndSort();
        },
        error: (err) => {
          console.error('Rapor verileri yüklenirken hata:', err);
          this.message = 'Rapor verileri yüklenirken hata oluştu: ' + err.message;
        }
      });
  }

  calculateDashboardStats(): void {
    this.totalAnketCount = this.anketListesi.length;
    this.totalActiveAnketCount = this.anketListesi.filter(a => a.is_active).length;

    const deptCounts = new Map<string, number>();

    this.anketListesi.forEach(anket => {
      if (anket.departmanlar && Array.isArray(anket.departmanlar) && anket.departmanlar.length > 0) {
        anket.departmanlar.forEach(dept => {
          let deptName = '';
          let deptId = -1;

          if (typeof dept === 'object' && dept !== null) {
            const d = dept as any;
            deptName = d.departman_adi || d.name || d.title || '';
            if (!deptName && d.id) deptId = d.id;
          } else if (typeof dept === 'number') {
            deptId = dept;
          } else if (typeof dept === 'string') {
            if (!isNaN(Number(dept))) {
              deptId = Number(dept);
            } else {
              deptName = dept;
            }
          }

          // ID varsa ismi bul
          if (!deptName && deptId !== -1) {
            const found = this.departmentList.find(d => d.id == deptId);
            deptName = found ? found.name : 'Departman ' + deptId;
          }

          if (deptName) {
            deptCounts.set(deptName, (deptCounts.get(deptName) || 0) + 1);
          }
        });
      } else {
        const key = 'Genel / Tüm Departmanlar';
        deptCounts.set(key, (deptCounts.get(key) || 0) + 1);
      }
    });

    // Aktif anket dağılımı
    const activeDeptCounts = new Map<string, number>();

    this.anketListesi.filter(a => a.status).forEach(anket => {
      if (anket.departmanlar && Array.isArray(anket.departmanlar) && anket.departmanlar.length > 0) {
        anket.departmanlar.forEach(dept => {
          let deptName = '';
          let deptId = -1;

          if (typeof dept === 'object' && dept !== null) {
            const d = dept as any;
            deptName = d.departman_adi || d.name || d.title || '';
            if (!deptName && d.id) deptId = d.id;
          } else if (typeof dept === 'number') {
            deptId = dept;
          } else if (typeof dept === 'string') {
            if (!isNaN(Number(dept))) {
              deptId = Number(dept);
            } else {
              deptName = dept;
            }
          }

          if (!deptName && deptId !== -1) {
            const found = this.departmentList.find(d => d.id == deptId);
            deptName = found ? found.name : 'Departman ' + deptId;
          }

          if (deptName) {
            activeDeptCounts.set(deptName, (activeDeptCounts.get(deptName) || 0) + 1);
          }
        });
      } else {
        const key = 'Genel / Tüm Departmanlar';
        activeDeptCounts.set(key, (activeDeptCounts.get(key) || 0) + 1);
      }
    });

    setTimeout(() => {
      this.renderDepartmentChart(deptCounts);
      this.renderActiveDepartmentChart(activeDeptCounts);
    }, 100);
  }

  renderDepartmentChart(data: Map<string, number>): void {
    const canvas = document.getElementById('departmentChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.departmentChart) {
      this.departmentChart.destroy();
    }

    const labels = Array.from(data.keys());
    const counts = Array.from(data.values());

    this.departmentChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: this.generateColors(counts.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          title: {
            display: false
          },
          datalabels: {
            color: '#fff',
            font: {
              weight: 'bold'
            },
            formatter: (value: any, ctx: any) => {
              const dataset = ctx.chart.data.datasets[0];
              const total = (dataset.data as number[]).reduce((acc, curr) => acc + curr, 0);
              const percentage = ((value / total) * 100).toFixed(1) + '%';
              return percentage;
            }
          }
        }
      }
    });
  }

  renderActiveDepartmentChart(data: Map<string, number>): void {
    const canvas = document.getElementById('activeDepartmentChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.activeDepartmentChart) {
      this.activeDepartmentChart.destroy();
    }

    const labels = Array.from(data.keys());
    const counts = Array.from(data.values());

    this.activeDepartmentChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: this.generateColors(counts.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          title: {
            display: false
          },
          datalabels: {
            color: '#fff',
            font: {
              weight: 'bold'
            },
            formatter: (value: any, ctx: any) => {
              const dataset = ctx.chart.data.datasets[0];
              const total = (dataset.data as number[]).reduce((acc, curr) => acc + curr, 0);
              const percentage = ((value / total) * 100).toFixed(1) + '%';
              return percentage;
            }
          }
        }
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

    if (query.length >= 2) {
      this.filteredAnketListesi = this.anketListesi.filter(anket => {
        return anket.title?.toLowerCase().includes(query) ||
          anket.creator_name?.toLowerCase().includes(query);
      });
    } else {
      this.filteredAnketListesi = [...this.anketListesi];
    }

    this.sortFilteredList();
  }

  private sortFilteredList(): void {
    switch (this.sortOrder) {
      case 'id-asc':
        this.filteredAnketListesi.sort((a, b) => (a.id || 0) - (b.id || 0));
        break;
      case 'id-desc':
        this.filteredAnketListesi.sort((a, b) => (b.id || 0) - (a.id || 0));
        break;
      case 'new-to-old':
        this.filteredAnketListesi.sort((a, b) =>
          new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()
        );
        break;
      case 'old-to-new':
        this.filteredAnketListesi.sort((a, b) =>
          new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()
        );
        break;
    }
  }

  openModal(anketId: number, anketBasligi: string): void {
    this.isModalActive = true;
    this.toggleBodyScroll(true);
    this.modalAnketBasligi = anketBasligi;
    this.modalAnketId = anketId;
    this.modalKatilimcilarListesi = [];
    this.modalLoading = true;
    this.currentView = 'list';
    this.currentTab = 'statistics';

    this.loadStatistics(anketId);
  }

  loadParticipants(anketId: number): void {
    this.modalLoading = true;
    this.anketService.getAnketKatilimcilar(anketId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.modalKatilimcilarListesi = data;
          this.modalLoading = false;
        },
        error: (err) => {
          console.error('Katılımcı detayları alınamadı:', err);
          this.message = 'Katılımcı detayları alınamadı: ' + err.message;
          this.modalLoading = false;
        }
      });
  }

  switchTab(tab: 'participants' | 'statistics'): void {
    this.currentTab = tab;
    if (this.modalAnketId) {
      if (tab === 'statistics') {
        this.loadStatistics(this.modalAnketId);
      } else {
        this.loadParticipants(this.modalAnketId);
      }
    }
  }

  loadStatistics(anketId: number): void {
    this.modalLoading = true;
    this.destroyCharts();
    this.statisticsData = [];

    this.anketService.getAnketIstatistik(anketId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.processStatisticsData(data.cevapDagilim);
          this.modalLoading = false;
          // Chart render için DOM güncellemesini bekle
          setTimeout(() => {
            this.renderCharts();
          }, 100);
        },
        error: (err) => {
          console.error('İstatistikler alınamadı:', err);
          this.modalLoading = false;
        }
      });
  }

  processStatisticsData(rawData: any[]): void {
    const grouped = new Map<number, any>();

    rawData.forEach(item => {
      if (!grouped.has(item.soru_id)) {
        grouped.set(item.soru_id, {
          soru_id: item.soru_id,
          soru_baslik: item.soru_baslik,
          labels: [],
          data: []
        });
      }
      const group = grouped.get(item.soru_id);
      group.labels.push(item.answer);
      group.data.push(parseInt(item.cevap_sayisi));
    });

    this.statisticsData = Array.from(grouped.values());
  }

  renderCharts(): void {
    this.statisticsData.forEach(stat => {
      const canvas = document.getElementById('chart-' + stat.soru_id) as HTMLCanvasElement;
      if (canvas) {
        const chart = new Chart(canvas, {
          type: 'pie',
          data: {
            labels: stat.labels,
            datasets: [{
              data: stat.data,
              backgroundColor: this.generateColors(stat.data.length),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              },
              datalabels: {
                color: '#fff',
                font: {
                  weight: 'bold',
                  size: 14
                },
                formatter: (value: any, ctx: any) => {
                  const dataset = ctx.chart.data.datasets[0];
                  const total = (dataset.data as number[]).reduce((acc, curr) => acc + curr, 0);
                  const percentage = ((value / total) * 100).toFixed(1) + '%';
                  return percentage;
                }
              }
            }
          }
        });
        this.charts.push(chart);
      }
    });
  }

  generateColors(count: number): string[] {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#EA80FC', '#8C9EFF', '#B388FF', '#FF8A80', '#CCFF90', '#A7FFEB'
    ];
    // Daha fazla renk gerekirse rastgele üret
    while (colors.length < count) {
      colors.push('#' + Math.floor(Math.random() * 16777215).toString(16));
    }
    return colors.slice(0, count);
  }

  destroyCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
  }

  viewParticipantAnswers(anketUserId: number, userName: string): void {
    this.modalLoading = true;
    this.selectedParticipantName = userName;

    this.anketService.getKatilimciCevaplari(anketUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.selectedParticipantAnswers = data;
          this.currentView = 'answers';
          this.modalLoading = false;
        },
        error: (err) => {
          console.error('Cevaplar alınamadı:', err);
          this.modalLoading = false;
        }
      });
  }

  backToParticipantList(): void {
    this.currentView = 'list';
    this.selectedParticipantAnswers = [];
  }
}
