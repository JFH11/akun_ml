// === LOGIKA UNTUK SLIDER HERO ===
document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil elemen-elemen yang dibutuhkan
    const track = document.querySelector('.slider-track');
    const slides = Array.from(track.children);
    const slideCount = slides.length;

    // Jika tidak ada slide, hentikan eksekusi
    if (slideCount === 0) return;

    // 2. Variabel untuk menyimpan state (posisi) slider
    let currentIndex = 0;
    const slideInterval = 10000; // Pindah slide setiap 5 detik

    // 3. Fungsi utama untuk pindah ke slide tertentu
    const goToSlide = (targetIndex) => {
        // Pindahkan 'track' ke kiri sejauh (index * 100%)
        track.style.transform = 'translateX(-' + targetIndex * 100 + '%)';

        // Update class 'is-active' untuk efek visual scale & opacity
        slides.forEach((slide, index) => {
            if (index === targetIndex) {
                slide.classList.add('is-active');
            } else {
                slide.classList.remove('is-active');
            }
        });

        // Perbarui index saat ini
        currentIndex = targetIndex;
    };

    // 4. Inisialisasi slider
    // Set slide pertama sebagai aktif saat halaman pertama kali dimuat
    goToSlide(0);

    // 5. Logika untuk otomatisasi slider
    setInterval(() => {
        // Hitung index slide berikutnya
        // Menggunakan modulo (%) agar setelah slide terakhir, kembali ke slide pertama (0)
        const nextIndex = (currentIndex + 1) % slideCount;

        // Panggil fungsi untuk pindah ke slide berikutnya
        goToSlide(nextIndex);

    }, slideInterval);
});

// ** Logika untuk Animasi Kotak Jatuh **
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('main');
    const boxCount = 40; // Jumlah kotak yang akan dibuat pada awalnya
    const themeColors = ['#4f46e5', '#ec4899', '#8b5cf6']; // Warna dari tema: indigo, pink, purple

    const createFallingBox = () => {
        const box = document.createElement('div');
        box.classList.add('falling-box');

        // Properti acak untuk setiap kotak
        const size = Math.random() * (60 - 10) + 10; // Ukuran acak antara 10px dan 60px
        const position = Math.random() * 100; // Posisi horizontal acak dalam %
        const duration = (Math.random() * 5 + 5); // Kecepatan jatuh acak antara 5 dan 10 detik
        const delay = Math.random() * 5; // Penundaan acak hingga 5 detik
        const color = themeColors[Math.floor(Math.random() * themeColors.length)];

        box.style.width = `${size}px`;
        box.style.height = `${size}px`;
        box.style.left = `${position}%`;
        box.style.animationDuration = `${duration}s`;
        box.style.animationDelay = `${delay}s`;
        box.style.backgroundColor = color;
        box.style.opacity = Math.random() * 0.4 + 0.1; // Opasitas acak agar tidak terlalu menonjol

        // Tambahkan kotak ke dalam <main>
        // Menggunakan prepend agar berada di lapisan paling bawah (secara visual)
        mainContainer.prepend(box);

        // Hapus kotak dari DOM setelah animasi selesai untuk menjaga performa
        box.addEventListener('animationend', () => {
            box.remove();
        });
    };

    // Buat beberapa kotak di awal
    for (let i = 0; i < boxCount; i++) {
        createFallingBox();
    }

    // Terus menerus buat kotak baru secara berkala
    setInterval(createFallingBox, 800); // Buat 1 kotak baru setiap 800ms (0.8 detik)
});
