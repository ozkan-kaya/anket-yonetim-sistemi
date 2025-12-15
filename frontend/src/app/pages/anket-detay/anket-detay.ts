import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { AnketService } from '../../services/anket-api/anket';
import { Anket, Soru } from '../../interfaces/anket-interface';
import { Subject, takeUntil } from 'rxjs';
import { SoruTip0 } from '../../components/soru-tipleri/soru-tip-0/soru-tip-0';
import { SoruTip1 } from '../../components/soru-tipleri/soru-tip-1/soru-tip-1';
import { SoruTip2 } from '../../components/soru-tipleri/soru-tip-2/soru-tip-2';
import { SoruTip3 } from '../../components/soru-tipleri/soru-tip-3/soru-tip-3';
import { AnketStatus, getAnketStatusFromObject } from '../../utils/date-utils';

@Component({
    selector: 'app-anket-detay',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, SoruTip0, SoruTip1, SoruTip2, SoruTip3],
    templateUrl: './anket-detay.html',
    styleUrls: ['./anket-detay.css']
})
export class AnketDetay implements OnInit, OnDestroy {
    anketId: number | null = null;
    anket: Anket | null = null;
    sorular: Soru[] = [];
    anketForm: FormGroup;
    loading = true;
    submitting = false;
    message = '';
    error = '';
    uploadsUrl = '';

    private destroy$ = new Subject<void>();

    isUpdateMode = false;
    isExpired = false;
    isNotStarted = false;
    anketStatus: AnketStatus = 'active';
    originalAnswers: any[] = [];
    canSubmit = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private anketService: AnketService,
        private fb: FormBuilder
    ) {
        this.anketForm = this.fb.group({
            cevaplar: this.fb.array([])
        });
        this.uploadsUrl = this.anketService.uploadsUrl;

        // Form her değiştiğinde buton durumunu güncelle
        this.anketForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.canSubmit = this.isFormChanged();
        });
    }

    getFileName(url: string): string {
        if (!url) return '';
        const parts = url.split('/');
        return parts[parts.length - 1];
    }

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.anketId = +id;
                this.loadAnketDetay(this.anketId);
            } else {
                this.error = 'Geçersiz anket ID.';
                this.loading = false;
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get cevaplarArray(): FormArray {
        return this.anketForm.get('cevaplar') as FormArray;
    }

    totalDepartments = 0;

    loadAnketDetay(id: number): void {
        this.loading = true;

        this.anketService.getDepartmanlar().subscribe(depts => {
            this.totalDepartments = depts.length;
        });

        this.anketService.getAnketDetay(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data: any) => {
                    this.anket = data.anket;
                    if (this.anket) {
                        this.anket.departmanlar = data.departmanlar.map((d: any) => d.departman_adi || d);
                    }
                    this.sorular = data.sorular || [];
                    this.isUpdateMode = data.userParticipation || false;
                    this.originalAnswers = data.existingAnswers || [];

                    this.checkIfExpired();
                    this.initForm(this.originalAnswers);

                    // Başlamamış veya süresi dolmuş anketlerde formu disable et
                    if (this.isNotStarted || this.isExpired) {
                        this.anketForm.disable();
                    }

                    this.canSubmit = this.isFormChanged();
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Anket detayı yüklenirken hata:', err);
                    this.error = 'Anket bulunamadı veya yüklenirken bir hata oluştu.';
                    this.loading = false;
                }
            });
    }

    checkIfExpired(): void {
        if (!this.anket) {
            return;
        }

        this.anketStatus = getAnketStatusFromObject(this.anket);
        this.isNotStarted = this.anketStatus === 'not_started';
        this.isExpired = this.anketStatus === 'expired';
    }

    initForm(existingAnswers: any[] = []): void {
        this.cevaplarArray.clear();

        this.sorular.forEach(soru => {
            const validators = soru.is_imperative ? [Validators.required] : [];
            let initialValue: any = null;

            // Güncelleme modunda veya süresi dolmuşsa mevcut cevapları yükle
            if ((this.isUpdateMode || this.isExpired) && existingAnswers.length > 0) {
                const answersForQuestion = existingAnswers.filter(a => a.soru_id === soru.id);

                if (answersForQuestion.length > 0) {
                    if (soru.soru_type === 0) {
                        // Checkbox: Sadece metni eşleşenleri seç (şık değişmişse seçme)
                        const validIds: number[] = [];
                        answersForQuestion.forEach(ans => {
                            const option = soru.soruSecenekleri?.find((s: any) => s.id === ans.answer_id);
                            if (option && option.answer === ans.answer) {
                                validIds.push(ans.answer_id);
                            }
                        });
                        initialValue = validIds;
                    } else if (soru.soru_type === 1) {
                        // Radio: Metni eşleşiyorsa seç (şık değişmişse seçme)
                        const ans = answersForQuestion[0];
                        const option = soru.soruSecenekleri?.find((s: any) => s.id === ans.answer_id);
                        if (option && option.answer === ans.answer) {
                            initialValue = ans.answer_id;
                        } else {
                            initialValue = null;
                        }
                    } else if (soru.soru_type === 2) {
                        initialValue = parseInt(answersForQuestion[0].answer, 10);
                    } else {
                        initialValue = answersForQuestion[0].answer;
                    }
                }
            }

            // Checkbox için boş array
            if (soru.soru_type === 0 && initialValue === null) {
                initialValue = [];
            }

            this.cevaplarArray.push(this.fb.group({
                soru_id: [soru.id],
                soru_type: [soru.soru_type],
                answer: [initialValue, validators],
                answer_id: [null]
            }));
        });
    }

    clearAnswer(questionIndex: number): void {
        const control = this.cevaplarArray.at(questionIndex).get('answer');
        if (control) {
            control.setValue(null);
            this.canSubmit = this.isFormChanged();
        }
    }

    isFormChanged(): boolean {
        if (!this.anketForm.valid) {
            return false;
        }

        const currentAnswers = this.anketForm.value.cevaplar;

        // Zorunlu alanların dolu olup olmadığını kontrol et
        for (let i = 0; i < this.sorular.length; i++) {
            const soru = this.sorular[i];
            if (soru.is_imperative) {
                const answer = currentAnswers[i]?.answer;
                const soruType = soru.soru_type;

                if (soruType === 0 && (!Array.isArray(answer) || answer.length === 0)) {
                    return false;
                }

                if ((soruType === 1 || soruType === 2) && (answer === null || answer === undefined)) {
                    return false;
                }

                if (soruType === 3 && (!answer || answer.trim() === '')) {
                    return false;
                }
            }
        }

        if (!this.isUpdateMode) {
            return true;
        }

        // Güncelleme modunda değişiklik kontrolü
        const hasChanges = this.hasAnswerChanges(currentAnswers);
        return hasChanges;
    }

    private hasAnswerChanges(currentAnswers: any[]): boolean {
        for (let i = 0; i < currentAnswers.length; i++) {
            const current = currentAnswers[i];
            const soruId = current.soru_id;
            const soruType = current.soru_type;
            const currentAnswer = current.answer;

            const originalForQuestion = this.originalAnswers.filter(a => a.soru_id === soruId);

            if (soruType === 0) {
                const currentIds = Array.isArray(currentAnswer) ? currentAnswer.sort((a: number, b: number) => a - b) : [];
                const originalIds = originalForQuestion.map(a => a.answer_id).sort((a, b) => a - b);

                if (currentIds.length !== originalIds.length) return true;
                if (!currentIds.every((id: number, idx: number) => id === originalIds[idx])) return true;
            }
            else if (soruType === 1) {
                const originalId = originalForQuestion.length > 0 ? originalForQuestion[0].answer_id : null;
                if (currentAnswer !== originalId) return true;
            }
            else if (soruType === 2) {
                const originalValue = originalForQuestion.length > 0 ? parseInt(originalForQuestion[0].answer, 10) : null;
                if (currentAnswer !== originalValue) return true;
            }
            else {
                const originalText = originalForQuestion.length > 0 ? originalForQuestion[0].answer : '';
                const currentText = currentAnswer || '';
                if (currentText !== originalText) return true;
            }
        }

        return false;
    }

    onSubmit(): void {
        if (this.anketForm.invalid) {
            this.message = 'Lütfen tüm zorunlu alanları doldurun.';
            this.markFormGroupTouched(this.anketForm);
            return;
        }

        if (this.isUpdateMode && !this.hasAnswerChanges(this.anketForm.value.cevaplar)) {
            this.message = 'Hiçbir değişiklik yapmadınız.';
            return;
        }

        if (!this.anketId) return;

        this.submitting = true;
        this.message = '';

        const formValue = this.anketForm.value;
        const cevaplar: any[] = [];

        // Cevapları backend formatına çevir
        formValue.cevaplar.forEach((c: any) => {
            const type = c.soru_type;
            const val = c.answer;

            if (type === 0) {
                if (Array.isArray(val)) {
                    val.forEach((id: number) => {
                        cevaplar.push({
                            soru_id: c.soru_id,
                            answer: id.toString(),
                            answer_id: id
                        });
                    });
                }
            } else if (type === 1) {
                cevaplar.push({
                    soru_id: c.soru_id,
                    answer: val ? val.toString() : '',
                    answer_id: val
                });
            } else if (type === 2) {
                // Seçilen değerin answer_id'sini bul
                let answerId = null;
                const soru = this.sorular.find(s => s.id === c.soru_id);
                if (soru && soru.soruSecenekleri) {
                    // String karşılaştırması yap (backend'den string geliyor, val string veya number olabilir)
                    const secenek = soru.soruSecenekleri.find((s: any) => s.answer == val);
                    if (secenek) {
                        answerId = secenek.id;
                    }
                }

                cevaplar.push({
                    soru_id: c.soru_id,
                    answer: val ? val.toString() : '',
                    answer_id: answerId
                });
            } else {
                cevaplar.push({
                    soru_id: c.soru_id,
                    answer: val,
                    answer_id: null
                });
            }
        });

        this.anketService.cevaplaAnket(this.anketId, cevaplar)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.submitting = false;
                    const msg = this.isUpdateMode ? 'Cevaplarınız güncellendi!' : 'Anket başarıyla tamamlandı!';
                    alert(msg);
                    this.router.navigate(['/']);
                },
                error: (err) => {
                    console.error('Anket gönderilirken hata:', err);
                    this.submitting = false;
                    this.message = 'Anket gönderilirken bir hata oluştu: ' + err.message;
                }
            });
    }

    private markFormGroupTouched(formGroup: FormGroup | FormArray) {
        Object.values(formGroup.controls).forEach(control => {
            control.markAsTouched();
            if (control instanceof FormGroup || control instanceof FormArray) {
                this.markFormGroupTouched(control);
            }
        });
    }

    getAnketTur(): string {
        if (!this.anket) return '';

        switch (this.anket.anket_tur) {
            case 0:
                return 'Normal Anket';
            case 1:
                return 'Video Eğitim Anketi';
            case 2:
                return 'İç Eğitim Anketi';
            default:
                return 'Anket';
        }
    }
}
