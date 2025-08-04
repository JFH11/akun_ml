require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const pool = require('./db/db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const xss = require('xss');
const saltRounds = 10;

const app = express();
app.disable('etag');
const PORT = process.env.PORT;
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 500, // 500 request per IP per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Terlalu banyak permintaan, silahkan coba lagi nanti.'
});

// Setup middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(cors( { origin: true, credentials: true } ));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_default', 
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30 * 6 // 6 bulan
  }
}));

// Konfigurasi multer untuk menyimpan gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/img')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ dest: 'uploads/' }); // simpan sementara dulu

// === SIGNUP / SIGNIN / SESSION ===
app.post('/signup', async (req, res) => {
  const { username, email, password, role = 'user' } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Isi semua data!' });

  try {
    const hashed = await bcrypt.hash(password, saltRounds);
    await pool.query(
      'INSERT INTO users (username,email,password,role) VALUES ($1,$2,$3,$4)',
      [username, email, hashed, role]
    );
    res.cookie('signupSuccess', 'true', { maxAge: 10000, httpOnly: false });
    res.redirect('/login');

  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      // Username atau email sudah ada
      res.cookie('signupExists', 'true', { maxAge: 10000, httpOnly: false });
      return res.redirect('/signup');
    }
    res.status(500).json({ error: 'Gagal membuat akun' });
  }
});

app.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.cookie('loginError', 'empty').redirect('/login');

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!result.rows.length) return res.cookie('loginError', 'notfound').redirect('/login');

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.cookie('loginError', 'wrong').redirect('/login');

    req.session.user = { username: user.username, role: user.role };
    res.cookie('loginSuccess', 'true', { maxAge: 10000, httpOnly: false });
    res.redirect(user.role === 'admin' ? '/admin' : '/semua-akun');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal login' });
  }
});

app.get('/session-check', (req, res) => {
  if (req.session.user) res.json({ isLoggedIn: true, username: req.session.user.username });
  else res.json({ isLoggedIn: false });
});

// === AKUN TERJUAL: CRUD dengan upload gambar ===
app.post('/api/tambah-akun', upload.single('gambar'), async (req, res) => {
  const { nama_akun, id_akun, status } = req.body;

  if (!nama_akun || !id_akun || !req.file) {
    return res.status(400).json({ error: 'Lengkapi semua data dan upload gambar!' });
  }

  const inputPath = req.file.path; // path asli di uploads/
  const originalName = path.parse(req.file.originalname).name;
  const webpFilename = `${originalName}-${Date.now()}.webp`; // buat nama unik
  const outputPath = path.join(__dirname, 'public', 'img', webpFilename);

  try {
    // Convert ke webp
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Hapus file asli (jpg/png)
    fs.unlinkSync(inputPath);

    // Simpan ke database
    await pool.query(
      `INSERT INTO akun_detail (nama_akun, id_akun, gambar, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [nama_akun, id_akun, webpFilename, status || 'available']
    );

    res.status(201).json({ message: 'Akun berhasil ditambahkan!', gambar: webpFilename });
  } catch (err) {
    console.error('❌ Error upload:', err);
    res.status(500).json({ error: 'Gagal menyimpan akun' });
  }
});

app.get('/api/akun', async (req, res) => {
  const sort = req.query.sort;

  // Validasi dan mapping sort
  let orderClause = 'nama_akun ASC'; // default A-Z
  if (sort === 'terbaru') orderClause = 'created_at DESC';
  else if (sort === 'terlama') orderClause = 'created_at ASC';
  else if (sort === 'a-z') orderClause = 'nama_akun ASC';
  else if (sort === 'z-a') orderClause = 'nama_akun DESC';

  const query = `
    SELECT nama_akun, id_akun, gambar, status, created_at, updated_at
    FROM akun_detail
    ORDER BY ${orderClause}
  `;

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error saat ambil data akun:', err);
    res.status(500).json({ error: 'Gagal mengambil data akun' });
  }
});

app.patch('/api/update-akun', async (req, res) => {
  const { id_akun, nama_akun, status, gambar } = req.body;
  if (!id_akun || !nama_akun || !status || !gambar) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }
  try {
    const result = await pool.query(
      `UPDATE akun_detail SET nama_akun=$1, status=$2, gambar=$3, updated_at=CURRENT_TIMESTAMP WHERE id_akun=$4 RETURNING *`,
      [nama_akun, status, gambar, id_akun]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Akun tidak ditemukan' });
    res.json({ message: 'Update berhasil', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal update akun' });
  }
});

// === AKUN TERJUAL: UPDATE MASSAL
app.patch('/api/update-massal', async (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) return res.status(400).json({ error: 'Format data tidak valid' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const ak of data) {
      await client.query(
        `UPDATE akun_detail SET nama_akun=$1, status=$2, updated_at=CURRENT_TIMESTAMP WHERE id_akun=$3`,
        [ak.nama_akun, ak.status, ak.id_akun]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Semua akun berhasil diupdate' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Gagal update massal' });
  } finally {
    client.release();
  }
});

// === AKUN TERHAPUS: CRUD
app.delete('/api/delete-akun', async (req, res) => {
  const { id_akun } = req.body;
  if (!id_akun) return res.status(400).json({ error: 'ID akun dibutuhkan' });
  try {
    const { rows } = await pool.query('SELECT * FROM akun_detail WHERE id_akun=$1', [id_akun]);
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ditemukan' });
    const ak = rows[0];
    await pool.query(
      `INSERT INTO akun_terhapus (nama_akun,id_akun,gambar,status,created_at,updated_at,deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
      [ak.nama_akun, ak.id_akun, ak.gambar, ak.status, ak.created_at, ak.updated_at]
    );
    await pool.query('DELETE FROM akun_detail WHERE id_akun=$1', [id_akun]);
    res.json({ message: 'Akun dipindahkan ke tong sampah' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal hapus akun' });
  }
});

// Route untuk menghapus semua akun
app.delete('/api/hapus-semua-akun', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM akun_detail');
    if (!rows.length) return res.json({ message: 'Tidak ada akun aktif' });
    for (const ak of rows) {
      await pool.query(
        `INSERT INTO akun_terhapus (nama_akun,id_akun,gambar,status,created_at,updated_at,deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
        [ak.nama_akun, ak.id_akun, ak.gambar, ak.status, ak.created_at, ak.updated_at]
      );
    }
    await pool.query('DELETE FROM akun_detail');
    res.json({ message: 'Semua akun dipindahkan ke tong sampah' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal hapus semua akun' });
  }
});

// Route untuk menghapus semua akun permanen
app.delete('/api/hapus-permanen', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT gambar FROM akun_terhapus');
    if (!rows.length) return res.status(400).json({ error: 'Tong sampah kosong' });

    for (const row of rows) {
      const filePath = path.join(__dirname, 'public/img', row.gambar);
      fs.unlink(filePath, err => {
        if (err && err.code !== 'ENOENT') console.error('Gagal hapus gambar:', err);
      });
    }

    await pool.query('DELETE FROM akun_terhapus');
    res.json({ message: 'Semua akun di tong sampah dihapus permanen' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal hapus permanen' });
  }
});

// Route untuk menghapus satu akun permanen
app.delete('/api/hapus-permanen-satu', async (req, res) => {
  const { id_akun } = req.body;
  if (!id_akun) return res.status(400).json({ error: 'ID akun dibutuhkan' });

  try {
    const { rows } = await pool.query('SELECT gambar FROM akun_terhapus WHERE id_akun=$1', [id_akun]);
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ada di tong sampah' });

    const gambar = rows[0].gambar;
    await pool.query('DELETE FROM akun_terhapus WHERE id_akun=$1', [id_akun]);

    // Hapus file gambar
    const filePath = path.join(__dirname, 'public/img', gambar);
    fs.unlink(filePath, err => {
      if (err && err.code !== 'ENOENT') console.error('Gagal hapus gambar:', err);
    });

    res.json({ message: 'Akun dihapus permanen' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal hapus permanen' });
  }
});

// Route untuk menampilkan tong sampah
app.get('/api/tong-sampah', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM akun_terhapus ORDER BY deleted_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal ambil tong sampah' });
  }
});

// Route untuk mengembalikan akun
app.post('/api/restore-akun', async (req, res) => {
  const { id_akun } = req.body;
  if (!id_akun) return res.status(400).json({ error: 'ID akun diperlukan' });
  try {
    const { rows } = await pool.query('SELECT * FROM akun_terhapus WHERE id_akun=$1', [id_akun]);
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ditemukan di tong sampah' });
    const ak = rows[0];
    await pool.query(
      `INSERT INTO akun_detail (nama_akun,id_akun,gambar,status,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [ak.nama_akun, ak.id_akun, ak.gambar, ak.status, ak.created_at, ak.updated_at]
    );
    await pool.query('DELETE FROM akun_terhapus WHERE id_akun=$1', [id_akun]);
    res.json({ message: 'Akun berhasil dipulihkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal restore akun' });
  }
});

// Route untuk auto delete user
app.delete('/api/auto-delete-nonaktif', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM users WHERE role!='admin' AND (email IS NULL OR email='')`);
    res.json({ message: `${result.rowCount} user non‑aktif dihapus` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal auto delete user' });
  }
});

// Route untuk mengambil semua user
app.get('/api/users', async (req, res) => {
  const sort = req.query.sort;
  let query = 'SELECT id, username, email, role, created_at FROM users';
  let order = '';

  if (sort === 'a-z') {
    order = ' ORDER BY username ASC';
  } else if (sort === 'terbaru') {
    order = ' ORDER BY created_at DESC';
  } else if (sort === 'terlama') {
    order = ' ORDER BY created_at ASC';
  }

  try {
    const result = await pool.query(query + order);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengambil data user');
  }
});

// Hapus satu user
app.delete('/api/delete-user/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menghapus user');
  }
});

// Hapus banyak user
app.post('/api/delete-users', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send('ID tidak valid');
  }

  try {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menghapus user');
  }
});

app.post('/api/akun-detail', upload.array('gambar_akun', 10), async (req, res) => {
  const {
    nama_akun, id_akun, harga, deskripsi, rank, skin, emblem, status, log, minus
  } = req.body;
  const gambar = req.files;

  const client = await pool.connect();
  try {
    const created_at = new Date();
    const updated_at = new Date();

    const targetFolder = path.join(__dirname, 'public', 'img', nama_akun);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    await client.query('BEGIN');

    await client.query(`
      INSERT INTO akun_detailed 
      (nama_akun, id_akun, harga, deskripsi, rank, skin, emblem, status, log, minus, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [
      nama_akun, id_akun, harga, deskripsi,
      rank, skin, emblem, status, log,
      minus, created_at, updated_at
    ]);

    for (let i = 0; i < gambar.length; i++) {
      const file = gambar[i];
      const webpFileName = `img_${Date.now()}_${i}.webp`;
      const outputPath = path.join(targetFolder, webpFileName);

      // Convert ke .webp
      await sharp(file.path)
        .webp({ quality: 80 })
        .toFile(outputPath);

      // Hapus file sementara original
      fs.unlinkSync(file.path);

      // Simpan ke DB
      await client.query(`
        INSERT INTO gambar_akun_detailed (nama_akun, nama_file)
        VALUES ($1, $2)
      `, [nama_akun, webpFileName]);
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan data akun' });
  } finally {
    client.release();
  }
});

app.get('/api/akun-detail', async (req, res) => {
  const result = await pool.query('SELECT * FROM akun_detailed ORDER BY created_at DESC');
  res.json(result.rows);
});

app.get('/api/gambar-akun', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        nama_akun, 
        ARRAY_AGG(nama_file ORDER BY nama_file) AS nama_file_array
      FROM gambar_akun_detailed
      GROUP BY nama_akun
      ORDER BY nama_akun ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data gambar' });
  }
});

app.put('/api/gambar-urutan', async (req, res) => {
  const { data } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of data) {
      await client.query(
        `UPDATE gambar_akun_detailed SET urutan = $1 WHERE nama_akun = $2 AND nama_file = $3`,
        [item.urutan, item.nama_akun, item.nama_file]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Gagal update urutan gambar' });
  } finally {
    client.release();
  }
});

// Endpoint untuk gambar akun
app.get('/api/gambar-akun/:nama_akun', async (req, res) => {
  const { nama_akun } = req.params;
  try {
    const result = await pool.query(
      'SELECT nama_file FROM gambar_akun_detailed WHERE nama_akun = $1 ORDER BY urutan ASC',
      [nama_akun]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil gambar akun' });
  }
});

// Endpoint untuk detail akun
app.get('/api/akun-detail/:nama_akun', async (req, res) => {
  const { nama_akun } = req.params;
  try {
    const result = await pool.query('SELECT * FROM akun_detailed WHERE nama_akun = $1', [nama_akun]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Akun tidak ditemukan" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil detail akun' });
  }
});

const authRoutes = require('./routes/pages');
app.use('/', authRoutes);
// Jika ada routing pages/search
const searchRoutes = require('./routes/search');
app.use('/', searchRoutes);

// Inisialisasi admin jika belum ada
pool.query('SELECT NOW()')
  .then(async () => {
    console.log('✅ Terhubung ke PostgreSQL');
    const username = 'admin', email = 'admin@gmail.com', plain = 'ajun', role = 'admin';
    const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!rows.length) {
      const hashed = await bcrypt.hash(plain, saltRounds);
      await pool.query('INSERT INTO users (username,email,password,role) VALUES ($1,$2,$3,$4)', [username, email, hashed, role]);
      console.log('✅ Admin dibuat');
    } else console.log('ℹ️ Admin sudah ada');
  })
  .catch(err => console.error('❌ Gagal koneksi PostgreSQL:', err));

app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`)).on('error', err => console.error('❌ Gagal start server:', err));
