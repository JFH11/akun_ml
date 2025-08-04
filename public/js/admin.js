const baseImageUrl = '/img/';
let currentSort = 'terbaru';

function getCurrentSection() {
  if (!document.getElementById('akun-section').classList.contains('hidden')) return 'akun';
  if (!document.getElementById('user-section').classList.contains('hidden')) return 'user';
  if (!document.getElementById('akun-detail-section').classList.contains('hidden')) return 'detail';
  if (!document.getElementById('tong-sampah-section').classList.contains('hidden')) return 'trash';
  return null;
}

document.addEventListener('click', (e) => {
  if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.add('hidden');
  }
});

function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const msg = document.getElementById('confirm-message');
  msg.textContent = message;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const cancelBtn = document.getElementById('confirm-cancel');
  const yesBtn = document.getElementById('confirm-yes');

  const cleanup = () => modal.classList.add('hidden');

  cancelBtn.onclick = cleanup;
  yesBtn.onclick = () => {
    cleanup();
    onConfirm();
  };
}

const dropdownBtn = document.getElementById('dropdownBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
dropdownBtn.onclick = () => dropdownMenu.classList.toggle('hidden');

dropdownMenu.querySelectorAll('button').forEach(btn => {
  btn.onclick = () => {
    currentSort = btn.dataset.sort;
    localStorage.setItem('sort_preference', currentSort); // ⬅️ simpan preferensi sort

    const section = getCurrentSection();

    if (section === 'akun') loadData();
    else if (section === 'user') document.getElementById('show-user').click();
    else if (section === 'trash') document.getElementById('lihat-tong-sampah').click();

    dropdownMenu.classList.add('hidden');
  };
});

function showPopup(message, type = 'info') {
  const popup = document.getElementById('popup');
  const msg = document.getElementById('popup-message');
  msg.textContent = message;

  popup.classList.remove('hidden', 'animate__fadeOutUp');
  popup.classList.add('animate__bounceIn');

  popup.classList.remove('bg-gray-800', 'bg-red-600', 'bg-green-600');
  if (type === 'error') popup.classList.add('bg-red-600');
  else if (type === 'success') popup.classList.add('bg-green-600');
  else popup.classList.add('bg-gray-800');

  setTimeout(() => {
    popup.classList.remove('animate__bounceIn');
    popup.classList.add('animate__fadeOutUp');
  }, 2000);

  setTimeout(() => {
    popup.classList.add('hidden');
  }, 2500);
}

async function loadData() {
  try {
    const res = await fetch(`/api/akun?sort=${currentSort}`);
    const data = await res.json();
    const tbody = document.getElementById('akun-tbody');
    tbody.innerHTML = '';

    data.forEach(akun => tbody.insertAdjacentHTML('beforeend', renderRow(akun)));
    attachListeners();
  } catch (err) {
    showPopup('Gagal load data akun', 'error');
    console.error(err);
  }
}

function renderRow(akun) {
  return `
    <tr data-id="${akun.id_akun}" class="border-t border-gray-700">
      <td class="p-2"><img src="${baseImageUrl + akun.gambar}" class="w-16 h-16 rounded" /></td>
      <td class="p-2"><input type="text" value="${akun.nama_akun}" class="bg-gray-800 px-2 py-1 w-full rounded" /></td>
      <td class="p-2">${akun.id_akun}</td>
      <td class="p-2">
        <div class="relative inline-block">
          <button class="dropdown-toggle bg-gray-700 px-3 py-1 rounded">${akun.status}</button>
          <div class="dropdown-menu absolute hidden bg-gray-800 border border-gray-700 rounded mt-1 z-50">
            ${['available','sold','hacked'].map(s => `<button data-value="${s}" class="block w-full px-4 py-2 hover:bg-gray-700">${s}</button>`).join('')}
          </div>
        </div>
      </td>
      <td class="p-2 text-sm text-gray-400">${new Date(akun.created_at).toLocaleString()}</td>
      <td class="p-2 text-sm text-gray-400">${new Date(akun.updated_at).toLocaleString()}</td>
      <td class="p-2 space-x-2">
        <button class="btn-update bg-green-600 px-3 py-1 rounded">Update</button>
        <button class="btn-delete bg-red-600 px-3 py-1 rounded">Hapus</button>
      </td>
    </tr>`;
}

function attachListeners() {
  document.querySelectorAll('#akun-tbody tr').forEach(row => {
    const id = row.dataset.id;
    const btnUpdate = row.querySelector('.btn-update');
    const btnDelete = row.querySelector('.btn-delete');
    const namaInput = row.querySelector('td:nth-child(2) input');
    const statusBtn = row.querySelector('.dropdown-toggle');
    const statusMenu = row.querySelector('.dropdown-menu');

    statusBtn.onclick = () => {
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
      statusMenu.classList.toggle('hidden');
    };
    statusMenu.querySelectorAll('button').forEach(opt => {
      opt.onclick = () => {
        statusBtn.textContent = opt.dataset.value;
        statusMenu.classList.add('hidden');
      };
    });

    btnUpdate.onclick = async () => {
      const nama = namaInput.value;
      const status = statusBtn.textContent;
      const gambar = row.querySelector('img').src.split('/').pop();

      const res = await fetch('/api/update-akun', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_akun: id, nama_akun: nama, status, gambar })
      });
      const result = await res.json();
      showPopup(result.message || result.error, res.ok ? 'success' : 'error');
      if (res.ok) loadData();
    };

    btnDelete.onclick = async () => {
      const res = await fetch('/api/delete-akun', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_akun: id })
      });
      const result = await res.json();
      showPopup(result.message || result.error, res.ok ? 'success' : 'error');
      if (res.ok) loadData();
    };
  });
}

document.getElementById('form-akun').onsubmit = async e => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form); // Ambil semua field termasuk file

  const res = await fetch('/api/tambah-akun', {
    method: 'POST',
    body: formData, // kirim sebagai multipart/form-data
  });

  const result = await res.json();
  showPopup(result.message || result.error, res.ok ? 'success' : 'error');
  if (res.ok) {
    form.reset();
    loadData();
  }
};

document.getElementById('update-semua').onclick = async () => {
  const rows = document.querySelectorAll('#akun-tbody tr');
  const updates = [];
  rows.forEach(row => {
    const id_akun = row.dataset.id;
    const nama_akun = row.querySelector('td:nth-child(2) input').value.trim();
    const status = row.querySelector('.dropdown-toggle').textContent.trim();
    const gambar = row.querySelector('img').src.split('/').pop();
    updates.push({ id_akun, nama_akun, status, gambar });
  });
  const res = await fetch('/api/update-massal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: updates })
  });
  const result = await res.json();
  showPopup(result.message || result.error, res.ok ? 'success' : 'error');
  if (res.ok) loadData();
};

document.getElementById('hapus-semua').onclick = async () => {
  const res = await fetch('/api/hapus-semua-akun', { method: 'DELETE' });
  const result = await res.json();
  showPopup(result.message || result.error, res.ok ? 'success' : 'error');
  if (res.ok) loadData();
};

document.getElementById('lihat-tong-sampah').onclick = async () => {
  const res = await fetch(`/api/tong-sampah?sort=${currentSort}`);
  const data = await res.json();
  document.getElementById('tong-sampah-section').classList.remove('hidden');
  const body = document.getElementById('tong-sampah-body');
  body.innerHTML = '';
  data.forEach(a => {
    body.innerHTML += `
      <tr class="border-t border-gray-700">
        <td class="p-2">${a.nama_akun}</td>
        <td class="p-2">${a.id_akun}</td>
        <td class="p-2">${a.status}</td>
        <td class="p-2 space-x-2">
          <button data-id="${a.id_akun}" class="btn-restore bg-yellow-500 px-2 py-1 rounded">Pulihkan</button>
          <button data-id="${a.id_akun}" class="btn-hapus-permanen bg-red-700 px-2 py-1 rounded">Hapus Permanen</button>
        </td>
      </tr>`;
  });
  document.querySelectorAll('.btn-restore').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const res = await fetch('/api/restore-akun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_akun: id })
      });
      const result = await res.json();
      showPopup(result.message || result.error, res.ok ? 'success' : 'error');
      if (res.ok) {
        loadData();
        document.getElementById('lihat-tong-sampah').click();
      }
    };
  });
  document.querySelectorAll('.btn-hapus-permanen').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
          const res = await fetch('/api/hapus-permanen-satu', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_akun: id })
      });
      const result = await res.json();
      showPopup(result.message || result.error, res.ok ? 'success' : 'error');
      if (res.ok) document.getElementById('lihat-tong-sampah').click();
    };
  });
};

document.getElementById('hapus-permanen').onclick = async () => {
  const res = await fetch('/api/hapus-permanen', { method: 'DELETE' });
  const result = await res.json();
  showPopup(result.message || result.error, res.ok ? 'success' : 'error');
  if (res.ok) document.getElementById('lihat-tong-sampah').click();
};


document.getElementById('auto-delete-nonaktif').onclick = async () => {
  const res = await fetch('/api/auto-delete-nonaktif', { method: 'DELETE' });
  const result = await res.json();
  showPopup(result.message || result.error, res.ok ? 'success' : 'error');
  if (res.ok) loadData();
};

document.getElementById('show-akun').onclick = () => {
  document.getElementById('akun-section').classList.remove('hidden');
  document.getElementById('user-section').classList.add('hidden');
  document.getElementById('akun-detail-section').classList.add('hidden');

  const main = document.getElementById('main-content');
  main.classList.remove('animate__animated', 'animate__fadeIn');
  void main.offsetWidth; // ⬅️ trigger reflow untuk reset animasi
  main.classList.add('animate__animated', 'animate__fadeIn');
};

document.getElementById('show-akun-detail').onclick = () => {
  document.getElementById('akun-detail-section').classList.remove('hidden');
  document.getElementById('akun-section').classList.add('hidden');
  document.getElementById('user-section').classList.add('hidden');

  const main = document.getElementById('main-content');
  main.classList.remove('animate__animated', 'animate__fadeIn');
  void main.offsetWidth; // ⬅️ trigger reflow untuk reset animasi
  main.classList.add('animate__animated', 'animate__fadeIn');
}

document.getElementById('show-user').onclick = async () => {
  document.getElementById('akun-section').classList.add('hidden');
  document.getElementById('user-section').classList.remove('hidden');
  document.getElementById('akun-detail-section').classList.add('hidden');

  const main = document.getElementById('main-content');
  main.classList.remove('animate__animated', 'animate__fadeIn');
  void main.offsetWidth;
  main.classList.add('animate__animated', 'animate__fadeIn');

  try {
    const res = await fetch(`/api/users?sort=${currentSort}`);
    const users = await res.json();
    const tbody = document.getElementById('user-tbody');

    let html = '';

    function formatTanggalWaktu(datetime) {
      const date = new Date(datetime);
      const tgl = date.getDate().toString().padStart(2, '0');
      const bln = (date.getMonth() + 1).toString().padStart(2, '0');
      const thn = date.getFullYear();
      const jam = date.getHours().toString().padStart(2, '0');
      const menit = date.getMinutes().toString().padStart(2, '0');
      const detik = date.getSeconds().toString().padStart(2, '0');
      return `${tgl}/${bln}/${thn}, ${jam}.${menit}.${detik}`;
    }

    users.forEach(user => {
      const tanggalDaftar = formatTanggalWaktu(user.created_at);
      html += `
        <tr class="border-t border-gray-700">
          <td class="px-4 py-4">
            <input type="checkbox" class="user-checkbox" value="${user.id}" data-role="${user.role}">
          </td>
          <td class="px-4 py-4">${user.username}</td>
          <td class="px-4 py-4">${user.email}</td>
          <td class="px-4 py-4">${user.role}</td>
          <td class="px-6 py-4">${tanggalDaftar}</td>
          <td class="px-4 py-4 text-center">
            <button class="bg-red-600 hover:bg-red-700 text-white px-10 py-2 rounded delete-user-btn"
              data-id="${user.id}" data-role="${user.role}">
              Hapus
            </button>
          </td>
        </tr>`;
    });

    tbody.innerHTML = html;
    

    // ✅ Pindahkan event listener di sini
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const role = btn.dataset.role;

        if (role === 'admin') {
          showPopup('Akun admin tidak boleh dihapus!', 'error');
          return;
        }

        showConfirm('Yakin hapus user ini?', async () => {
          await fetch(`/api/delete-user/${id}`, { method: 'DELETE' });
          document.getElementById('show-user').click(); // Refresh tabel
        });
      });
    });

  } catch (err) {
    console.error('Gagal memuat user:', err);
    showPopup('Gagal memuat data user', 'error');
  }
};

// Hapus user terpilih
document.getElementById('hapus-multi-user').onclick = async () => {
  const checkboxes = document.querySelectorAll('.user-checkbox:checked');
if (checkboxes.length === 0) {
  showPopup('Pilih minimal satu user!', 'error');
  return;
}

  const ids = [];
  for (const cb of checkboxes) {
    if (cb.dataset.role === 'admin') {
  showPopup('Akun admin tidak boleh dihapus!', 'error');
  return;
}

    ids.push(cb.value);
  }

showConfirm(`Yakin hapus ${ids.length} user terpilih?`, async () => {
  await fetch('/api/delete-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  document.getElementById('show-user').click();
});
};

// Centang semua
document.getElementById('check-all-user').onclick = (e) => {
  document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = e.target.checked);
};

loadData();
lucide.createIcons();
