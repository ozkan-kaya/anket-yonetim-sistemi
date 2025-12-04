export interface Anket {
    id: number;
    title: string;
    aciklama: string;
    start_date: string | Date;
    start_time: string;
    finish_date: string | Date;
    finish_time: string;
    is_active: boolean;
    is_deleted: boolean;
    status: boolean; // false: Suresi Doldu, true: Aktif
    creator_id: number;
    creator_name?: string;
    anket_tur: number; // 0: Normal, 1: Video Eğitim, 2: İç Eğitim
    soru_id?: number;
    created_date?: string | Date;
    updated_date?: string | Date;
    tamamlandi?: boolean;
    participation_date?: string | Date;
    participation_last_update?: string | Date;
    departmanlar?: Departman[];
    dokuman_url?: string;
}

export interface Departman {
    id: number;
    name: string;
}

export interface AnketBirim {
    id: number;
    department_id: number;
    anket_id: number;
    description?: string;
    is_delete: boolean;
}

export interface AnketCreateDto {
    title: string;
    aciklama: string;
    start_date: string;
    start_time: string;
    finish_date: string;
    finish_time: string;
    anket_tur?: number;
    departmanlar?: number[];
    questions?: any[];
}

export interface AnketUpdateDto {
    title?: string;
    aciklama?: string;
    start_date?: string;
    start_time?: string;
    finish_date?: string;
    finish_time?: string;
    is_active?: boolean;
    status?: boolean;
    anket_tur?: number;
    departmanlar?: number[];
    questions?: Soru[];
}

export interface Soru {
    id: number;
    title: string;
    duration?: string;
    soru_type: number; // 0: Çoktan Seçmeli, 1: Tekil Seçim, 2: Doğrusal Ölçek, 3: Açık Uçlu
    is_imperative: boolean;
    anket_id: number;
    dokuman_url?: string;
    is_deleted: boolean;
    is_active: boolean;
    created_date?: string | Date;
    updated_date?: string | Date;
    soruSecenekleri?: SoruSecenegi[];
}

export interface SoruSecenegi {
    id: number;
    soru_id: number;
    answer: string;
    is_correct: boolean;
    is_deleted: boolean;
    is_active: boolean;
}