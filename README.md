# Anket Yönetim Sistemi

Angular (Frontend), Node.js (Backend) ve PostgreSQL (Veritabanı) kullanılarak geliştirilmiş, kurumsal ihtiyaçlara yönelik kapsamlı bir anket yönetim platformudur.

Bu proje ile şunları yapabilirsiniz:
- **Dinamik Anketler Oluşturma:** Çoktan seçmeli, açık uçlu, puanlamalı gibi farklı soru tipleriyle anketler hazırlayın.
- **Hedef Kitle Belirleme:** Anketleri belirli departmanlara atayın.
- **Detaylı Raporlama:** Katılım oranlarını ve cevap dağılımlarını grafiklerle analiz edin.
- **Güvenli Erişim:** Rol tabanlı yetkilendirme ile kimin hangi verilere erişebileceğini kontrol edin.

## Kurulum

Projeyi indirdikten sonra hem frontend hem de backend bağımlılıklarını yükleyin:

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## Yapılandırma (.env ve Ortam Değişkenleri)

Projenin çalışabilmesi için veritabanı ve ortam değişkenlerinin ayarlanması gerekmektedir.

### 1. Backend Yapılandırması
`backend/.env` dosyası proje ile birlikte gelmektedir. **Bu dosyayı kendi yerel ayarlarınıza göre düzenleyin.**

Özellikle dikkat edilmesi gerekenler:
- **Veritabanı Ayarları:** `DB_HOST`, `DB_USER`, `DB_PASSWORD` alanlarını kendi PostgreSQL kurulumunuza göre güncelleyin.
- **Güvenlik:** `JWT_SECRET` anahtarını tahmin edilmesi zor, güvenli bir değerle değiştirmeniz **önemle tavsiye edilir**.

### 2. Frontend Yapılandırması
Frontend API bağlantı ayarları `frontend/src/environments/` klasöründedir.
- Eğer backend farklı bir portta veya sunucuda çalışıyorsa, `environment.ts` ve `environment.development.ts` dosyalarındaki `apiUrl` değerini buna göre güncelleyin.

## Veritabanı Kurulumu

1. PostgreSQL'de boş bir veritabanı oluşturun.
2. `db/create_scripts.sql` dosyasını çalıştırarak tabloları oluşturun.
3. `db/init_schema.sql` dosyasını çalıştırarak test verilerini ve varsayılan yetkileri yükleyin.

## Yetkilendirme Sistemi

Sistemde **Çoklu Yetki (RBAC)** yapısı bulunmaktadır. Bir kullanıcı birden fazla yetkiye sahip olabilir (Örn: Hem `anket_yonetimi` hem `anket_raporlama`).

### Mevcut Yetkiler ve Erişim Hakları

| Yetki Kodu | Açıklama | Erişim Hakları |
|------------|----------|----------------|
| `admin` | Sistem Yöneticisi | Tüm sayfalara ve özelliklere tam erişim sağlar. |
| `anket_yonetimi` | Anket Yöneticisi | Yeni anket oluşturabilir, düzenleyebilir, silebilir ve anketleri yayınlayabilir. |
| `anket_raporlama` | Rapor Görüntüleyici | Tamamlanan anketlerin sonuçlarını ve istatistiklerini görüntüleyebilir. |
| `kullanici` | Standart Kullanıcı | Kendisine atanan anketleri görüntüleyebilir ve cevaplayabilir. |

Sisteme yeni bir yetki eklemek (örneğin: `ozel_rapor_goruntuleme`) için veritabanından başlayıp frontend'e kadar 4 adımı takip etmeniz gerekir.

### Yeni Bir Yetki Nasıl Eklenir veya Değiştirilir?

#### 1 - Yetkiyi Tanımlayın (Veritabanı)

İlk olarak yeni yetkiyi `gk_yetki_list` tablosuna ekleyin.

```sql
INSERT INTO gk_yetki_list (rol_adi) VALUES ('ozel_rapor_goruntuleme');
```

Ardından bu yetkiyi kullanıcılara atamak için `gk_yetkilendirme` tablosunu kullanın:

```sql
-- Örnek: Sicil 1001 olan kullanıcıya yetki atama
INSERT INTO gk_yetkilendirme (user_id, rol_id)
SELECT 
  (SELECT id FROM portal_user WHERE sicil = 1001),
  (SELECT id FROM gk_yetki_list WHERE rol_adi = 'ozel_rapor_goruntuleme')
WHERE NOT EXISTS (
  SELECT 1 FROM gk_yetkilendirme gy
  WHERE gy.user_id = (SELECT id FROM portal_user WHERE sicil = 1001)
    AND gy.rol_id = (SELECT id FROM gk_yetki_list WHERE rol_adi = 'ozel_rapor_goruntuleme')
);
```

---

#### 2 - Backend'de API Endpoint'ini Koruyun

Backend'de `checkRole` middleware'ini kullanarak endpoint'leri koruyun.

```javascript
// backend/index.js
// Sadece 'admin' veya 'ozel_rapor_goruntuleme' yetkisi olanlar erişebilir
app.get('/api/ozel-raporlar', 
  authenticateToken, 
  checkRole(['admin', 'ozel_rapor_goruntuleme']), 
  async (req, res) => { ... }
);
```

---

#### 3 - Frontend Service Metodu Ekleyin (Önerilen)

Kod tekrarını önlemek ve yönetimi kolaylaştırmak için `AuthService` içine semantik bir metod ekleyin.

```typescript
// frontend/src/app/services/auth/auth.ts
canViewSpecialReports(): boolean {
  // Admin her zaman erişebilir, veya ilgili yetkiye sahip olmalı
  return this.isAdmin() || this.hasAnyYetki(['ozel_rapor_goruntuleme']);
}
```

---

#### 4 - Frontend'de Kullanım

**A) Route Guard (Sayfa Erişimi)**

Sayfaya erişimi kısıtlamak için `auth-guard.ts` dosyasına yeni bir guard ekleyin:

```typescript
// frontend/src/app/services/auth/auth-guard.ts
export const canActivateOzelRapor: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.canViewSpecialReports()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
```

**B) HTML Template (Buton Gizleme)**

Butonları veya menüleri gizlemek için `AuthService` metodunu kullanın:

```html
<!-- frontend/src/app/components/header/header.html -->
@if (authService.canViewSpecialReports()) {
  <a routerLink="/ozel-raporlar">Özel Raporlar</a>
}
```



## ▶ Çalıştırma

```bash
# Backend (Default: http://localhost:3000)
cd backend
node index.js

# Frontend (Default: http://localhost:4200)
cd frontend
ng serve
```