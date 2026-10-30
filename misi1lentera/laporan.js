// =============================================================
//  LAPORAN LITERASI LENTERA
//  Tanpa ?anak=...        -> daftar semua anak
//  Dengan ?anak=<anak_id> -> laporan 1 anak (anak_id = ssoToken yang dipakai saat main)
//  Contoh: laporan.html?anak=DEMO_TOKEN_123
// =============================================================
const params = new URLSearchParams(window.location.search);
const anakId = params.get('anak');
const rootEl = document.getElementById('laporan-root');

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const WARNA_PREDIKAT = {
  'Sempurna': 'bg-amber-100 text-amber-700 border-amber-300',
  'Sangat Baik': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Baik': 'bg-blue-100 text-blue-700 border-blue-300',
  'Cukup': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Perlu Pendampingan': 'bg-rose-100 text-rose-700 border-rose-300'
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "2026-10-27" -> "27 Okt 2026"
function tgl(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${parseInt(d, 10)} ${NAMA_BULAN[parseInt(m, 10) - 1] || ''} ${y}`;
}

// 87.5 -> "87,5"   |   90 -> "90"
function angka(n) {
  return n === null || n === undefined ? '-' : String(n).replace('.', ',');
}

function badgePredikat(p) {
  if (!p) return '<span class="text-slate-400">-</span>';
  const warna = WARNA_PREDIKAT[p] || 'bg-slate-100 text-slate-600 border-slate-300';
  return `<span class="inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${warna}">${esc(p)}</span>`;
}

function tampilkanPesan(teks) {
  rootEl.innerHTML = `<p class="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-5">${esc(teks)}</p>`;
}

// ---------------------------------------------------------------
//  DAFTAR SEMUA ANAK
// ---------------------------------------------------------------
async function muatDaftar() {
  const res = await fetch('/api/laporan');
  const data = await res.json();
  if (!data.anak.length) { tampilkanPesan('Belum ada data. Data muncul setelah anak menyelesaikan satu level.'); return; }

  const baris = data.anak.map((a) => `
    <tr class="border-t border-slate-100 hover:bg-orange-50/50">
      <td class="px-4 py-3 font-semibold"><a class="text-blue-600 hover:underline" href="laporan.html?anak=${encodeURIComponent(a.anak_id)}">${esc(a.anak_id)}</a></td>
      <td class="px-4 py-3 text-center">${angka(a.pretest)}</td>
      <td class="px-4 py-3 text-center font-bold">${angka(a.nilai_literasi)}</td>
      <td class="px-4 py-3 text-center">${badgePredikat(a.predikat)}</td>
      <td class="px-4 py-3 text-center">${a.perkembangan === null ? '-' : (a.perkembangan > 0 ? '+' : '') + angka(a.perkembangan)}</td>
      <td class="px-4 py-3 text-center">${a.jumlah_level}</td>
    </tr>`).join('');

  rootEl.innerHTML = `
    <h2 class="text-2xl font-extrabold text-slate-900">Daftar Anak</h2>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th class="px-4 py-3 text-left">Anak</th>
            <th class="px-4 py-3">Pre-test</th>
            <th class="px-4 py-3">Nilai Literasi</th>
            <th class="px-4 py-3">Predikat</th>
            <th class="px-4 py-3">Perkembangan</th>
            <th class="px-4 py-3">Level Selesai</th>
          </tr>
        </thead>
        <tbody>${baris}</tbody>
      </table>
    </div>`;
}

// ---------------------------------------------------------------
//  GRAFIK GARIS SEDERHANA (SVG): x = tanggal, y = nilai 0-100
// ---------------------------------------------------------------
function grafikTren(tren) {
  if (!tren.length) return '<p class="text-sm text-slate-400">Belum ada data.</p>';

  const W = 640, H = 260, L = 44, R = 24, T = 20, B = 46;
  const innerW = W - L - R, innerH = H - T - B;
  const x = (i) => (tren.length === 1 ? L + innerW / 2 : L + (innerW * i) / (tren.length - 1));
  const y = (v) => T + innerH - (innerH * v) / 100;

  const grid = [0, 25, 50, 75, 100].map((v) => `
    <line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="#e2e8f0" stroke-width="1" />
    <text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#94a3b8">${v}</text>`).join('');

  const garis = tren.length > 1
    ? `<polyline fill="none" stroke="#f97316" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"
         points="${tren.map((t, i) => `${x(i)},${y(t.nilai)}`).join(' ')}" />`
    : '';

  const titik = tren.map((t, i) => {
    const [, m, d] = t.tanggal.split('-');
    return `
      <circle cx="${x(i)}" cy="${y(t.nilai)}" r="6" fill="#ffffff" stroke="#f97316" stroke-width="3" />
      <text x="${x(i)}" y="${y(t.nilai) - 12}" text-anchor="middle" font-size="12" font-weight="700" fill="#c2410c">${angka(t.nilai)}</text>
      <text x="${x(i)}" y="${H - B + 20}" text-anchor="middle" font-size="11" fill="#64748b">${parseInt(d, 10)} ${NAMA_BULAN[parseInt(m, 10) - 1]}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img" aria-label="Grafik tren nilai per tanggal">
      ${grid}${garis}${titik}
    </svg>
    ${tren.length === 1 ? '<p class="text-xs text-slate-400 mt-1">Baru ada 1 tanggal. Garis muncul setelah ada nilai di tanggal lain.</p>' : ''}`;
}

// ---------------------------------------------------------------
//  LAPORAN 1 ANAK
// ---------------------------------------------------------------
function kartu(judul, isi, catatan = '') {
  return `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-1">
      <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${judul}</span>
      <div class="flex items-center gap-2 flex-wrap">${isi}</div>
      <span class="text-xs text-slate-500">${catatan}</span>
    </div>`;
}

function tampilkanLaporan(d) {
  const belumAda = d.nilai_literasi === null;

  let perkembanganIsi = '<span class="text-3xl font-extrabold text-slate-300">-</span>';
  let perkembanganCatatan = d.pretest === null ? 'Belum ada data pre-test.' : 'Belum ada level yang selesai.';
  if (d.perkembangan !== null) {
    const naik = d.perkembangan > 0, turun = d.perkembangan < 0;
    const warna = naik ? 'text-emerald-600' : (turun ? 'text-rose-600' : 'text-slate-600');
    perkembanganIsi = `<span class="text-3xl font-extrabold ${warna}">${naik ? '+' : ''}${angka(d.perkembangan)}</span>`;
    perkembanganCatatan = `Pre-test ${angka(d.pretest)} → sekarang ${angka(d.nilai_literasi)}`;
  }

  const barisLevel = d.level_selesai.map((l) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 font-semibold">Level ${l.level}</td>
      <td class="px-4 py-3 text-center font-bold">${angka(l.nilai)}</td>
      <td class="px-4 py-3 text-center">${badgePredikat(l.predikat)}</td>
      <td class="px-4 py-3 text-center">${l.langsung_benar}/${l.total_soal}</td>
      <td class="px-4 py-3 text-center">${tgl(l.tanggal)}</td>
      <td class="px-4 py-3 text-center text-slate-500">${l.main_ulang ? `${l.main_ulang}×` : '-'}</td>
    </tr>`).join('');

  rootEl.innerHTML = `
    <div>
      <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Laporan perkembangan literasi</span>
      <h2 class="text-2xl font-extrabold text-slate-900 break-all">${esc(d.anak_id)}</h2>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${kartu('Nilai Literasi',
        `<span class="text-4xl font-black text-orange-600">${angka(d.nilai_literasi)}</span>${badgePredikat(d.predikat)}`,
        belumAda ? 'Belum ada level yang selesai.' : `Rata-rata ${d.level_selesai.length} level`)}
      ${kartu('Perkembangan', perkembanganIsi, perkembanganCatatan)}
      ${kartu('Soal Langsung Benar',
        `<span class="text-4xl font-black text-emerald-600">${d.persen_langsung_benar === null ? '-' : angka(d.persen_langsung_benar) + '%'}</span>`,
        d.total_soal ? `${d.soal_langsung_benar} dari ${d.total_soal} soal` : 'Belum ada data.')}
      ${kartu('Level Selesai',
        `<span class="text-4xl font-black text-blue-600">${d.level_selesai.length}</span>`,
        'Dihitung dari penyelesaian pertama tiap level')}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      <div class="px-4 pt-4 text-sm font-bold text-slate-700">Level yang sudah diselesaikan</div>
      ${belumAda ? '<p class="px-4 py-4 text-sm text-slate-400">Belum ada level yang selesai.</p>' : `
      <table class="w-full text-sm mt-2">
        <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th class="px-4 py-3 text-left">Level</th>
            <th class="px-4 py-3">Nilai</th>
            <th class="px-4 py-3">Predikat</th>
            <th class="px-4 py-3">Langsung Benar</th>
            <th class="px-4 py-3">Tanggal</th>
            <th class="px-4 py-3">Main Ulang</th>
          </tr>
        </thead>
        <tbody>${barisLevel}</tbody>
      </table>`}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="text-sm font-bold text-slate-700 mb-2">Tren nilai per tanggal</div>
      ${grafikTren(d.tren)}
    </div>

    <p class="text-xs text-slate-400">
      Nilai laporan memakai penyelesaian pertama tiap level. "Main Ulang" tetap tersimpan tapi tidak mengubah nilai.
      Waktu pengerjaan disimpan sebagai data pendukung dan tidak ikut dihitung.
    </p>`;
}

async function muatAnak(id) {
  document.getElementById('back-link').classList.remove('hidden');
  const res = await fetch(`/api/laporan/${encodeURIComponent(id)}`);
  if (res.status === 404) { tampilkanPesan(`Data untuk "${id}" tidak ditemukan.`); return; }
  tampilkanLaporan(await res.json());
}

(anakId ? muatAnak(anakId) : muatDaftar()).catch((err) => {
  console.error(err);
  tampilkanPesan('Gagal memuat laporan. Pastikan server Flask (app.py) sedang jalan.');
});