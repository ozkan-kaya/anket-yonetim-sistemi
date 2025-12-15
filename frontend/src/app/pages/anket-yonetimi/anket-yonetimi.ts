import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AnketService } from '../../services/anket-api/anket';
import { AuthService } from '../../services/auth/auth';
import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Anket, AnketCreateDto, AnketUpdateDto, Departman } from '../../interfaces/anket-interface';
import { getAnketStatusFromObject, getAnketStatusLabel, getAnketStatusClass, isStartDateInvalid, AnketStatus } from '../../utils/date-utils';

@Component({
  selector: 'app-anket-yonetimi',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, FormsModule, SlicePipe, CommonModule],
  templateUrl: './anket-yonetimi.html',
  styleUrl: './anket-yonetimi.css'
})
export class AnketYonetimi implements OnInit, OnDestroy {
  anketForm: FormGroup;
  uploading = false;
  message = '';

  anketler: Anket[] = [];
  filteredAnketler: Anket[] = [];
  departmanlar: Departman[] = [];
  isModalActive = false;
  isEditMode = false;
  editingId: number | null = null;
  currentUserId: number | null = null;

  searchQuery = '';
  private searchChange$ = new Subject<string>();
  private searchSub?: Subscription;

  sortOrder: 'id-asc' | 'id-desc' | 'new-to-old' | 'old-to-new' = 'id-desc';

  questions: any[] = [];
  originalQuestions: any[] = [];
  originalFormValue: any = null;
  questionTypes = [
    { value: 0, label: 'Çoktan Seçmeli' },
    { value: 1, label: 'Tekil Seçim' },
    { value: 2, label: 'Doğrusal Ölçek' },
    { value: 3, label: 'Açık Uçlu (Metin)' }
  ];
  selectedQuestionType: number = 0;

  get isQuestionsDirty(): boolean {
    return JSON.stringify(this.questions) !== JSON.stringify(this.originalQuestions);
  }

  get isFormChanged(): boolean {
    if (!this.originalFormValue) return false;

    const current = this.anketForm.getRawValue();
    const original = this.originalFormValue;

    if (current.title !== original.title ||
      current.aciklama !== original.aciklama ||
      current.start_date !== original.start_date ||
      current.start_time !== original.start_time ||
      current.finish_date !== original.finish_date ||
      current.finish_time !== original.finish_time ||
      current.anket_tur !== original.anket_tur) {
      return true;
    }

    // Departman karşılaştırması (sıralama bağımsız)
    const currentDepts = [...(current.departmanlar || [])].sort((a: number, b: number) => a - b);
    const originalDepts = [...(original.departmanlar || [])].sort((a: number, b: number) => a - b);

    return JSON.stringify(currentDepts) !== JSON.stringify(originalDepts);
  }

  get isFormDirtyOrFileSelected(): boolean {
    return this.isFormChanged ||
      this.isQuestionsDirty ||
      !!this.selectedAnketFile ||
      this.questions.some(q => q.selectedFile);
  }

  get isScaleQuestionsValid(): boolean {
    // Doğrusal ölçek sorularını kontrol et
    for (const question of this.questions) {
      if (question.soru_type === 2) {
        const start = question.scaleStart;
        const end = question.scaleEnd;

        // Başlangıç veya bitiş boş ise geçersiz
        if (start === null || start === undefined || start === '' ||
          end === null || end === undefined || end === '') {
          return false;
        }

        // Başlangıç bitiş'ten büyük ise geçersiz
        if (Number(start) > Number(end)) {
          return false;
        }
      }
    }
    return true;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private anketService: AnketService,
    private authService: AuthService
  ) {
    this.anketForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(75)]],
      aciklama: ['', Validators.required],
      start_date: ['', Validators.required],
      start_time: ['', Validators.required],
      finish_date: ['', Validators.required],
      finish_time: ['', Validators.required],
      departmanlar: [[], Validators.required],
      anket_tur: [0, Validators.required]
    });
  }

  get titleControl() {
    return this.anketForm.get('title');
  }

  // Durum gösterimi için yardımcı metodlar
  getAnketStatus(anket: Anket): AnketStatus {
    return getAnketStatusFromObject(anket);
  }

  getStatusLabel(anket: Anket): string {
    return getAnketStatusLabel(this.getAnketStatus(anket));
  }

  getStatusClass(anket: Anket): string {
    return getAnketStatusClass(this.getAnketStatus(anket));
  }

  // Form tarih validasyonu
  get isDateRangeInvalid(): boolean {
    const startDate = this.anketForm.get('start_date')?.value;
    const startTime = this.anketForm.get('start_time')?.value;
    const finishDate = this.anketForm.get('finish_date')?.value;
    const finishTime = this.anketForm.get('finish_time')?.value;

    if (!startDate || !startTime || !finishDate || !finishTime) {
      return false; // Henüz tüm alanlar doldurulmadı
    }

    return isStartDateInvalid(startDate, startTime, finishDate, finishTime);
  }

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        if (user && user.id) {
          this.currentUserId = user.id;
        }
      }
    });

    this.loadDepartmanlar();
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDepartmanlar(): void {
    this.anketService.getDepartmanlar().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.departmanlar = data;
      },
      error: (error) => {
        console.error('Departmanlar yüklenirken hata:', error);
        this.message = 'Departmanlar yüklenirken hata oluştu.';
      }
    });
  }

  loadAnketler(): void {
    this.anketService.getAnketler().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: Anket[]) => {
        this.anketler = data;
        this.applySearchAndSort();
      },
      error: (error) => {
        console.error('Anketler yüklenirken hata:', error);
        this.message = 'Anketler yüklenirken hata oluştu: ' + error.message;
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
      this.filteredAnketler = this.anketler.filter(anket => {
        return anket.title?.toLowerCase().includes(query) ||
          anket.aciklama?.toLowerCase().includes(query) ||
          anket.id?.toString().includes(query);
      });
    } else {
      this.filteredAnketler = [...this.anketler];
    }

    this.sortFilteredList();
  }

  private sortFilteredList(): void {
    switch (this.sortOrder) {
      case 'id-asc':
        this.filteredAnketler.sort((a, b) => (a.id || 0) - (b.id || 0));
        break;
      case 'id-desc':
        this.filteredAnketler.sort((a, b) => (b.id || 0) - (a.id || 0));
        break;
      case 'new-to-old':
        this.filteredAnketler.sort((a, b) =>
          new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()
        );
        break;
      case 'old-to-new':
        this.filteredAnketler.sort((a, b) =>
          new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()
        );
        break;
    }
  }

  addQuestion(): void {
    const newQuestion: any = {
      title: '',
      soru_type: this.selectedQuestionType,
      is_imperative: true,
      soruSecenekleri: []
    };

    // Seçenekli soru tipi için varsayılan seçenek ekle
    if (this.selectedQuestionType === 0 || this.selectedQuestionType === 1) {
      newQuestion.soruSecenekleri.push({ answer: '' });
    }

    // Doğrusal ölçek için varsayılan aralık ve seçenekler
    if (this.selectedQuestionType === 2) {
      newQuestion.scaleStart = 1;
      newQuestion.scaleEnd = 5;
      // Varsayılan 1-5 seçeneklerini oluştur
      for (let i = 1; i <= 5; i++) {
        newQuestion.soruSecenekleri.push({ answer: i.toString() });
      }
    }

    this.questions.push(newQuestion);
  }

  generateScaleOptions(questionIndex: number): void {
    const question = this.questions[questionIndex];
    if (question.soru_type !== 2) return;

    const start = parseInt(question.scaleStart, 10) || 0;
    const end = parseInt(question.scaleEnd, 10) || 0;

    // Geçersiz aralık kontrolü
    if (start > end || start < 0 || end < 0) return;

    // Mevcut seçenekleri temizle (yeni olanları koru, sadece answer değerlerini güncelle)
    question.soruSecenekleri = [];

    // Aralık için yeni seçenekler oluştur
    for (let i = start; i <= end; i++) {
      question.soruSecenekleri.push({ answer: i.toString() });
    }
  }

  removeQuestion(index: number): void {
    this.questions.splice(index, 1);
  }

  addOption(questionIndex: number): void {
    this.questions[questionIndex].soruSecenekleri.push({ answer: '' });
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    this.questions[questionIndex].soruSecenekleri.splice(optionIndex, 1);
  }

  openModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.message = '';
    this.questions = [];
    this.originalQuestions = [];
    this.anketForm.reset({ departmanlar: [] });
    this.anketForm.markAsPristine();
    this.anketForm.markAsUntouched();
    this.isModalActive = true;
  }

  openUpdateModal(anket: Anket): void {
    this.isEditMode = true;
    this.editingId = anket.id;
    this.message = 'Yükleniyor...';
    this.isModalActive = true;
    this.anketForm.disable();

    this.anketService.getAnketDetay(anket.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.anketForm.enable();
        this.message = '';

        const anketData = data.anket;
        const departmanlar = (data.departmanlar || []).map((d: any) => d.id || d);
        this.questions = data.sorular || [];

        const startDate = anketData.start_date;
        const finishDate = anketData.finish_date;
        const startTime = anketData.start_time ? anketData.start_time.substring(0, 5) : '';
        const finishTime = anketData.finish_time ? anketData.finish_time.substring(0, 5) : '';

        this.anketForm.reset();
        this.anketForm.patchValue({
          title: anketData.title,
          aciklama: anketData.aciklama,
          start_date: startDate,
          start_time: startTime,
          finish_date: finishDate,
          finish_time: finishTime,
          departmanlar: departmanlar,
          anket_tur: anketData.anket_tur
        });

        // Dosya adlarını göster
        if (anketData.dokuman_url) {
          const parts = anketData.dokuman_url.split(/[/\\]/);
          this.selectedAnketFileName = parts[parts.length - 1];
        } else {
          this.selectedAnketFileName = null;
        }

        this.questions.forEach(q => {
          if (q.dokuman_url) {
            const parts = q.dokuman_url.split(/[/\\]/);
            q.selectedFileName = parts[parts.length - 1];
          }

          // Doğrusal ölçek için scaleStart ve scaleEnd değerlerini hesapla
          if (q.soru_type === 2 && q.soruSecenekleri && q.soruSecenekleri.length > 0) {
            const values = q.soruSecenekleri
              .map((s: any) => parseInt(s.answer, 10))
              .filter((v: number) => !isNaN(v))
              .sort((a: number, b: number) => a - b);

            if (values.length > 0) {
              q.scaleStart = values[0];
              q.scaleEnd = values[values.length - 1];
            } else {
              q.scaleStart = 1;
              q.scaleEnd = 5;
            }
          }
        });

        this.originalQuestions = JSON.parse(JSON.stringify(this.questions));
        this.originalFormValue = this.anketForm.getRawValue();

        this.anketForm.markAsPristine();
        this.anketForm.markAsUntouched();
      },
      error: (err) => {
        console.error(err);
        this.message = 'Anket detayları yüklenemedi.';
        this.anketForm.enable();
      }
    });
  }

  closeModal(): void {
    this.isModalActive = false;
    this.isEditMode = false;
    this.editingId = null;
    this.questions = [];
    this.originalQuestions = [];
    this.originalFormValue = null;
    this.anketForm.reset();
    this.anketForm.markAsPristine();
    this.anketForm.markAsUntouched();
    this.message = '';

    this.selectedAnketFile = null;
    this.selectedAnketFileName = null;
  }

  selectedAnketFile: File | null = null;
  selectedAnketFileName: string | null = null;

  onAnketFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedAnketFile = file;
      this.selectedAnketFileName = file.name;
    }
  }

  onQuestionFileSelected(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      this.questions[index].selectedFile = file;
      this.questions[index].selectedFileName = file.name;
    }
  }

  onSubmit(): void {
    if (this.anketForm.invalid) {
      this.message = 'Lütfen tüm zorunlu alanları doldurun.';
      return;
    }

    if (this.questions.length === 0) {
      this.message = 'Lütfen en az bir soru ekleyin.';
      return;
    }

    this.uploading = true;
    this.message = 'İşlem yürütülüyor...';

    const formValue = this.anketForm.value;
    let anketObservable;
    let isUpdate = false;

    if (this.isEditMode && this.editingId) {
      isUpdate = true;
      const updateData: AnketUpdateDto = {
        title: formValue.title,
        aciklama: formValue.aciklama,
        start_date: formValue.start_date,
        start_time: formValue.start_time,
        finish_date: formValue.finish_date,
        finish_time: formValue.finish_time,
        is_active: true,
        status: true,
        anket_tur: formValue.anket_tur,
        departmanlar: formValue.departmanlar,
        questions: this.questions
      };
      anketObservable = this.anketService.updateAnket(this.editingId, updateData);
    } else {
      const createData: AnketCreateDto = {
        title: formValue.title,
        aciklama: formValue.aciklama,
        start_date: formValue.start_date,
        start_time: formValue.start_time,
        finish_date: formValue.finish_date,
        finish_time: formValue.finish_time,
        departmanlar: formValue.departmanlar,
        questions: this.questions
      };
      anketObservable = this.anketService.addAnket(createData);
    }

    anketObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const anketId = isUpdate ? this.editingId! : response.anketId;
          this.handleFileUploads(anketId);
        },
        error: (error: any) => {
          this.uploading = false;
          this.message = 'Hata oluştu: ' + error.message;
        }
      });
  }

  private handleFileUploads(anketId: number): void {
    this.message = 'Dosyalar yükleniyor...';

    const uploadPromises: Promise<any>[] = [];

    if (this.selectedAnketFile) {
      uploadPromises.push(this.anketService.uploadAnketDokuman(anketId, this.selectedAnketFile).toPromise());
    }

    // Soru dosyalarını yüklemek için güncel soru ID'lerini al
    this.anketService.getAnketDetay(anketId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        const fetchedQuestions = data.sorular || [];

        this.questions.forEach((q, index) => {
          if (q.selectedFile) {
            let targetQuestionId = q.id;
            if (!targetQuestionId && index < fetchedQuestions.length) {
              targetQuestionId = fetchedQuestions[index].id;
            }

            if (targetQuestionId) {
              uploadPromises.push(this.anketService.uploadSoruDokuman(targetQuestionId, q.selectedFile).toPromise());
            }
          }
        });

        Promise.all(uploadPromises)
          .then(() => {
            this.uploading = false;
            this.message = 'İşlem başarıyla tamamlandı!';
            this.loadAnketler();
            setTimeout(() => this.closeModal(), 1500);
          })
          .catch(err => {
            console.error(err);
            this.uploading = false;
            this.message = 'Anket kaydedildi ancak bazı dosyalar yüklenemedi.';
            this.loadAnketler();
            setTimeout(() => this.closeModal(), 2000);
          });
      },
      error: (err) => {
        console.error(err);
        this.uploading = false;
        this.message = 'Soru detayları alınamadı, dosyalar yüklenemedi.';
      }
    });
  }

  deleteAnket(id: number, title: string): void {
    if (confirm(`'${title}' başlıklı anketi silmek istediğinizden emin misiniz?`)) {
      this.anketService.deleteAnket(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.message = 'Anket başarıyla silindi!';
          this.loadAnketler();
        },
        error: (error) => {
          this.message = 'Anket silinirken bir hata oluştu: ' + error.message;
        }
      });
    }
  }

  isDepartmentSelected(id: number): boolean {
    const selectedDepartments = this.anketForm.get('departmanlar')?.value || [];
    return selectedDepartments.includes(id);
  }

  toggleDepartment(id: number): void {
    const currentSelection = this.anketForm.get('departmanlar')?.value || [];
    const index = currentSelection.indexOf(id);

    if (index > -1) {
      currentSelection.splice(index, 1);
    } else {
      currentSelection.push(id);
    }

    this.anketForm.patchValue({ departmanlar: currentSelection });
    this.anketForm.markAsDirty();
  }

  selectAllDepartments(): void {
    const allIds = this.departmanlar.map(d => d.id);
    this.anketForm.patchValue({ departmanlar: allIds });
    this.anketForm.markAsDirty();
  }

  deselectAllDepartments(): void {
    this.anketForm.patchValue({ departmanlar: [] });
    this.anketForm.markAsDirty();
  }
}
