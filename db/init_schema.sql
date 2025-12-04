-- Yetkileri ve test kullanıcılarını oluşturur

-- Yetki tanımları
INSERT INTO gk_yetki_list (rol_adi) VALUES 
  ('kullanici'),
  ('anket_raporlama'),
  ('anket_yonetimi'),
  ('admin')
ON CONFLICT DO NOTHING;

-- Test kullanıcıları (şifre: asd)
INSERT INTO portal_user (user_name, password, sicil, rol, is_active, is_delete)
VALUES 
  ('Test Kullanici', 'asd', 1001, 'kullanici', true, false),
  ('Test Raporlama', 'asd', 2001, 'yonetici', true, false),
  ('Test Anket Yonetimi', 'asd', 3001, 'kullanici', true, false),
  ('Test Admin', 'asd', 0, 'admin', true, false)
ON CONFLICT DO NOTHING;

-- Yetki atamaları
INSERT INTO gk_yetkilendirme (user_id, rol_id)
SELECT 
  (SELECT id FROM portal_user WHERE sicil = 1001),
  (SELECT id FROM gk_yetki_list WHERE rol_adi = 'kullanici')
WHERE NOT EXISTS (
  SELECT 1 FROM gk_yetkilendirme gy
  WHERE gy.user_id = (SELECT id FROM portal_user WHERE sicil = 1001)
    AND gy.rol_id = (SELECT id FROM gk_yetki_list WHERE rol_adi = 'kullanici')
);

INSERT INTO gk_yetkilendirme (user_id, rol_id)
SELECT 
  (SELECT id FROM portal_user WHERE sicil = 2001),
  (SELECT id FROM gk_yetki_list WHERE rol_adi = 'anket_raporlama')
WHERE NOT EXISTS (
  SELECT 1 FROM gk_yetkilendirme gy
  WHERE gy.user_id = (SELECT id FROM portal_user WHERE sicil = 2001)
    AND gy.rol_id = (SELECT id FROM gk_yetki_list WHERE rol_adi = 'anket_raporlama')
);

INSERT INTO gk_yetkilendirme (user_id, rol_id)
SELECT 
  (SELECT id FROM portal_user WHERE sicil = 3001),
  (SELECT id FROM gk_yetki_list WHERE rol_adi = 'anket_yonetimi')
WHERE NOT EXISTS (
  SELECT 1 FROM gk_yetkilendirme gy
  WHERE gy.user_id = (SELECT id FROM portal_user WHERE sicil = 3001)
    AND gy.rol_id = (SELECT id FROM gk_yetki_list WHERE rol_adi = 'anket_yonetimi')
);

INSERT INTO gk_yetkilendirme (user_id, rol_id)
SELECT 
  (SELECT id FROM portal_user WHERE sicil = 0),
  (SELECT id FROM gk_yetki_list WHERE rol_adi = 'admin')
WHERE NOT EXISTS (
  SELECT 1 FROM gk_yetkilendirme gy
  WHERE gy.user_id = (SELECT id FROM portal_user WHERE sicil = 0)
    AND gy.rol_id = (SELECT id FROM gk_yetki_list WHERE rol_adi = 'admin')
);

-- Doğrulama: Kullanıcıları listele
SELECT 
  u.sicil,
  u.user_name,
  u.rol as "Portal User Rolü",
  COALESCE(
    (SELECT array_agg(gyl.rol_adi ORDER BY gyl.rol_adi)
     FROM gk_yetkilendirme gy
     JOIN gk_yetki_list gyl ON gy.rol_id = gyl.id
     WHERE gy.user_id = u.id),
    ARRAY[]::text[]
  ) as "Atanmış Yetkiler"
FROM portal_user u
WHERE u.is_delete = false
ORDER BY u.sicil;
