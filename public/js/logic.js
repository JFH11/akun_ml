// validasi tombol login/signup
fetch('/session-check')
    .then(res => res.json())
    .then(data => {
      if (data.isLoggedIn) {
        document.getElementById("btn-login")?.remove();
        document.getElementById("btn-signup")?.remove();

        const nav = document.querySelector(".lg\\:flex.items-center.space-x-4");
        const userBtn = document.createElement("a");
        userBtn.href = "";
        userBtn.style.pointerEvents = "none";
        userBtn.textContent = `Halo, ${data.username}`;
        userBtn.className = "bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-full transition-colors duration-300";
        nav.appendChild(userBtn);
      }
    });

// Mobile Menu Toggle
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
let isOpen = false;

menuBtn.addEventListener('click', () => {
    if (isOpen) {
        // Tutup dengan animasi keluar
        mobileMenu.classList.remove('animate-slide-down');
        mobileMenu.classList.add('animate-slide-up');
        setTimeout(() => {
            mobileMenu.classList.add('hidden');
        }, 300); // durasi animasi
    } else {
        // Buka dengan animasi masuk
        mobileMenu.classList.remove('hidden', 'animate-slide-up');
        mobileMenu.classList.add('animate-slide-down');
    }
    isOpen = !isOpen;
});

// Set Copyright Year
document.getElementById('year').textContent = new Date().getFullYear();

// index.html
// ** Logika untuk Tombol Kembali ke Atas **
const scrollToTopBtn = document.getElementById('scrollToTopBtn');

// Tampilkan tombol ketika pengguna scroll ke bawah
window.onscroll = function () {
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        scrollToTopBtn.classList.remove('hidden');
    } else {
        scrollToTopBtn.classList.add('hidden');
    }
};

// Fungsi untuk scroll ke atas ketika tombol diklik
scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});