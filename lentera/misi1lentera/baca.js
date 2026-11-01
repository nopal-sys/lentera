'use strict';

// ============================================================
// LENTERA GAME — BACA KALIMAT (LITERASI · LT-LANCAR)
//
// Anak membaca kalimat dengan suara keras. Mikrofon (Web Speech
// API, bahasa id-ID) mengubah suara menjadi teks, lalu teks itu
// dibandingkan dengan kalimat di layar:
//
//   sama  -> kalimat selesai, lanjut ke kalimat berikutnya
//   beda  -> baca ulang, poin kalimat itu berkurang 5
//
// Bank kalimat : soal-baca.js
// Pencocokan   : baca-logika.js (diuji terpisah, tanpa DOM)
// Browser      : Google Chrome / Microsoft Edge, lewat localhost,
//                127.0.0.1, atau https, dan butuh internet.
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
const ssoToken = urlParams.get('ssoToken') || '';
const legacySsoToken = ssoToken || 'DEMO_TOKEN_123';

const KOMPETENSI_BACA = 'LT-LANCAR';
const L = window.BacaLogika;

function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;

    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    console.warn('Token Dashboard tidak dapat dibaca:', error);
    return null;
  }
}

function normalizeCompetency(code) {
  const value = String(code || '').trim();

  const aliases = {
    membaca_lancar: 'LT-LANCAR',
    MEMBACA_LANCAR: 'LT-LANCAR'
  };

  return aliases[value] || value;
}

const dashboardSession = ssoToken
  ? decodeJwtPayload(ssoToken)
  : null;

const dashboardApiUrl = dashboardSession?.api || '';
const dashboardHomeUrl = dashboardSession?.home || '';

const hasDashboardSession = Boolean(
  ssoToken &&
  dashboardSession &&
  dashboardApiUrl &&
  dashboardSession.misi &&
  dashboardSession.kompetensi
);

// Saat dibuka dari Dashboard, kompetensi mengikuti token misi.
const dashboardCompetency = hasDashboardSession
  ? normalizeCompetency(dashboardSession.kompetensi)
  : KOMPETENSI_BACA;

// ============================================================
// PENGATURAN
// ============================================================

const CFG_BACA = {
  bahasa: 'id-ID',
  jedaDiamMs: 1800,      // diam setelah suara terakhir -> bacaan dinilai
  tungguSuaraMs: 9000,   // tidak ada suara sama sekali -> berhenti, poin TIDAK berkurang
  maksDengarMs: 30000,   // batas keras satu kali mendengarkan
  jumlahAlternatif: 5,   // kemungkinan kalimat yang diminta dari mikrofon
  lajuContoh: 0.85       // kecepatan suara "Dengarkan contoh"
};

const LEVEL_PAGE = 'level.html';

// ============================================================
// BANK KALIMAT
// ============================================================

if (!L) {
  alert('baca-logika.js tidak termuat. Pastikan dimuat sebelum baca.js.');
  throw new Error('BacaLogika tidak ditemukan.');
}

if (
  typeof soalBaca === 'undefined' ||
  !Array.isArray(soalBaca) ||
  soalBaca.length === 0
) {
  alert(
    'Bank kalimat tidak ditemukan. Pastikan soal-baca.js ' +
    'dimuat sebelum baca.js.'
  );

  throw new Error('Bank kalimat kosong atau belum dimuat.');
}

function validasiBank() {
  const ids = new Set();

  soalBaca.forEach((q, index) => {
    const label = `Kalimat ${index + 1} (${q.id || 'tanpa ID'})`;

    if (!q.id) {
      console.warn(`${label}: ID kosong.`);
    } else if (ids.has(q.id)) {
      console.warn(`${label}: ID duplikat.`);
    } else if (String(q.id).length > 40) {
      console.warn(`${label}: ID lebih dari 40 karakter, ditolak Dashboard.`);
    }

    ids.add(q.id);

    if (!String(q.kalimat || '').trim()) {
      console.warn(`${label}: kalimat kosong.`);
    }
  });

  for (let level = 1; level <= 5; level++) {
    const jumlah = soalBaca.filter(q => Number(q.level) === level).length;

    if (jumlah > 0 && jumlah < 5) {
      console.warn(
        `Level ${level} hanya punya ${jumlah} kalimat. ` +
        'Dashboard menandai misi selesai setelah 5 kalimat dibaca benar.'
      );
    }
  }
}

validasiBank();

// ============================================================
// LEVEL
// ============================================================

const tokenLevel = Number(dashboardSession?.level || 0);
const urlLevel = Number(urlParams.get('level') || 0);

const currentLevel = hasDashboardSession
  ? tokenLevel
  : (
      Number.isInteger(urlLevel) &&
      urlLevel >= 1 &&
      urlLevel <= 5
        ? urlLevel
        : 1
    );

const levelSoal = soalBaca.filter(
  q => Number(q.level) === currentLevel
);

if (
  hasDashboardSession &&
  (
    !Number.isInteger(currentLevel) ||
    currentLevel < 1 ||
    currentLevel > 5
  )
) {
  alert('Level misi tidak valid. Buka kembali misi dari Dashboard.');

  if (dashboardHomeUrl) {
    window.location.replace(dashboardHomeUrl);
  }

  throw new Error('Level misi Dashboard tidak valid.');
}

if (levelSoal.length === 0) {
  alert(`Level ${currentLevel} belum memiliki kalimat.`);

  window.location.replace(
    hasDashboardSession && dashboardHomeUrl
      ? dashboardHomeUrl
      : LEVEL_PAGE
  );

  throw new Error(`Kalimat Level ${currentLevel} tidak ditemukan.`);
}

function levelPageUrl() {
  // Setelah misi dari Dashboard, kembali ke Dashboard.
  if (hasDashboardSession && dashboardHomeUrl) {
    return dashboardHomeUrl;
  }

  const params = new URLSearchParams();

  if (ssoToken) {
    params.set('ssoToken', ssoToken);
    params.set('kompetensi', dashboardCompetency);
  } else {
    params.set('game', 'baca');
  }

  return `${LEVEL_PAGE}?${params.toString()}`;
}

// ============================================================
// STATE PERMAINAN
// ============================================================

let idx = 0;               // nomor kalimat di level ini
let mode = 'siap';         // siap | mendengar | menilai | dialog
let tampilan = { kata: [], peta: [] };
let kataEls = [];

let mulaiPercobaan = Date.now();
let sesiId = buatSesiId();
let soalState = {};

let sesiAktif = null;      // satu kali mendengarkan mikrofon
let sesiNomor = 0;
let sedangBicara = false;  // suara contoh sedang diputar

function buatSesiId() {
  return (
    `${Date.now().toString(36)}-` +
    `${Math.random().toString(36).slice(2, 10)}`
  );
}

function buatEventId() {
  if (
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return (
    `${Date.now().toString(36)}-` +
    `${Math.random().toString(36).slice(2, 12)}`
  );
}

function soalSekarang() {
  return levelSoal[idx];
}

function getSoalState(q) {
  if (!soalState[q.id]) {
    soalState[q.id] = {
      mulai: Date.now(),
      jumlahSalah: 0,
      selesai: false,
      waktuDetik: 0,
      pakaiContoh: false   // sudah mendengar contoh bacaan = memakai petunjuk
    };
  }

  return soalState[q.id];
}

// ============================================================
// PENILAIAN: 100 poin per kalimat, -5 setiap bacaan salah
// ============================================================

function hitungHasilLevel() {
  const daftar = levelSoal.map(q => {
    const state = getSoalState(q);

    return {
      soal_id: q.id,
      jumlah_salah: state.jumlahSalah,
      skor: L.hitungPoin(state.jumlahSalah),
      waktu_detik: state.waktuDetik
    };
  });

  const nilai = L.rataRata(daftar.map(item => item.skor));

  return {
    daftar,
    total: daftar.length,
    nilai,
    langsungBenar: daftar.filter(item => item.jumlah_salah === 0).length,
    totalSalah: daftar.reduce((jumlah, item) => jumlah + item.jumlah_salah, 0),
    predikat: L.tentukanPredikat(nilai)
  };
}

// ============================================================
// ELEMEN HALAMAN
// ============================================================

const $ = id => document.getElementById(id);

const soalNumEl = $('soal-num');
const soalTotalEl = $('soal-total');
const soalGambarEl = $('soal-gambar');
const kalimatEl = $('kalimat');
const levelBadgeEl = $('level-badge');
const progressBarEl = $('progress-bar');
const poinWrapEl = $('poin-wrap');
const poinValEl = $('poin-val');

const audioBtnEl = $('audio-btn');
const micPanelEl = $('mic-panel');
const micBtnEl = $('mic-btn');
const micIkonEl = $('mic-ikon');
const micJudulEl = $('mic-judul');
const statusLineEl = $('status-line');
const terdengarEl = $('terdengar');
const catatanEl = $('catatan');
const catatanJudulEl = $('catatan-judul');
const catatanIsiEl = $('catatan-isi');

const successModalEl = $('success-modal');
const successPoinEl = $('success-poin');
const successNextBtnEl = $('success-next-btn');
const errorModalEl = $('error-modal');
const errorJudulEl = $('error-judul');
const modalErrorDescEl = $('modal-error-desc');
const modalCloseBtnEl = $('modal-close-btn');
const exitModalEl = $('exit-modal');

const resultModalEl = $('result-modal');
const resultScoreEl = $('result-score');
const resultCorrectEl = $('result-correct');
const resultSalahEl = $('result-salah');
const resultLevelLabelEl = $('result-level-label');
const resultPesanEl = $('result-pesan');
const confettiLayerEl = $('confetti-layer');

const gestureStatusEl = $('gesture-status');
const cameraDotEl = $('camera-dot');
const virtualCursorEl = $('virtual-cursor');
const videoElement = $('webcam');

const IMAGE_PATH_REGEX = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i;

// ============================================================
// LAPORAN LOKAL FLASK
// ============================================================

async function kirimJson(url, body) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.warn(
        `Gagal mengirim laporan lokal ke ${url}: HTTP ${response.status}`
      );

      return false;
    }

    return true;
  } catch (error) {
    console.warn(`Server laporan lokal tidak tersedia: ${url}`, error);
    return false;
  }
}

function kirimHasilSoal(q, state) {
  return kirimJson('/api/baca/soal', {
    ssoToken: legacySsoToken,
    sesi_id: sesiId,
    level: Number(q.level),
    soal_id: q.id,
    jumlah_salah: state.jumlahSalah,
    waktu_detik: state.waktuDetik
  });
}

function kirimHasilLevel(hasil) {
  return kirimJson('/api/baca/level', {
    ssoToken: legacySsoToken,
    sesi_id: sesiId,
    level: currentLevel,
    total_soal: hasil.total,
    soal: hasil.daftar.map(item => ({
      soal_id: item.soal_id,
      jumlah_salah: item.jumlah_salah,
      waktu_detik: item.waktu_detik
    }))
  });
}

// ============================================================
// KONEKSI DASHBOARD DJANGO
// Satu bacaan = satu event (benar atau salah), sama seperti Game 1.
// ============================================================

const dashboardEventPromises = [];

function kirimEventDashboard(event) {
  if (!hasDashboardSession || !dashboardApiUrl) {
    return Promise.resolve({ ok: true, dilewati: true });
  }

  const promise = fetch(dashboardApiUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ssoToken}`
    },
    body: JSON.stringify({
      ...event,
      ssoToken
    })
  })
    .then(async response => {
      let body = {};

      try {
        body = await response.json();
      } catch (_) {
        body = {};
      }

      if (!response.ok || body.error) {
        throw new Error(
          body.error || `HTTP ${response.status} dari Dashboard`
        );
      }

      return { ok: true, data: body };
    })
    .catch(error => {
      console.error('Bacaan gagal dikirim ke Dashboard:', error);

      return {
        ok: false,
        error: error.message || String(error)
      };
    });

  dashboardEventPromises.push(promise);

  return promise;
}

async function selesaikanMisiDashboard() {
  if (!hasDashboardSession || !dashboardApiUrl) {
    return { ok: true, dilewati: true };
  }

  // Pastikan pengiriman bacaan sebelumnya selesai terlebih dahulu.
  const hasilEvent = await Promise.all(dashboardEventPromises);
  const gagal = hasilEvent.find(item => !item.ok);

  if (gagal) {
    return { ok: false, error: gagal.error };
  }

  try {
    const response = await fetch(dashboardApiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ssoToken}`
      },
      body: JSON.stringify({
        ssoToken,
        events: [],
        selesai: true
      })
    });

    let body = {};

    try {
      body = await response.json();
    } catch (_) {
      body = {};
    }

    if (!response.ok || body.error || body.selesai !== true) {
      return {
        ok: false,
        error: body.error || (
          `Dashboard belum menyatakan misi selesai. HTTP ${response.status}`
        )
      };
    }

    console.info('Misi selesai tercatat di Dashboard.', body);

    return { ok: true, data: body };
  } catch (error) {
    console.error('Konfirmasi penyelesaian misi gagal:', error);

    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

function buatEventDashboard(q, benar, waktuMs, petunjuk) {
  return {
    event_id: buatEventId(),
    item_id: q.id,
    question_id: q.id,
    kompetensi: dashboardCompetency,
    level: currentLevel,
    benar,
    is_correct: benar,
    pola: '',
    error_code: '',
    error_pattern: '',
    waktu_ms: waktuMs,
    response_time_ms: waktuMs,
    petunjuk,
    used_hint: petunjuk,
    waktu: new Date().toISOString()
  };
}

// ============================================================
// TAMPILAN KALIMAT, POIN, DAN STATUS
// ============================================================

function renderGambar(q) {
  const gambar = String(q.gambar || '').trim();

  soalGambarEl.innerHTML = '';

  if (!gambar) {
    soalGambarEl.textContent = '📖';
    return;
  }

  if (IMAGE_PATH_REGEX.test(gambar)) {
    const img = document.createElement('img');

    img.src = gambar;
    img.alt = '';
    img.className = 'w-full h-full object-contain';

    img.onerror = () => {
      soalGambarEl.innerHTML = '';
      soalGambarEl.textContent = '📖';
    };

    soalGambarEl.appendChild(img);
    return;
  }

  soalGambarEl.textContent = gambar;
}

function ukuranKalimat(jumlahKata) {
  if (jumlahKata <= 4) return 'text-4xl sm:text-5xl';
  if (jumlahKata <= 8) return 'text-3xl sm:text-4xl';
  return 'text-2xl sm:text-3xl';
}

function renderKalimat(q) {
  tampilan = L.pecahTampilan(q.kalimat);

  kalimatEl.className =
    'kalimat font-extrabold text-slate-800 ' +
    ukuranKalimat(tampilan.kata.length);

  kalimatEl.setAttribute('aria-label', q.kalimat);
  kalimatEl.innerHTML = '';
  kataEls = [];

  tampilan.kata.forEach((kata, index) => {
    const span = document.createElement('span');

    span.className = 'kata';
    span.textContent = kata;

    kalimatEl.appendChild(span);

    // Spasi biasa di antara kata supaya teks bisa dibungkus rapi.
    if (index < tampilan.kata.length - 1) {
      kalimatEl.appendChild(document.createTextNode(' '));
    }

    kataEls.push(span);
  });
}

// cocok  : hasil periksaBacaan().cocok, atau null untuk mengosongkan
// opsi   : { berikut: garis bawah kata berikutnya, tandaiSalah: kata yang belum tepat }
function terapkanSorotan(cocok, opsi = {}) {
  let sudahBerikut = false;

  const status = cocok
    ? L.statusTampilan(tampilan.peta, cocok)
    : tampilan.kata.map(() => 'netral');

  kataEls.forEach((el, i) => {
    const adaHuruf = tampilan.peta[i].length > 0;
    const benar = Boolean(cocok) && adaHuruf && status[i] === 'benar';
    const sebelumnya = el.classList.contains('kata-benar');

    el.classList.toggle('kata-benar', benar);

    if (benar && !sebelumnya) {
      el.classList.remove('kata-baru');
      void el.offsetWidth;
      el.classList.add('kata-baru');
    }

    el.classList.toggle(
      'kata-salah',
      Boolean(opsi.tandaiSalah) && adaHuruf && !benar
    );

    const berikut = Boolean(opsi.berikut) && adaHuruf && !benar && !sudahBerikut;

    if (berikut) sudahBerikut = true;

    el.classList.toggle('kata-berikut', berikut);
  });
}

function perbaruiPoin(animasi) {
  const q = soalSekarang();
  const poin = L.hitungPoin(getSoalState(q).jumlahSalah);

  poinValEl.textContent = poin;

  if (!animasi) return;

  poinWrapEl.classList.remove('poin-turun');
  void poinWrapEl.offsetWidth;
  poinWrapEl.classList.add('poin-turun');

  const minus = document.createElement('span');

  minus.className = 'poin-minus';
  minus.textContent = `-${L.POIN_PER_SALAH}`;

  poinWrapEl.appendChild(minus);
  setTimeout(() => minus.remove(), 1000);
}

function statusLine(teks) {
  statusLineEl.textContent = teks || '';
}

function resetTerdengar() {
  terdengarEl.innerHTML =
    '<span class="text-slate-400 italic">' +
    'Kata yang terdengar akan muncul di sini.' +
    '</span>';
}

function tampilkanTerdengar(teks) {
  if (!teks) {
    resetTerdengar();
    return;
  }

  terdengarEl.textContent = teks;
}

const CATATAN = {
  'tidak-didukung': [
    'Browser ini belum bisa mengenali suara',
    'Buka halaman ini di Google Chrome atau Microsoft Edge versi terbaru.'
  ],
  'tidak-aman': [
    'Mikrofon tidak bisa dipakai di alamat ini',
    'Buka lewat http://localhost:5000, http://127.0.0.1:5000, atau alamat https.'
  ],
  'not-allowed': [
    'Mikrofon belum diizinkan',
    'Klik ikon gembok di sebelah alamat halaman, ubah Mikrofon menjadi Izinkan, lalu muat ulang halaman.'
  ],
  'service-not-allowed': [
    'Mikrofon belum diizinkan',
    'Klik ikon gembok di sebelah alamat halaman, ubah Mikrofon menjadi Izinkan, lalu muat ulang halaman.'
  ],
  'audio-capture': [
    'Mikrofon tidak ditemukan',
    'Pastikan mikrofon terpasang dan tidak sedang dipakai aplikasi lain, lalu tekan mikrofon lagi.'
  ],
  'network': [
    'Pengenalan suara butuh internet',
    'Periksa sambungan internet, lalu tekan mikrofon lagi. Poinmu tidak berkurang.'
  ],
  'language-not-supported': [
    'Bahasa Indonesia belum tersedia di browser ini',
    'Perbarui Google Chrome atau Microsoft Edge, lalu coba lagi.'
  ]
};

function tampilkanCatatan(kode) {
  const isi = CATATAN[kode];

  if (!isi) return;

  catatanJudulEl.textContent = isi[0];
  catatanIsiEl.textContent = isi[1];
  catatanEl.classList.remove('hidden');
}

function sembunyikanCatatan() {
  catatanEl.classList.add('hidden');
}

// ============================================================
// MODE PERMAINAN DAN TOMBOL MIKROFON
// ============================================================

const IKON_MIC = {
  siap: '🎤',
  mendengar: '🎙️',
  menilai: '⏳',
  dialog: '🎤'
};

const JUDUL_MIC = {
  siap: 'Tekan mikrofon untuk mulai membaca',
  mendengar: 'Mendengarkan… baca sekarang!',
  menilai: 'Memeriksa bacaanmu…',
  dialog: 'Tekan mikrofon untuk mulai membaca'
};

function perbaruiTombol() {
  const bisaMic =
    (mode === 'siap' || mode === 'mendengar') &&
    !sedangBicara &&
    Boolean(SpeechRecognitionAPI);

  micBtnEl.disabled = !bisaMic;
  audioBtnEl.disabled = sedangBicara || mode === 'menilai';
}

function setMode(baru) {
  mode = baru;

  micPanelEl.dataset.mode = baru;
  micBtnEl.dataset.mode = baru;

  micBtnEl.setAttribute('aria-pressed', baru === 'mendengar' ? 'true' : 'false');
  micBtnEl.setAttribute(
    'aria-label',
    baru === 'mendengar' ? 'Selesai membaca' : 'Mulai membaca'
  );

  micIkonEl.textContent = IKON_MIC[baru];
  micJudulEl.textContent = JUDUL_MIC[baru];

  perbaruiTombol();
}

// ============================================================
// MENAMPILKAN KALIMAT BARU
// ============================================================

function renderSoal() {
  const q = soalSekarang();

  getSoalState(q);

  soalNumEl.textContent = idx + 1;
  soalTotalEl.textContent = levelSoal.length;
  levelBadgeEl.textContent = `Level ${q.level}`;

  progressBarEl.style.width =
    `${((idx + 1) / levelSoal.length) * 100}%`;

  renderGambar(q);
  renderKalimat(q);
  terapkanSorotan(null);
  perbaruiPoin(false);
  resetTerdengar();

  setMode('siap');

  statusLine(
    'Tekan mikrofon, lalu baca kalimat di atas dengan suara jelas. ' +
    'Pilih Izinkan jika browser meminta akses mikrofon.'
  );

  mulaiPercobaan = Date.now();
}

// ============================================================
// PENGENAL SUARA (Web Speech API)
// ============================================================

const SpeechRecognitionAPI =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition ||
  null;

function bersihkanPewaktu(sesi) {
  clearTimeout(sesi.tSenyap);
  clearTimeout(sesi.tTunggu);
  clearTimeout(sesi.tMaks);
  clearTimeout(sesi.tPengaman);
}

function mulaiPewaktu(sesi) {
  if (sesi.pewaktuJalan || sesi.selesai) return;

  sesi.pewaktuJalan = true;

  // Tidak ada suara sama sekali: berhenti tanpa mengurangi poin.
  sesi.tTunggu = setTimeout(() => {
    if (!sesi.adaSuara) hentikanSesi(sesi);
  }, CFG_BACA.tungguSuaraMs);

  sesi.tMaks = setTimeout(
    () => hentikanSesi(sesi),
    CFG_BACA.maksDengarMs
  );
}

// Minta mikrofon berhenti baik-baik. Hasil akhirnya dinilai
// di onend supaya teks final dari mikrofon ikut terhitung.
function hentikanSesi(sesi) {
  if (sesi.selesai) return;

  try {
    sesi.rec.stop();
  } catch (_) {
    // sudah berhenti
  }

  clearTimeout(sesi.tPengaman);

  // Jaring pengaman bila onend tidak pernah datang.
  sesi.tPengaman = setTimeout(() => akhiriSesi(sesi), 2500);
}

function jadwalkanSenyap(sesi) {
  clearTimeout(sesi.tSenyap);

  sesi.tSenyap = setTimeout(
    () => hentikanSesi(sesi),
    CFG_BACA.jedaDiamMs
  );
}

function mulaiMendengar() {
  if (mode !== 'siap' || sedangBicara) return;

  if (!SpeechRecognitionAPI) {
    tampilkanCatatan('tidak-didukung');
    return;
  }

  if (window.isSecureContext === false) {
    tampilkanCatatan('tidak-aman');
    return;
  }

  sembunyikanCatatan();

  const rec = new SpeechRecognitionAPI();

  rec.lang = CFG_BACA.bahasa;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = CFG_BACA.jumlahAlternatif;

  const sesi = {
    nomor: ++sesiNomor,
    rec,
    teks: '',
    kandidat: [],
    adaSuara: false,
    selesai: false,
    error: '',
    pewaktuJalan: false,
    tSenyap: null,
    tTunggu: null,
    tMaks: null,
    tPengaman: null
  };

  sesiAktif = sesi;

  rec.onstart = () => {
    if (sesi.selesai) return;

    statusLine('Mendengarkan… baca kalimat di atas. Ketuk mikrofon jika sudah selesai.');
    mulaiPewaktu(sesi);
  };

  rec.onaudiostart = () => mulaiPewaktu(sesi);
  rec.onresult = event => prosesHasil(sesi, event);

  rec.onerror = event => {
    sesi.error = (event && event.error) || 'error';
  };

  rec.onend = () => akhiriSesi(sesi);

  terapkanSorotan(null, { berikut: true });
  resetTerdengar();
  setMode('mendengar');

  statusLine('Menyalakan mikrofon… pilih Izinkan jika browser bertanya.');

  try {
    rec.start();
  } catch (error) {
    console.warn('Mikrofon gagal dinyalakan:', error);

    sesi.selesai = true;
    sesiAktif = null;

    terapkanSorotan(null);
    setMode('siap');
    statusLine('Mikrofon belum bisa dinyalakan. Tekan mikrofon sekali lagi.');
  }
}

// Gabungkan semua hasil sesi ini menjadi kemungkinan kalimat.
function prosesHasil(sesi, event) {
  if (sesi.selesai || sesi !== sesiAktif) return;

  const hasil = event.results;

  if (!hasil || hasil.length === 0) return;

  let awal = '';

  for (let i = 0; i < hasil.length - 1; i++) {
    awal += ` ${hasil[i][0].transcript}`;
  }

  const terakhir = hasil[hasil.length - 1];
  const kandidat = [];

  for (let k = 0; k < terakhir.length; k++) {
    kandidat.push(`${awal} ${terakhir[k].transcript}`.trim());
  }

  const utama = kandidat[0] || '';

  sesi.teks = utama;
  sesi.kandidat = kandidat;

  if (utama) sesi.adaSuara = true;

  tampilkanTerdengar(utama);

  const q = soalSekarang();
  const periksa = L.periksaAlternatif(q.kalimat, kandidat);

  // Sorot kata yang sudah terdengar sambil anak membaca.
  terapkanSorotan(periksa.cocok, { berikut: true });

  // Kalimat sudah sama: langsung selesai, tidak perlu menunggu diam.
  if (periksa.benar) {
    sesi.selesai = true;
    bersihkanPewaktu(sesi);
    sesiAktif = null;

    try {
      sesi.rec.abort();
    } catch (_) {
      // sudah berhenti
    }

    nilaiBacaan(periksa, periksa.teks);
    return;
  }

  if (utama) jadwalkanSenyap(sesi);
}

// Dipanggil saat mikrofon berhenti (diam, diketuk, atau error).
function akhiriSesi(sesi) {
  if (sesi.selesai) return;

  sesi.selesai = true;
  bersihkanPewaktu(sesi);

  if (sesi === sesiAktif) sesiAktif = null;

  const teks = sesi.teks.trim();

  const gangguan = [
    'not-allowed',
    'service-not-allowed',
    'audio-capture',
    'network',
    'language-not-supported'
  ].includes(sesi.error);

  // Masalah mikrofon / jaringan bukan kesalahan anak: poin aman.
  if (gangguan) {
    terapkanSorotan(null);
    setMode('siap');
    statusLine('');
    tampilkanCatatan(sesi.error);
    return;
  }

  // Tidak ada suara terdengar: bukan kesalahan baca.
  if (!teks) {
    terapkanSorotan(null);
    setMode('siap');

    statusLine(
      'Belum ada suara yang terdengar. Dekatkan mikrofon, lalu tekan ' +
      'mikrofon dan baca lagi. Poinmu tidak berkurang.'
    );

    return;
  }

  setMode('menilai');

  const q = soalSekarang();

  const periksa = L.periksaAlternatif(
    q.kalimat,
    sesi.kandidat.length ? sesi.kandidat : [teks]
  );

  nilaiBacaan(periksa, periksa.teks || teks);
}

// Anak (atau guru) mengetuk mikrofon saat mendengarkan = selesai membaca.
function selesaiManual() {
  if (!sesiAktif) return;

  statusLine('Memeriksa bacaanmu…');
  hentikanSesi(sesiAktif);
}

// Hentikan mikrofon tanpa menilai apa pun.
function batalkanMendengar() {
  const sesi = sesiAktif;

  if (!sesi) return;

  sesi.selesai = true;
  bersihkanPewaktu(sesi);
  sesiAktif = null;

  try {
    sesi.rec.abort();
  } catch (_) {
    // sudah berhenti
  }

  if (mode === 'mendengar' || mode === 'menilai') {
    terapkanSorotan(null);
    setMode('siap');
  }
}

// ============================================================
// MENILAI SATU BACAAN
// ============================================================

function nilaiBacaan(periksa, teksTerdengar) {
  const q = soalSekarang();
  const state = getSoalState(q);

  const waktuMs = Math.max(0, Date.now() - mulaiPercobaan);

  setMode('dialog');
  statusLine('');
  tampilkanTerdengar(teksTerdengar);

  if (periksa.benar) {
    state.selesai = true;

    state.waktuDetik = Math.round(
      (Date.now() - state.mulai) / 1000
    );

    terapkanSorotan(periksa.cocok);

    successPoinEl.textContent = L.hitungPoin(state.jumlahSalah);

    successNextBtnEl.textContent =
      idx + 1 < levelSoal.length ? 'Lanjut 🚀' : 'Lihat hasil 🏆';

    successModalEl.classList.remove('hidden');
    successNextBtnEl.focus({ preventScroll: true });

    // Laporan lokal hanya dikirim ketika kalimat berhasil dibaca.
    kirimHasilSoal(q, state);
  } else {
    state.jumlahSalah++;

    perbaruiPoin(true);

    terapkanSorotan(periksa.cocok, { tandaiSalah: true });

    errorJudulEl.textContent =
      `Belum tepat, poinmu berkurang ${L.POIN_PER_SALAH}`;

    modalErrorDescEl.textContent =
      `Yang terdengar: “${teksTerdengar}”. ` +
      'Baca lagi pelan-pelan, mulai dari kata yang bergaris merah. ' +
      `Poin kalimat ini sekarang ${L.hitungPoin(state.jumlahSalah)}.`;

    errorModalEl.classList.remove('hidden');
    modalCloseBtnEl.focus({ preventScroll: true });
  }

  kirimEventDashboard(
    buatEventDashboard(q, periksa.benar, waktuMs, state.pakaiContoh)
  );
}

modalCloseBtnEl.onclick = () => {
  errorModalEl.classList.add('hidden');

  terapkanSorotan(null);
  resetTerdengar();
  setMode('siap');

  mulaiPercobaan = Date.now();

  // Anak sudah memutuskan mencoba lagi: nyalakan mikrofon langsung.
  setTimeout(() => {
    if (mode === 'siap' && !sedangBicara) mulaiMendengar();
  }, 350);
};

successNextBtnEl.onclick = () => {
  successModalEl.classList.add('hidden');

  if (idx + 1 < levelSoal.length) {
    idx++;
    renderSoal();
  } else {
    showResult();
  }
};

// ============================================================
// SUARA CONTOH (Dengarkan contoh)
// ============================================================

function putarContoh() {
  if (!('speechSynthesis' in window)) {
    statusLine('Browser ini belum bisa membacakan kalimat.');
    return;
  }

  if (mode === 'menilai' || mode === 'dialog') return;

  // Suara contoh tidak boleh ikut tertangkap mikrofon.
  batalkanMendengar();

  const q = soalSekarang();

  window.speechSynthesis.cancel();

  const ucapan = new SpeechSynthesisUtterance(q.kalimat);

  ucapan.lang = CFG_BACA.bahasa;
  ucapan.rate = CFG_BACA.lajuContoh;

  const selesaiBicara = () => {
    clearTimeout(pengaman);

    if (!sedangBicara) return;

    sedangBicara = false;
    statusLine('Sekarang giliranmu. Tekan mikrofon, lalu baca kalimatnya.');
    perbaruiTombol();
  };

  const pengaman = setTimeout(selesaiBicara, 20000);

  ucapan.onend = selesaiBicara;
  ucapan.onerror = selesaiBicara;

  // Mendengar contoh = memakai petunjuk. Dicatat ke Dashboard.
  getSoalState(q).pakaiContoh = true;

  sedangBicara = true;
  statusLine('Mendengarkan contoh bacaan…');
  perbaruiTombol();

  window.speechSynthesis.speak(ucapan);
}

audioBtnEl.onclick = putarContoh;

micBtnEl.onclick = () => {
  if (mode === 'siap') {
    mulaiMendengar();
  } else if (mode === 'mendengar') {
    selesaiManual();
  }
};

// ============================================================
// KELUAR
// ============================================================

function adaKemajuan() {
  return (
    idx > 0 ||
    Object.values(soalState).some(
      state => state.selesai || state.jumlahSalah > 0
    )
  );
}

function keluarGame() {
  window.location.href = levelPageUrl();
}

$('back-btn').onclick = () => {
  batalkanMendengar();

  if (!adaKemajuan()) {
    keluarGame();
    return;
  }

  exitModalEl.classList.remove('hidden');
};

$('exit-stay-btn').onclick = () => {
  exitModalEl.classList.add('hidden');
};

$('exit-leave-btn').onclick = keluarGame;

// ============================================================
// HASIL AKHIR LEVEL
// ============================================================

function launchConfetti() {
  confettiLayerEl.innerHTML = '';

  const colors = [
    '#f97316', '#fbbf24', '#f43f5e', '#3b82f6',
    '#10b981', '#a855f7', '#ffffff'
  ];

  const emojis = ['⭐', '🎉', '✨', '🎊'];

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('span');

    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${2.5 + Math.random() * 3}s`;
    piece.style.animationDelay = `${Math.random() * 3}s`;

    if (i % 7 === 0) {
      piece.textContent =
        emojis[Math.floor(Math.random() * emojis.length)];

      piece.style.fontSize = `${18 + Math.random() * 14}px`;
    } else {
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${10 + Math.random() * 10}px`;

      piece.style.background =
        colors[Math.floor(Math.random() * colors.length)];

      piece.style.borderRadius =
        Math.random() > 0.5 ? '2px' : '50%';
    }

    confettiLayerEl.appendChild(piece);
  }
}

function countUpScore(target, duration = 1600) {
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    resultScoreEl.textContent = Math.round(target * eased);

    if (t < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function tampilkanBintang(nilai) {
  const jumlah = L.hitungBintang(nilai);

  document.querySelectorAll('#result-stars .result-star')
    .forEach((element, index) => {
      element.classList.toggle('off', index >= jumlah);
    });
}

function showResult() {
  const hasil = hitungHasilLevel();

  resultLevelLabelEl.textContent = `Level ${currentLevel} Selesai`;
  resultCorrectEl.textContent = `${hasil.langsungBenar}/${hasil.total}`;
  resultSalahEl.textContent = hasil.totalSalah;

  $('result-predikat').textContent = hasil.predikat;

  resultPesanEl.textContent = hasil.totalSalah === 0
    ? 'Semua kalimat kamu baca dengan tepat. Kamu hebat sekali! 🌟'
    : `Setiap bacaan yang salah mengurangi ${L.POIN_PER_SALAH} poin. Coba lagi supaya makin lancar! 💪`;

  resultScoreEl.textContent = '0';

  tampilkanBintang(hasil.nilai);

  resultModalEl.classList.remove('hidden');

  launchConfetti();

  setTimeout(() => countUpScore(hasil.nilai), 400);

  // Simpan nilai dan laporan di backend Flask.
  kirimHasilLevel(hasil);

  // Konfirmasi misi ke Dashboard hanya setelah seluruh bacaan
  // selesai dikirim.
  if (hasDashboardSession) {
    selesaikanMisiDashboard().then(result => {
      if (!result.ok) {
        console.warn(
          'Misi Dashboard belum berhasil diselesaikan:',
          result.error
        );
      }
    });
  }
}

$('result-level-btn').onclick = keluarGame;

$('result-retry-btn').onclick = () => {
  // Misi dari Dashboard tidak diulang melalui sesi yang sama.
  if (hasDashboardSession && dashboardHomeUrl) {
    window.location.href = dashboardHomeUrl;
    return;
  }

  resultModalEl.classList.add('hidden');
  confettiLayerEl.innerHTML = '';

  idx = 0;
  sesiId = buatSesiId();
  soalState = {};

  renderSoal();
};

// ============================================================
// SENSOR TANGAN FULL 1 TANGAN (MediaPipe)
// Menampilkan kerangka tangan penuh (kanan/kiri) persis seperti
// di halaman Pilih Level dan Game Susun Kalimat.
// Saat anak sedang membaca, sensor disembunyikan sementara
// supaya tidak menekan tombol tanpa sengaja.
// ============================================================

const CFG = {
  detectConf: 0.6,
  trackConf: 0.5,
  smooth: 0.5,
  edgeMargin: 0.08,
  lostGraceFrames: 20,
  hitRadius: 20,
  dwellMs: 1200,
  lockDistance: 60
};

let smoothX = null;
let smoothY = null;
let lostFrames = 0;

let hoverEl = null;
let dwellStart = 0;
let dwellLock = null;

class OneEuro {
  constructor() {
    this.reset();
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = 0;
  }

  static alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x, t) {
    if (this.xPrev === null) {
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = t;

      return x;
    }

    const dt = Math.max((t - this.tPrev) / 1000, 0.001);

    this.tPrev = t;

    const dx = (x - this.xPrev) / dt;

    this.dxPrev += OneEuro.alpha(1, dt) * (dx - this.dxPrev);

    const cutoff = 0.8 + 0.05 * Math.abs(this.dxPrev);

    this.xPrev += OneEuro.alpha(cutoff, dt) * (x - this.xPrev);

    return this.xPrev;
  }
}

const cursorXFilter = new OneEuro();
const cursorYFilter = new OneEuro();

const handCanvas = document.createElement('canvas');

handCanvas.style.cssText =
  'position:fixed;left:0;top:0;pointer-events:none;' +
  'z-index:2147483000;display:none;';

document.body.appendChild(handCanvas);

const handCtx = handCanvas.getContext('2d');

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const FINGER_TIPS = [4, 8, 12, 16, 20];

function drawHand(landmarks, toScreen) {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (
    handCanvas.width !== Math.round(width * dpr) ||
    handCanvas.height !== Math.round(height * dpr)
  ) {
    handCanvas.width = Math.round(width * dpr);
    handCanvas.height = Math.round(height * dpr);

    handCanvas.style.width = `${width}px`;
    handCanvas.style.height = `${height}px`;
  }

  handCanvas.style.display = 'block';

  handCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  handCtx.clearRect(0, 0, width, height);

  handCtx.lineCap = 'round';
  handCtx.lineJoin = 'round';
  handCtx.lineWidth = 4;
  handCtx.strokeStyle = '#60a5fa';

  handCtx.beginPath();

  HAND_CONNECTIONS.forEach(([a, b]) => {
    const p = toScreen(landmarks[a]);
    const q = toScreen(landmarks[b]);

    handCtx.moveTo(p.x, p.y);
    handCtx.lineTo(q.x, q.y);
  });

  handCtx.stroke();

  for (let i = 0; i < landmarks.length; i++) {
    const p = toScreen(landmarks[i]);
    const isTip = FINGER_TIPS.includes(i);

    handCtx.beginPath();

    handCtx.arc(
      p.x,
      p.y,
      isTip ? 11 : 6,
      0,
      Math.PI * 2
    );

    handCtx.fillStyle =
      i === 8 ? '#f97316' : '#ffffff';

    handCtx.fill();

    handCtx.lineWidth = 2;
    handCtx.strokeStyle = '#3b82f6';

    handCtx.stroke();
  }
}

function setCursorProgress(progress) {
  if (!virtualCursorEl) return;

  const px = Math.max(0, Math.min(1, progress)) * 10;

  virtualCursorEl.style.boxShadow =
    px > 0
      ? `0 0 0 ${px}px rgba(249,115,22,0.35)`
      : '';
}

function resetDwell() {
  if (hoverEl) {
    hoverEl.classList.remove('cursor-hover');
  }

  hoverEl = null;
  dwellStart = 0;

  setCursorProgress(0);
}

function cariTombolDekat(x, y) {
  const radius = CFG.hitRadius;

  const offsets = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius]
  ];

  for (const [dx, dy] of offsets) {
    const element = document.elementFromPoint(x + dx, y + dy);

    const target = element
      ? element.closest('.interactive-elem')
      : null;

    if (target && !target.disabled) return target;
  }

  return null;
}

function updateDwell(x, y, now) {
  if (dwellLock) {
    const distance = Math.hypot(x - dwellLock.x, y - dwellLock.y);

    if (distance < CFG.lockDistance) {
      resetDwell();
      return;
    }

    dwellLock = null;
  }

  const target = cariTombolDekat(x, y);

  if (!target) {
    resetDwell();
    return;
  }

  if (target !== hoverEl) {
    resetDwell();

    hoverEl = target;
    hoverEl.classList.add('cursor-hover');

    dwellStart = now;
    return;
  }

  const progress = (now - dwellStart) / CFG.dwellMs;

  setCursorProgress(progress);

  if (progress >= 1) {
    const clickTarget = hoverEl;

    dwellLock = { x, y };

    resetDwell();

    clickTarget.click();
  }
}

function onResults(results) {
  const now = performance.now();
  const daftarTangan = results.multiHandLandmarks;

  if (!daftarTangan || daftarTangan.length === 0) {
    lostFrames++;

    if (lostFrames > CFG.lostGraceFrames) {
      if (gestureStatusEl) {
        gestureStatusEl.textContent = 'Mencari Tangan...';
      }

      if (cameraDotEl) {
        cameraDotEl.className =
          'w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping';
      }

      if (virtualCursorEl) {
        virtualCursorEl.style.display = 'none';
      }

      handCanvas.style.display = 'none';

      resetDwell();

      smoothX = null;
      smoothY = null;

      cursorXFilter.reset();
      cursorYFilter.reset();
    }

    return;
  }

  lostFrames = 0;

  if (cameraDotEl) {
    cameraDotEl.className =
      'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';
  }

  // Saat membaca, tangan tidak dipakai: sembunyikan kursor dan jaring tangan.
  if (mode === 'mendengar' || mode === 'menilai') {
    if (gestureStatusEl) {
      gestureStatusEl.textContent = 'Sedang membaca 🎤';
    }

    if (virtualCursorEl) {
      virtualCursorEl.style.display = 'none';
    }

    handCanvas.style.display = 'none';

    resetDwell();

    return;
  }

  const raw = daftarTangan[0];
  const indexTip = raw[8];
  const margin = CFG.edgeMargin;

  const targetX =
    Math.min(
      1,
      Math.max(0, ((1 - indexTip.x) - margin) / (1 - 2 * margin))
    ) * window.innerWidth;

  const targetY =
    Math.min(
      1,
      Math.max(0, (indexTip.y - margin) / (1 - 2 * margin))
    ) * window.innerHeight;

  if (smoothX === null) {
    smoothX = targetX;
    smoothY = targetY;
  } else {
    smoothX += (targetX - smoothX) * CFG.smooth;
    smoothY += (targetY - smoothY) * CFG.smooth;
  }

  smoothX = cursorXFilter.filter(smoothX, now);
  smoothY = cursorYFilter.filter(smoothY, now);

  if (gestureStatusEl) {
    gestureStatusEl.textContent = 'Telunjuk Aktif 👆';
  }

  if (virtualCursorEl) {
    virtualCursorEl.style.display = 'flex';
    virtualCursorEl.style.left = `${smoothX}px`;
    virtualCursorEl.style.top = `${smoothY}px`;
    virtualCursorEl.textContent = '👆';
  }

  const toScreen = point => ({
    x:
      Math.min(
        1,
        Math.max(
          0,
          ((1 - point.x) - margin) / (1 - 2 * margin)
        )
      ) * window.innerWidth,

    y:
      Math.min(
        1,
        Math.max(
          0,
          (point.y - margin) / (1 - 2 * margin)
        )
      ) * window.innerHeight
  });

  drawHand(raw, toScreen);
  updateDwell(smoothX, smoothY, now);
}

function mulaiKamera() {
  if (
    typeof Hands === 'undefined' ||
    typeof Camera === 'undefined' ||
    !videoElement
  ) {
    if (gestureStatusEl) {
      gestureStatusEl.textContent = 'Mode Sentuh Aktif';
    }

    console.warn(
      'MediaPipe atau elemen webcam tidak tersedia. ' +
      'Tombol tetap dapat ditekan dengan mouse atau layar sentuh.'
    );

    return;
  }

  try {
    const hands = new Hands({
      locateFile: file =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: CFG.detectConf,
      minTrackingConfidence: CFG.trackConf
    });

    hands.onResults(onResults);

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });

    camera.start().catch(error => {
      console.warn('Kamera tidak tersedia:', error);

      if (gestureStatusEl) {
        gestureStatusEl.textContent = 'Mode Sentuh Saja';
      }

      if (cameraDotEl) {
        cameraDotEl.className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
      }
    });
  } catch (error) {
    console.warn('Sensor telunjuk tidak tersedia:', error);

    if (gestureStatusEl) {
      gestureStatusEl.textContent = 'Mode Sentuh Aktif';
    }
  }
}

// ============================================================
// BERSIH-BERSIH SAAT HALAMAN DITUTUP
// ============================================================

function hentikanSemuaSuara() {
  batalkanMendengar();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

window.addEventListener('pagehide', hentikanSemuaSuara);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'mendengar') {
    batalkanMendengar();

    statusLine('Mikrofon dimatikan karena halaman ditinggalkan. Tekan mikrofon untuk lanjut.');
  }
});

// ============================================================
// JALANKAN GAME
// ============================================================

renderSoal();

if (!SpeechRecognitionAPI) {
  tampilkanCatatan('tidak-didukung');
  statusLine('');
  perbaruiTombol();
} else if (window.isSecureContext === false) {
  tampilkanCatatan('tidak-aman');
}

mulaiKamera();