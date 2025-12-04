const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const PORT = process.env.PORT || 3000;
const ADDRESS = process.env.ADDRESS || 'http://localhost';
const BASE_URL = `${ADDRESS}:${PORT}`;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB bağlantısı
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('PostgreSQL bağlantı havuzu oluşturuldu.');

// Dosya yükleme
const upload = multer({ storage: multer.memoryStorage() });

// MIDDLEWARE

// Token doğrulama
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Yetkisiz: Token gerekli.' });
  }

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      return res.status(403).json({ message: 'Geçersiz Token.' });
    }
    req.user = userPayload;
    next();
  });
}

// Yetki kontrolü (çoklu yetki desteği)
function checkRole(requiredYetkiler) {
  return (req, res, next) => {
    const userYetkiler = req.user.yetkiler || [];
    const hasPermission = requiredYetkiler.some(yetki => userYetkiler.includes(yetki));

    if (!hasPermission) {
      return res.status(403).json({ message: 'Yetersiz yetki: Bu işlemi yapamazsınız.' });
    }
    next();
  }
}

// YARDIMCI FONKSİYONLAR

function getSoruDirectory(anketId) {
  return path.join(__dirname, 'uploads', 'anket_dokuman', anketId.toString());
}

function getAnketDirectory(anketId) {
  return path.join(__dirname, 'uploads', 'anket_dokuman', anketId.toString());
}

// AUTH

// Giriş
app.post('/auth/login', async (req, res) => {
  try {
    const { sicil, sifre } = req.body;
    if (!sicil || !sifre) return res.status(400).json({ message: 'Sicil ve şifre zorunludur.' });

    const userResult = await pool.query(
      'SELECT * FROM portal_user WHERE sicil = $1 AND is_delete = false',
      [sicil]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı veya pasif.' });
    }

    const user = userResult.rows[0];
    if (sifre !== user.password) {
      return res.status(401).json({ message: 'Hatalı şifre.' });
    }

    // Kullanıcının yetkilerini gk_yetkilendirme tablosundan çek
    const yetkilerResult = await pool.query(
      `SELECT array_agg(gyl.rol_adi) as yetkiler
       FROM gk_yetkilendirme gy
       JOIN gk_yetki_list gyl ON gy.rol_id = gyl.id
       WHERE gy.user_id = $1`,
      [user.id]
    );

    const yetkiler = yetkilerResult.rows[0]?.yetkiler || [];
    const yetki = yetkiler.length > 0 ? yetkiler[0] : 'kullanici'; // İlk yetki veya varsayılan

    const token = jwt.sign(
      { id: user.id, yetki: yetki, yetkiler: yetkiler, isim: user.user_name },
      JWT_SECRET,
      { expiresIn: '10h' }
    );

    res.json({
      message: 'Giriş başarılı!',
      token: token,
      user: {
        id: user.id,
        sicil: user.sicil,
        isim: user.user_name,
        rol: user.rol,  // portal_user'daki rol
        yetki: yetki,
        yetkiler: yetkiler
      }
    });
  } catch (err) {
    console.error('Login hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Profil
app.get('/api/auth/profil', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, sicil, user_name, rol FROM portal_user WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    const user = userResult.rows[0];

    // Kullanıcının yetkilerini gk_yetkilendirme tablosundan çek
    const yetkilerResult = await pool.query(
      `SELECT array_agg(gyl.rol_adi) as yetkiler
       FROM gk_yetkilendirme gy
       JOIN gk_yetki_list gyl ON gy.rol_id = gyl.id
       WHERE gy.user_id = $1`,
      [user.id]
    );

    const yetkiler = yetkilerResult.rows[0]?.yetkiler || [];
    const yetki = yetkiler.length > 0 ? yetkiler[0] : 'kullanici';

    res.json({
      id: user.id,
      sicil: user.sicil,
      isim: user.user_name,
      rol: user.rol,  // portal_user'daki rol
      yetki: yetki,
      yetkiler: yetkiler
    });
  } catch (err) {
    console.error('Profil bilgisi alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Departmanlar
app.get('/api/departmanlar', authenticateToken, async (req, res) => {
  try {
    const departmanResult = await pool.query('SELECT id, departman_adi as name FROM portal_departman ORDER BY departman_adi ASC');
    res.json(departmanResult.rows);
  } catch (err) {
    console.error('Departmanlar alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ANKET İŞLEMLERİ

// Anket Listesi
app.get('/api/anketler', authenticateToken, async (req, res) => {
  try {
    // Süresi dolanları pasife çek
    await pool.query(
      `UPDATE portal_anket 
       SET status = false 
       WHERE to_timestamp(to_char(finish_date, 'YYYY-MM-DD') || ' ' || finish_time, 'YYYY-MM-DD HH24:MI') < NOW() 
       AND status = true`
    );

    const privilegedYetkiler = ['admin', 'anket_yonetimi', 'anket_raporlama'];
    const userYetkiler = req.user.yetkiler || [];
    const isPrivileged = privilegedYetkiler.some(yetki => userYetkiler.includes(yetki));

    let query = `
      SELECT A.*, U.user_name as creator_name,
             EXISTS(
               SELECT 1 FROM portal_anket_user AU
               WHERE AU.anket_id = A.id AND AU.user_id = $1
             ) as tamamlandi,
             (
               SELECT COALESCE(json_agg(json_build_object('id', D.id, 'departman_adi', D.departman_adi)), '[]'::json)
               FROM portal_anket_birim AB 
               JOIN portal_departman D ON AB.department_id = D.id
               WHERE AB.anket_id = A.id AND AB.is_delete = false
             ) as departmanlar
      FROM portal_anket A
      LEFT JOIN portal_user U ON A.creator_id = U.id
      WHERE A.is_deleted = false
    `;

    const queryParams = [req.user.id];

    if (!isPrivileged) {
      // Standart kullanıcı: Sadece aktif ve kendi departmanındaki anketler
      query += ` AND A.status = true`;

      query += ` AND EXISTS (
        SELECT 1 
        FROM portal_anket_birim AB
        INNER JOIN portal_departman_users PDU ON AB.department_id = PDU.department_id
        INNER JOIN portal_user PU ON PDU.sicil = PU.sicil
        WHERE AB.anket_id = A.id 
          AND PU.id = $1
          AND AB.is_delete = false 
          AND PDU.is_delete = false 
          AND PDU.is_active = true
      )`;
    }

    query += ` ORDER BY A.id DESC`;

    const anketListResult = await pool.query(query, queryParams);

    res.json(anketListResult.rows);
  } catch (err) {
    console.error('Anketler alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Kullanıcının katilabilecegi anketler (Kullanıcının dahil olduğu departman(lar)a gönderilmiş anketler)

app.get('/api/anketler/benim', authenticateToken, async (req, res) => {
  try {
    const myAnketResult = await pool.query(
      `SELECT DISTINCT A.*, U.user_name as creator_name,
              EXISTS(
                SELECT 1 FROM portal_anket_user AU
                WHERE AU.anket_id = A.id AND AU.user_id = $1
              ) as tamamlandi
       FROM portal_anket A
       LEFT JOIN portal_user U ON A.creator_id = U.id
       INNER JOIN portal_anket_birim AB ON A.id = AB.anket_id
       INNER JOIN portal_user PU ON PU.id = $1
       INNER JOIN portal_departman_users PDU ON PDU.sicil = PU.sicil
       WHERE A.is_deleted = false
         AND A.status = true
         AND AB.is_delete = false
         AND PDU.is_delete = false
         AND PDU.is_active = true
         AND PDU.department_id = AB.department_id
       ORDER BY A.id DESC`,
      [req.user.id]
    );

    res.json(myAnketResult.rows);
  } catch (err) {
    console.error('Kullanıcı anketleri alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Katıldığım Anketler
app.get('/api/anketler/katildigim', authenticateToken, async (req, res) => {
  try {
    const participatedAnketResult = await pool.query(
      `SELECT A.*, U.user_name as creator_name, true as tamamlandi,
              AU.created_date as participation_date,
              AU.update_date as participation_last_update
       FROM portal_anket A
       INNER JOIN portal_anket_user AU ON A.id = AU.anket_id
       LEFT JOIN portal_user U ON A.creator_id = U.id
       WHERE AU.user_id = $1 AND A.is_deleted = false
       ORDER BY A.id DESC`,
      [req.user.id]
    );

    res.json(participatedAnketResult.rows);
  } catch (err) {
    console.error('Katıldığım anketler alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Anket Detayı
app.get('/api/anketler/:id', authenticateToken, async (req, res) => {
  try {
    const anketId = parseInt(req.params.id, 10);

    // Süresi dolanı pasife çek
    await pool.query(
      `UPDATE portal_anket 
       SET status = false 
       WHERE id = $1 
       AND to_timestamp(to_char(finish_date, 'YYYY-MM-DD') || ' ' || finish_time, 'YYYY-MM-DD HH24:MI') < NOW() 
       AND status = true`,
      [anketId]
    );

    const anketDetailResult = await pool.query(
      `SELECT A.id, A.title, A.aciklama, A.start_time, A.finish_time, A.is_active, A.is_deleted, A.status, A.creator_id, A.anket_tur, A.created_date, A.updated_date, 
              TO_CHAR(A.start_date, 'YYYY-MM-DD') as start_date, 
              TO_CHAR(A.finish_date, 'YYYY-MM-DD') as finish_date, 
              U.user_name as creator_name
       FROM portal_anket A
       LEFT JOIN portal_user U ON A.creator_id = U.id
       WHERE A.id = $1 AND A.is_deleted = false`,
      [anketId]
    );

    if (anketDetailResult.rows.length === 0) {
      return res.status(404).json({ message: 'Anket bulunamadı' });
    }

    // Sorular
    const sorularResult = await pool.query(
      `SELECT * FROM portal_anket_sorular
       WHERE anket_id = $1 AND is_deleted = false
       ORDER BY id ASC`,
      [anketId]
    );

    const sorular = sorularResult.rows;

    // Şıklar
    for (const soru of sorular) {
      if (soru.soru_type === 0 || soru.soru_type === 1) {
        const soruSecenekleriResult = await pool.query(
          `SELECT * FROM portal_anket_soru_siklari
           WHERE soru_id = $1 AND is_deleted = false
           ORDER BY id ASC`,
          [soru.id]
        );
        soru.soruSecenekleri = soruSecenekleriResult.rows;
      } else {
        soru.soruSecenekleri = [];
      }
    }

    // Katılım kontrolü
    const participationResult = await pool.query(
      `SELECT id FROM portal_anket_user WHERE user_id = $1 AND anket_id = $2`,
      [req.user.id, anketId]
    );

    let existingAnswers = [];
    let userParticipation = false;

    if (participationResult.rows.length > 0) {
      userParticipation = true;
      const anketUserId = participationResult.rows[0].id;

      const answersResult = await pool.query(
        `SELECT * FROM portal_anket_user_answer WHERE anket_user_id = $1`,
        [anketUserId]
      );
      existingAnswers = answersResult.rows;
    }

    // Departmanlar
    const departmentsResult = await pool.query(
      `SELECT D.id, D.departman_adi 
       FROM portal_anket_birim AB
       JOIN portal_departman D ON AB.department_id = D.id
       WHERE AB.anket_id = $1 AND AB.is_delete = false`,
      [anketId]
    );

    const departmanlar = departmentsResult.rows.map(row => ({
      id: row.id,
      departman_adi: row.departman_adi
    }));

    // Anket dokümanı
    const anketDokumanResult = await pool.query(
      'SELECT url FROM portal_anket_dokuman WHERE type = 0 AND connected_id = $1 AND is_deleted = false',
      [anketId]
    );
    const anketDokuman = anketDokumanResult.rows.length > 0 ? anketDokumanResult.rows[0].url : null;

    // Soru dokümanları
    const soruDokumanlariResult = await pool.query(
      'SELECT connected_id, url FROM portal_anket_dokuman WHERE type = 1 AND connected_id IN (SELECT id FROM portal_anket_sorular WHERE anket_id = $1) AND is_deleted = false',
      [anketId]
    );

    // Dokümanları sorulara eşle
    for (const soru of sorular) {
      const doc = soruDokumanlariResult.rows.find(d => d.connected_id === soru.id);
      if (doc) {
        soru.dokuman_url = doc.url;
      }
    }

    res.json({
      anket: { ...anketDetailResult.rows[0], dokuman_url: anketDokuman },
      sorular: sorular,
      userParticipation,
      existingAnswers,
      departmanlar
    });
  } catch (err) {
    console.error('Anket detayı alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Yeni anket
app.post('/api/anketler', authenticateToken, checkRole(['admin', 'anket_yonetimi']), async (req, res) => {
  const client = await pool.connect();

  try {
    const { title, aciklama, start_date, start_time, finish_date, finish_time, anket_tur, departmanlar } = req.body;

    if (!title || !start_date || !finish_date) {
      return res.status(400).json({ message: 'Başlık, başlangıç ve bitiş tarihi zorunludur.' });
    }

    await client.query('BEGIN');

    const createAnketResult = await client.query(
      `INSERT INTO portal_anket (title, aciklama, start_date, start_time, finish_date, finish_time, anket_tur, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [title, aciklama, start_date, start_time, finish_date, finish_time, anket_tur || 0, req.user.id]
    );

    const anketId = createAnketResult.rows[0].id;

    // Departman ekle
    if (departmanlar && Array.isArray(departmanlar)) {
      for (const deptId of departmanlar) {
        await client.query(
          'INSERT INTO portal_anket_birim (anket_id, department_id) VALUES ($1, $2)',
          [anketId, deptId]
        );
      }
    }

    // Soru ekle
    const { questions } = req.body;
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        const questionResult = await client.query(
          `INSERT INTO portal_anket_sorular (title, soru_type, is_imperative, anket_id)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [q.title, q.soru_type, q.is_imperative || false, anketId]
        );
        const soruId = questionResult.rows[0].id;

        if (q.soruSecenekleri && Array.isArray(q.soruSecenekleri)) {
          for (const secenek of q.soruSecenekleri) {
            if (secenek.answer) {
              await client.query(
                `INSERT INTO portal_anket_soru_siklari (soru_id, answer)
                 VALUES ($1, $2)`,
                [soruId, secenek.answer]
              );
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Anket başarıyla oluşturuldu!', anketId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Anket oluşturulurken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// Anket Güncelle
app.put('/api/anketler/:id', authenticateToken, checkRole(['admin', 'anket_yonetimi']), async (req, res) => {
  const client = await pool.connect();
  try {
    const anketId = parseInt(req.params.id, 10);
    const { title, aciklama, start_date, start_time, finish_date, finish_time, is_active, status, questions, anket_tur } = req.body;

    await client.query('BEGIN');

    // Anketi güncelle
    await client.query(
      `UPDATE portal_anket
       SET title = $1, aciklama = $2, start_date = $3, start_time = $4,
           finish_date = $5, finish_time = $6, is_active = $7, status = $8,
           anket_tur = $9,
           updated_date = NOW()
       WHERE id = $10`,
      [title, aciklama, start_date, start_time, finish_date, finish_time, is_active, status, anket_tur || 0, anketId]
    );

    // Departmanları güncelle (soft delete)
    await client.query(
      'UPDATE portal_anket_birim SET is_delete = true WHERE anket_id = $1',
      [anketId]
    );

    // Yeni departmanları ekle
    if (req.body.departmanlar && Array.isArray(req.body.departmanlar)) {
      for (const deptId of req.body.departmanlar) {

        const checkResult = await client.query(
          'SELECT id FROM portal_anket_birim WHERE anket_id = $1 AND department_id = $2',
          [anketId, deptId]
        );

        if (checkResult.rows.length > 0) {
          await client.query(
            'UPDATE portal_anket_birim SET is_delete = false WHERE id = $1',
            [checkResult.rows[0].id]
          );
        } else {
          await client.query(
            'INSERT INTO portal_anket_birim (anket_id, department_id) VALUES ($1, $2)',
            [anketId, deptId]
          );
        }
      }
    }

    // Soruları güncelle
    if (questions && Array.isArray(questions)) {
      // Mevcut sorular
      const existingQuestionsResult = await client.query(
        'SELECT id FROM portal_anket_sorular WHERE anket_id = $1 AND is_deleted = false',
        [anketId]
      );
      const existingQuestionIds = existingQuestionsResult.rows.map(r => r.id);
      const incomingQuestionIds = questions.filter(q => q.id).map(q => q.id);

      // Silinen soruları pasife al
      const questionsToDelete = existingQuestionIds.filter(id => !incomingQuestionIds.includes(id));
      for (const id of questionsToDelete) {
        await client.query('UPDATE portal_anket_sorular SET is_deleted = true WHERE id = $1', [id]);
      }

      // Soruları işle
      for (const q of questions) {
        let soruId = q.id;

        if (soruId) {

          await client.query(
            `UPDATE portal_anket_sorular
             SET title = $1, soru_type = $2, is_imperative = $3, updated_date = NOW()
             WHERE id = $4`,
            [q.title, q.soru_type, q.is_imperative || false, soruId]
          );
        } else {
          // Ekle
          const insertResult = await client.query(
            `INSERT INTO portal_anket_sorular (title, soru_type, is_imperative, anket_id)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [q.title, q.soru_type, q.is_imperative || false, anketId]
          );
          soruId = insertResult.rows[0].id;
        }

        // Şıkları İşle (Sadece seçenekli sorular için)
        if (q.soruSecenekleri && Array.isArray(q.soruSecenekleri)) {
          // Mevcut şıkları getir
          const existingOptionsResult = await client.query(
            'SELECT id FROM portal_anket_soru_siklari WHERE soru_id = $1 AND is_deleted = false',
            [soruId]
          );
          const existingOptionIds = existingOptionsResult.rows.map(r => r.id);
          const incomingOptionIds = q.soruSecenekleri.filter(o => o.id).map(o => o.id);

          // Silinen şıkları pasife al
          const optionsToDelete = existingOptionIds.filter(id => !incomingOptionIds.includes(id));
          for (const id of optionsToDelete) {
            await client.query('UPDATE portal_anket_soru_siklari SET is_deleted = true WHERE id = $1', [id]);
          }

          // Şıkları işle
          for (const secenek of q.soruSecenekleri) {
            if (secenek.answer) {
              if (secenek.id) {
                await client.query(
                  'UPDATE portal_anket_soru_siklari SET answer = $1 WHERE id = $2',
                  [secenek.answer, secenek.id]
                );
              } else {
                await client.query(
                  `INSERT INTO portal_anket_soru_siklari (soru_id, answer)
                   VALUES ($1, $2)`,
                  [soruId, secenek.answer]
                );
              }
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Anket başarıyla güncellendi!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Anket güncellenirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// Anket sil
app.delete('/api/anketler/:id', authenticateToken, checkRole(['admin', 'anket_yonetimi']), async (req, res) => {
  try {
    const anketId = parseInt(req.params.id, 10);

    await pool.query(
      'UPDATE portal_anket SET is_deleted = true WHERE id = $1',
      [anketId]
    );

    res.json({ message: 'Anket başarıyla silindi!' });
  } catch (err) {
    console.error('Anket silinirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Anket doküman yükle
app.post('/api/anketler/:id/dokuman', authenticateToken, checkRole(['admin', 'anket_yonetimi']), upload.single('dosya'), async (req, res) => {
  try {
    const anketId = parseInt(req.params.id, 10);
    const dosya = req.file;

    if (!dosya) {
      return res.status(400).json({ message: 'Dosya yüklenmedi.' });
    }

    const targetDir = getAnketDirectory(anketId);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Dosya adını temizle
    const safeFilename = dosya.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = safeFilename;

    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, dosya.buffer);

    const relativeUrl = `anket_dokuman/${anketId}/${filename}`;

    // Kontrol et
    const checkResult = await pool.query(
      'SELECT id FROM portal_anket_dokuman WHERE type = 0 AND connected_id = $1 AND is_deleted = false',
      [anketId]
    );

    if (checkResult.rows.length > 0) {

      await pool.query(
        'UPDATE portal_anket_dokuman SET url = $1 WHERE id = $2',
        [relativeUrl, checkResult.rows[0].id]
      );
    } else {

      await pool.query(
        'INSERT INTO portal_anket_dokuman (type, connected_id, url) VALUES ($1, $2, $3)',
        [0, anketId, relativeUrl]
      );
    }

    res.json({ message: 'Doküman başarıyla yüklendi!', url: relativeUrl });
  } catch (err) {
    console.error('Anket dokümanı yüklenirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Soru doküman yükle
app.post('/api/sorular/:id/dokuman', authenticateToken, checkRole(['admin', 'anket_yonetimi']), upload.single('dosya'), async (req, res) => {
  try {
    const soruId = parseInt(req.params.id, 10);
    const dosya = req.file;

    if (!dosya) {
      return res.status(400).json({ message: 'Dosya yüklenmedi.' });
    }

    // Anket ID'yi al
    const soruResult = await pool.query('SELECT anket_id FROM portal_anket_sorular WHERE id = $1', [soruId]);
    if (soruResult.rows.length === 0) {
      return res.status(404).json({ message: 'Soru bulunamadı.' });
    }
    const anketId = soruResult.rows[0].anket_id;

    const targetDir = getSoruDirectory(anketId, soruId);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Dosya adını temizle
    const safeFilename = dosya.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = safeFilename;

    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, dosya.buffer);

    const relativeUrl = `anket_dokuman/${anketId}/${filename}`;

    // Kontrol et
    const checkResult = await pool.query(
      'SELECT id FROM portal_anket_dokuman WHERE type = 1 AND connected_id = $1 AND is_deleted = false',
      [soruId]
    );

    if (checkResult.rows.length > 0) {

      await pool.query(
        'UPDATE portal_anket_dokuman SET url = $1 WHERE id = $2',
        [relativeUrl, checkResult.rows[0].id]
      );
    } else {

      await pool.query(
        'INSERT INTO portal_anket_dokuman (type, connected_id, url) VALUES ($1, $2, $3)',
        [1, soruId, relativeUrl]
      );
    }

    res.json({ message: 'Soru dokümanı başarıyla yüklendi!', url: relativeUrl });
  } catch (err) {
    console.error('Soru dokümanı yüklenirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// SORU İŞLEMLERİ

// Soru Ekle
app.post('/api/anketler/:anketId/sorular', authenticateToken, checkRole(['admin', 'anket_yonetimi']), upload.single('dosya'), async (req, res) => {
  try {
    const anketId = parseInt(req.params.anketId, 10);
    const { title, duration, soru_type, is_imperative, soruSecenekleri } = req.body;
    const dosya = req.file;

    if (!title || soru_type === undefined) {
      return res.status(400).json({ message: 'Soru başlığı ve tipi zorunludur.' });
    }

    const result = await pool.query(
      `INSERT INTO portal_anket_sorular (title, duration, soru_type, is_imperative, anket_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [title, duration, soru_type, is_imperative || false, anketId]
    );

    const soruId = result.rows[0].id;

    // Şık ekle
    if (soruSecenekleri) {
      let parsedSecenekler = [];
      try {
        parsedSecenekler = typeof soruSecenekleri === 'string' ? JSON.parse(soruSecenekleri) : soruSecenekleri;
      } catch (e) {
        console.error('Şıklar parse edilemedi:', e);
      }

      if (Array.isArray(parsedSecenekler) && parsedSecenekler.length > 0) {
        for (const secenek of parsedSecenekler) {
          await pool.query(
            `INSERT INTO portal_anket_soru_siklari (soru_id, answer)
             VALUES ($1, $2)`,
            [soruId, secenek.answer]
          );
        }
      }
    }

    // Dosya Kaydet varsa
    if (dosya) {
      const targetDir = getSoruDirectory(anketId, soruId);
      await fs.promises.mkdir(targetDir, { recursive: true });

      const ext = path.extname(dosya.originalname);
      const filePath = path.join(targetDir, `${soruId}${ext}`);
      await fs.promises.writeFile(filePath, dosya.buffer);

      const relativeUrl = `anket_dokuman/${anketId}/sorular/${soruId}/${soruId}${ext}`;

      await pool.query(
        'INSERT INTO portal_anket_dokuman (type, connected_id, url) VALUES ($1, $2, $3)',
        [1, soruId, relativeUrl]
      );
    }

    res.status(201).json({ message: 'Soru başarıyla eklendi!', soruId });
  } catch (err) {
    console.error('Soru eklenirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Soru Güncelle
app.put('/api/sorular/:id', authenticateToken, checkRole(['admin', 'anket_yonetimi']), async (req, res) => {
  try {
    const soruId = parseInt(req.params.id, 10);
    const { title, duration, soru_type, is_imperative, soruSecenekleri } = req.body;

    await pool.query(
      `UPDATE portal_anket_sorular
       SET title = $1, duration = $2, soru_type = $3, is_imperative = $4, updated_date = NOW()
       WHERE id = $5`,
      [title, duration, soru_type, is_imperative, soruId]
    );

    // Şıkları Güncelle (Eğer varsa)
    if (soruSecenekleri) {
      // Eski şıkları sil
      await pool.query(
        'UPDATE portal_anket_soru_siklari SET is_deleted = true WHERE soru_id = $1',
        [soruId]
      );

      let parsedSecenekler = [];
      try {
        parsedSecenekler = typeof soruSecenekleri === 'string' ? JSON.parse(soruSecenekleri) : soruSecenekleri;
      } catch (e) {
        console.error('Şıklar parse edilemedi:', e);
      }

      if (Array.isArray(parsedSecenekler) && parsedSecenekler.length > 0) {
        for (const secenek of parsedSecenekler) {
          await pool.query(
            `INSERT INTO portal_anket_soru_siklari (soru_id, answer)
             VALUES ($1, $2)`,
            [soruId, secenek.answer]
          );
        }
      }
    }

    res.json({ message: 'Soru başarıyla güncellendi!' });
  } catch (err) {
    console.error('Soru güncellenirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Soru Sil (Soft Delete)
app.delete('/api/sorular/:id', authenticateToken, checkRole(['admin', 'anket_yonetimi']), async (req, res) => {
  try {
    const soruId = parseInt(req.params.id, 10);

    await pool.query(
      'UPDATE portal_anket_sorular SET is_deleted = true WHERE id = $1',
      [soruId]
    );

    res.json({ message: 'Soru başarıyla silindi!' });
  } catch (err) {
    console.error('Soru silinirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// CEVAP İŞLEMLERİ

// Anketi Cevapla
app.post('/api/anketler/:anketId/cevapla', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const anketId = parseInt(req.params.anketId, 10);
    const { cevaplar } = req.body; // [{soru_id, answer, answer_id}]

    if (!cevaplar || !Array.isArray(cevaplar)) {
      return res.status(400).json({ message: 'Cevaplar dizisi gereklidir.' });
    }

    await client.query('BEGIN');

    // Katılım kontrolü
    const checkUser = await client.query(
      `SELECT id FROM portal_anket_user WHERE user_id = $1 AND anket_id = $2`,
      [req.user.id, anketId]
    );

    let anketUserId;

    if (checkUser.rows.length > 0) {

      anketUserId = checkUser.rows[0].id;

      // Güncelleme tarihini kaydet
      await client.query(
        `UPDATE portal_anket_user SET update_date = NOW() WHERE id = $1`,
        [anketUserId]
      );

      // Eski cevapları sil
      await client.query(
        `DELETE FROM portal_anket_user_answer WHERE anket_user_id = $1`,
        [anketUserId]
      );
    } else {

      const userResult = await client.query(
        `INSERT INTO portal_anket_user (user_id, anket_id, user_name)
         VALUES ($1, $2, $3) RETURNING id`,
        [req.user.id, anketId, req.user.isim]
      );
      anketUserId = userResult.rows[0].id;
    }

    // Cevapları kaydet
    for (const cevap of cevaplar) {
      await client.query(
        `INSERT INTO portal_anket_user_answer (soru_id, anket_user_id, answer, answer_id, anket_id, created_date)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [cevap.soru_id, anketUserId, cevap.answer, cevap.answer_id, anketId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Anket başarıyla tamamlandı!' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Anket cevapları kaydedilirken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// RAPORLAR

// Anket İstatistikleri
app.get('/api/raporlar/anket-istatistik/:id', authenticateToken, checkRole(['admin', 'yonetici']), async (req, res) => {
  try {
    const anketId = parseInt(req.params.id, 10);

    // Toplam Katılımcı
    const katilimciResult = await pool.query(
      'SELECT COUNT(DISTINCT user_id) as toplam FROM portal_anket_user WHERE anket_id = $1',
      [anketId]
    );

    // Cevap Dağılımı
    const cevapDagilimResult = await pool.query(
      `SELECT
        S.id as soru_id, S.title as soru_baslik, S.soru_type,
        COALESCE(SS.answer, A.answer) as answer, 
        A.answer_id, 
        COUNT(*) as cevap_sayisi
       FROM portal_anket_user_answer A
       JOIN portal_anket_sorular S ON A.soru_id = S.id
       LEFT JOIN portal_anket_soru_siklari SS ON A.answer_id = SS.id
       WHERE A.anket_id = $1
       GROUP BY S.id, S.title, S.soru_type, A.answer, A.answer_id, SS.answer
       ORDER BY S.id, cevap_sayisi DESC`,
      [anketId]
    );

    res.json({
      toplamKatilimci: parseInt(katilimciResult.rows[0].toplam),
      cevapDagilim: cevapDagilimResult.rows
    });
  } catch (err) {
    console.error('Anket istatistikleri alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Katılımcı Listesi
app.get('/api/raporlar/anket-katilimcilar/:id', authenticateToken, checkRole(['admin', 'yonetici']), async (req, res) => {
  try {
    const anketId = parseInt(req.params.id, 10);

    const katilimciListResult = await pool.query(
      `SELECT
        AU.id, AU.user_name, AU.created_date, AU.update_date,
        U.sicil, U.rol
       FROM portal_anket_user AU
       LEFT JOIN portal_user U ON AU.user_id = U.id
       WHERE AU.anket_id = $1
       ORDER BY AU.created_date DESC`,
      [anketId]
    );

    res.json(katilimciListResult.rows);
  } catch (err) {
    console.error('Katılımcı listesi alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Katılımcı Cevapları
app.get('/api/raporlar/katilimci-cevaplari/:anketUserId', authenticateToken, checkRole(['admin', 'yonetici']), async (req, res) => {
  try {
    const anketUserId = parseInt(req.params.anketUserId, 10);

    const answersResult = await pool.query(
      `SELECT
        S.id as soru_id, S.title as soru_baslik, S.soru_type,
        COALESCE(SS.answer, A.answer) as answer, 
        A.answer_id
       FROM portal_anket_user_answer A
       JOIN portal_anket_sorular S ON A.soru_id = S.id
       LEFT JOIN portal_anket_soru_siklari SS ON A.answer_id = SS.id
       WHERE A.anket_user_id = $1
       ORDER BY S.id ASC`,
      [anketUserId]
    );

    res.json(answersResult.rows);
  } catch (err) {
    console.error('Katılımcı cevapları alınırken hata:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// SUNUCU BASLATMA

app.listen(PORT, () => {
  const uploadsDir = path.join(__dirname, 'uploads', 'anket_dokuman');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("'uploads/anket_dokuman' klasörü oluşturuldu.");
  }
  console.log(`Sunucu ${BASE_URL} adresinde başlatıldı.`);
});
