const express = require('express');
const router = express.Router();
const pool = require('../db/db'); // pastikan path sudah benar

// Route untuk search akun_detail
router.get('/api/search-akun-terjual', async (req, res) => {
  const search = req.query.q;

  if (!search) {
    return res.status(400).json({ error: 'Query pencarian kosong' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM akun_detail 
       WHERE LOWER(nama_akun) LIKE LOWER($1) 
       OR CAST(id_akun AS TEXT) ILIKE $1`,
      [`%${search}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Gagal melakukan pencarian:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat mencari data' });
  }
});

module.exports = router;
