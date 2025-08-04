const express = require('express');
const path = require('path');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');

// Khusus route /semua-akun → tampilkan index.html
router.get('/semua-akun', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Route dinamis untuk halaman lain (login, signup, dll)
router.get('/:page', (req, res, next) => {
  const halaman = req.params.page;

  // Proteksi khusus untuk admin
  if (halaman === 'admin') {
    return isAdmin(req, res, () => {
      res.sendFile(path.join(__dirname, `../public/${halaman}.html`));
    });
  }

  // Tampilkan file HTML jika ada
  res.sendFile(path.join(__dirname, `../public/${halaman}.html`), (err) => {
    if (err) {
      res.status(404).send('Halaman tidak ditemukan');
    }
  });
});

module.exports = router;
