const baseImageUrl = '/img/';
const showMoreCount = 10;

let akunData = { available: [], sold: [], hacked: [] };
let shownCount = { available: 0, sold: 0, hacked: 0 };

function renderCards(status) {
  const grid = document.getElementById(`grid-${status}`);
  const dataToShow = akunData[status].slice(0, shownCount[status]);
  const startIndex = grid.children.length;

  for (let i = startIndex; i < dataToShow.length; i++) {
    const akun = dataToShow[i];
    const a = document.createElement('a');
    a.href = '#';
    a.className = `click-bounce relative group w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-md bg-gray-800 opacity-0 translate-y-4`;
    a.style.transition = `all 0.6s ease ${0.3 * (i - startIndex)}s`;
    a.innerHTML = `
      <img src="${baseImageUrl + akun.gambar}" alt="Akun ML"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ${['sold', 'hacked'].includes(akun.status) ? `
        <img src="/img/${akun.status}.webp" alt="${akun.status}"
          class="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none z-20" />
      ` : ''}
      <div class="absolute inset-0 bg-black/60 backdrop-blur-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div class="absolute bottom-0 left-0 px-4 py-3 transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <p class="text-white font-semibold text-lg">${akun.nama_akun}</p>
          <p class="text-white text-[0.8rem] opacity-80">${akun.id_akun}</p>
        </div>
      </div>
      <span class="absolute inset-0 pointer-events-none overflow-hidden">
        <span class="shine-effect hidden group-hover:block"></span>
      </span>
    `;
    grid.appendChild(a);
    requestAnimationFrame(() => {
      a.classList.remove('opacity-0', 'translate-y-4');
    });
  }

  const showMoreBtn = document.querySelector(`.show-more-btn[data-status="${status}"]`);
  if (akunData[status].length > shownCount[status]) {
    showMoreBtn.classList.remove('hidden');
  } else {
    showMoreBtn.classList.add('hidden');
  }
}

async function loadAkun() {
  try {
    const sort = localStorage.getItem('sort_preference') || 'terbaru'; // ⬅️ tambahkan ini
    const res = await fetch(`/api/akun?sort=${encodeURIComponent(sort)}`); // ⬅️ masukkan ke URL
    if (!res.ok) throw new Error('Gagal load data akun');
    const data = await res.json();

    akunData = { available: [], sold: [], hacked: [] };
    shownCount = { available: showMoreCount, sold: showMoreCount, hacked: showMoreCount };

    data.forEach(akun => {
      if (akunData[akun.status]) akunData[akun.status].push(akun);
    });

    ['available', 'sold', 'hacked'].forEach(status => {
      document.getElementById(`grid-${status}`).innerHTML = '';
      renderCards(status);
    });
  } catch (error) {
    console.error('Error load akun:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAkun();

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.filter;

      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('filter-btn-active');
        b.querySelector('.shine-effect')?.remove();
      });

      btn.classList.add('filter-btn-active');
      const shine = document.createElement('span');
      shine.classList.add('shine-effect');
      btn.appendChild(shine);

      document.querySelectorAll('.fade-section').forEach(section => {
        section.classList.toggle('block', section.dataset.content === target);
        section.classList.toggle('hidden', section.dataset.content !== target);
      });
    });
  });

  document.querySelectorAll('.show-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      shownCount[status] += showMoreCount;
      renderCards(status);
    });
  });

  document.querySelector('[data-filter="available"]')?.click();
});

// ======= SEARCH SYSTEM =======
const searchInputs = document.querySelectorAll('input[placeholder="Cari game..."]');

searchInputs.forEach(input => {
  input.addEventListener('input', async () => {
    const keyword = input.value.trim();

    if (keyword === '') {
      loadAkun();
      document.querySelector('[data-filter="available"]')?.click();
      return;
    }

    try {
      const res = await fetch(`/api/search-akun-terjual?q=${encodeURIComponent(keyword)}`);
      const data = await res.json();

      if (!data.length) {
        document.querySelectorAll('.fade-section').forEach(section => section.classList.add('hidden'));
        const soldGrid = document.getElementById('grid-sold');
        soldGrid.innerHTML = '<p class="text-gray-400 mt-4 text-left">Akun tidak ditemukan.</p>';
        document.querySelector('[data-content="sold"]').classList.remove('hidden');
        document.querySelector('[data-content="sold"]').classList.add('block');
        return;
      }

      const status = data[0].status;
      document.querySelectorAll('.fade-section').forEach(section => {
        section.classList.toggle('block', section.dataset.content === status);
        section.classList.toggle('hidden', section.dataset.content !== status);
      });

      const grid = document.getElementById(`grid-${status}`);
      grid.innerHTML = '';
      data.forEach((akun, i) => {
        const a = document.createElement('a');
        a.href = '#';
        a.className = `click-bounce relative group w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-md bg-gray-800 opacity-0 translate-y-4`;
        a.style.transition = `all 0.6s ease ${0.3 * i}s`;
        a.innerHTML = `
          <img src="${baseImageUrl + akun.gambar}" alt="Akun ML" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ${['sold', 'hacked'].includes(akun.status) ? `
            <img src="/img/${akun.status}.webp" alt="${akun.status}" 
              class="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none z-20" />
          ` : ''}
          <div class="absolute inset-0 bg-black/60 backdrop-blur-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="absolute bottom-0 left-0 px-4 py-3 transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
              <p class="text-white font-semibold text-lg">${akun.nama_akun}</p>
              <p class="text-white text-[0.8rem] opacity-80">${akun.id_akun}</p>
            </div>
          </div>
          <span class="absolute inset-0 pointer-events-none overflow-hidden">
            <span class="shine-effect hidden group-hover:block"></span>
          </span>
        `;
        grid.appendChild(a);
        requestAnimationFrame(() => {
          a.classList.remove('opacity-0', 'translate-y-4');
        });
      });

      document.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        btn.classList.remove('filter-btn-active');
        btn.querySelector('.shine-effect')?.remove();
        if (filter === status) {
          btn.classList.add('filter-btn-active');
          const shineEl = document.createElement('span');
          shineEl.classList.add('shine-effect');
          btn.appendChild(shineEl);
        }
      });

    } catch (err) {
      console.error('Search error:', err);
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target)) {
      if (input.value.trim() !== '') {
        input.value = '';
        loadAkun();
        document.querySelector('[data-filter="available"]')?.click();
      }
    }
  });
});
