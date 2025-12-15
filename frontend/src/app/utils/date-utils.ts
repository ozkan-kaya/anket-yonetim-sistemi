// Anket Tarih Utility Fonksiyonları, Anket durumlarını hesaplamak için kullanılır

export type AnketStatus = 'not_started' | 'active' | 'expired';

export function combineDateAndTime(date: string | Date | null | undefined, time: string | null | undefined): Date {
    if (!date || !time) {
        return new Date(0); // Invalid date
    }

    // Tarih string'ini al
    let dateStr: string;
    if (typeof date === 'string') {
        dateStr = date.split('T')[0];
    } else {
        dateStr = date.toISOString().split('T')[0];
    }

    let timeStr = '00:00';
    if (typeof time === 'string' && time.length >= 5) {
        timeStr = time.substring(0, 5);
    }

    // Date objesi oluştur
    const result = new Date(`${dateStr}T${timeStr}:00`);

    // Geçersiz tarih kontrolü
    if (isNaN(result.getTime())) {
        console.warn('Invalid date created:', dateStr, timeStr);
        return new Date(0);
    }

    return result;
}

// Anket durumunu hesaplar, true: ise aktif doner, false ise not_started veya expired
export function getAnketStatus(
    startDate: string | Date | null | undefined,
    startTime: string | null | undefined,
    finishDate: string | Date | null | undefined,
    finishTime: string | null | undefined
): AnketStatus {
    const now = new Date();
    const start = combineDateAndTime(startDate, startTime);
    const finish = combineDateAndTime(finishDate, finishTime);

    // Geçersiz tarihler varsa expired olarak işaretle
    if (start.getTime() === 0 || finish.getTime() === 0) {
        return 'expired';
    }

    if (now < start) {
        return 'not_started';
    } else if (now > finish) {
        return 'expired';
    } else {
        return 'active';
    }
}

export function getAnketStatusFromObject(anket: any): AnketStatus {
    if (!anket) return 'expired';

    // Veritabanındaki is_active flag'ini kontrol et
    if (anket.is_active === true) {
        return 'active';
    }

    return getAnketStatus(
        anket.start_date,
        anket.start_time,
        anket.finish_date,
        anket.finish_time
    );
}

export function isAnketActive(anket: any): boolean {
    return getAnketStatusFromObject(anket) === 'active';
}

export function isAnketNotStarted(anket: any): boolean {
    return getAnketStatusFromObject(anket) === 'not_started';
}

export function isAnketExpired(anket: any): boolean {
    return getAnketStatusFromObject(anket) === 'expired';
}

export function isStartDateInvalid(
    startDate: string | Date | null | undefined,
    startTime: string | null | undefined,
    finishDate: string | Date | null | undefined,
    finishTime: string | null | undefined
): boolean {
    const start = combineDateAndTime(startDate, startTime);
    const finish = combineDateAndTime(finishDate, finishTime);

    // Geçersiz tarihler varsa false dön
    if (start.getTime() === 0 || finish.getTime() === 0) {
        return false;
    }

    return start >= finish;
}

export function getAnketStatusLabel(status: AnketStatus): string {
    switch (status) {
        case 'not_started':
            return 'Henüz Başlamadı';
        case 'active':
            return 'Aktif';
        case 'expired':
            return 'Süresi Doldu';
    }
}

export function getAnketStatusClass(status: AnketStatus): string {
    switch (status) {
        case 'not_started':
            return 'is-warning';
        case 'active':
            return 'is-info';
        case 'expired':
            return 'is-danger';
    }
}
