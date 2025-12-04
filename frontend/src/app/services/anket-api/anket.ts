import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Anket, AnketCreateDto, AnketUpdateDto } from '../../interfaces/anket-interface';

@Injectable({
    providedIn: 'root'
})
export class AnketService {

    private baseApiUrl = `${environment.apiUrl}/api`;
    private anketlerApiUrl = `${this.baseApiUrl}/anketler`;
    private raporlarApiUrl = `${this.baseApiUrl}/raporlar`;
    private sorularApiUrl = `${this.baseApiUrl}/sorular`;

    public get uploadsUrl(): string {
        return `${environment.apiUrl}/uploads`;
    }

    constructor(private http: HttpClient) { }

    getDepartmanlar(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseApiUrl}/departmanlar`);
    }

    getAnketler(): Observable<Anket[]> {
        return this.http.get<Anket[]>(this.anketlerApiUrl);
    }

    getBenimAnketlerim(): Observable<Anket[]> {
        return this.http.get<Anket[]>(`${this.anketlerApiUrl}/benim`);
    }

    getKatildigimAnketler(): Observable<Anket[]> {
        return this.http.get<Anket[]>(`${this.anketlerApiUrl}/katildigim`);
    }

    getAnketDetay(id: number): Observable<{ anket: Anket, sorular: any[] }> {
        return this.http.get<{ anket: Anket, sorular: any[] }>(`${this.anketlerApiUrl}/${id}`);
    }

    addAnket(anketData: AnketCreateDto): Observable<any> {
        return this.http.post<any>(this.anketlerApiUrl, anketData);
    }

    updateAnket(id: number, anketData: AnketUpdateDto): Observable<any> {
        return this.http.put<any>(`${this.anketlerApiUrl}/${id}`, anketData);
    }

    deleteAnket(id: number): Observable<any> {
        return this.http.delete<any>(`${this.anketlerApiUrl}/${id}`);
    }

    addSoru(anketId: number, soruData: FormData): Observable<any> {
        return this.http.post<any>(`${this.anketlerApiUrl}/${anketId}/sorular`, soruData);
    }

    updateSoru(id: number, soruData: any): Observable<any> {
        return this.http.put<any>(`${this.sorularApiUrl}/${id}`, soruData);
    }

    deleteSoru(id: number): Observable<any> {
        return this.http.delete<any>(`${this.sorularApiUrl}/${id}`);
    }

    uploadAnketDokuman(anketId: number, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('dosya', file);
        return this.http.post<any>(`${this.anketlerApiUrl}/${anketId}/dokuman`, formData);
    }

    uploadSoruDokuman(soruId: number, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('dosya', file);
        return this.http.post<any>(`${this.sorularApiUrl}/${soruId}/dokuman`, formData);
    }

    cevaplaAnket(anketId: number, cevaplar: any[]): Observable<any> {
        return this.http.post<any>(`${this.anketlerApiUrl}/${anketId}/cevapla`, { cevaplar });
    }

    getAnketIstatistik(id: number): Observable<any> {
        return this.http.get<any>(`${this.raporlarApiUrl}/anket-istatistik/${id}`);
    }

    getAnketKatilimcilar(id: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.raporlarApiUrl}/anket-katilimcilar/${id}`);
    }

    getKatilimciCevaplari(anketUserId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.raporlarApiUrl}/katilimci-cevaplari/${anketUserId}`);
    }
}
