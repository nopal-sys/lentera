
'use strict';

// ============================================================
// LENTERA GAME 1 — LITERASI
// Memakai bank soal asli: soal-misi1.js
// Semua soal pada level terpilih digunakan untuk misi Dashboard.
// Kompetensi pencatatan berasal dari token Dashboard.
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
const ssoToken = urlParams.get('ssoToken') || '';
const legacySsoToken = ssoToken || 'DEMO_TOKEN_123';

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
    menyusun_kalimat: 'LT-KALIMAT',
    MENYUSUN_KALIMAT: 'LT-KALIMAT',
    kosakata: 'LT-KOSAKATA',
    KOSAKATA: 'LT-KOSAKATA',
    membaca_lancar: 'LT-LANCAR',
    MEMBACA_LANCAR: 'LT-LANCAR',
    pemahaman_bacaan: 'LT-PAHAM',
    PEMAHAMAN_BACAAN: 'LT-PAHAM'
  };

  return aliases[value] || value;
}

const dashboardSession = ssoToken
  ? decodeJwtPayload(ssoToken)
  : null;

const dashboardCompetency = normalizeCompetency(
  dashboardSession?.kompetensi ||
  urlParams.get('kompetensi') ||
  ''
);

const dashboardApiUrl = dashboardSession?.api || '';
const dashboardHomeUrl = dashboardSession?.home || '';

const hasDashboardSession = Boolean(
  ssoToken &&
  dashboardSession &&
  dashboardApiUrl &&
  dashboardSession.misi &&
  dashboardCompetency
);

// ============================================================
// BANK SOAL ASLI
// soal-misi1.js harus dimuat sebelum misi1.js.
// ============================================================

if (
  typeof questions === 'undefined' ||
  !Array.isArray(questions) ||
  questions.length === 0
) {
  alert(
    'Bank soal tidak ditemukan. Pastikan soal-misi1.js ' +
    'dimuat sebelum misi1.js.'
  );

  throw new Error('Bank soal kosong atau belum dimuat.');
}

function validateQuestions() {
  const ids = new Set();

  questions.forEach((q, index) => {
    const label = `Soal ${index + 1} (${q.id || 'tanpa ID'})`;

    if (!q.id) {
      console.warn(`${label}: ID kosong.`);
    } else if (ids.has(q.id)) {
      console.warn(`${label}: ID duplikat.`);
    }

    ids.add(q.id);

    if (!Array.isArray(q.words) || !Array.isArray(q.correctOrder)) {
      console.warn(`${label}: words/correctOrder tidak valid.`);
      return;
    }

    if (q.correctOrder.length === 0) {
      console.warn(`${label}: correctOrder kosong.`);
      return;
    }

    const pool = [...q.words];

    q.correctOrder.forEach(word => {
      const pos = pool.indexOf(word);

      if (pos === -1) {
        console.warn(
          `${label}: kata "${word}" tidak ditemukan di words.`
        );
      } else {
        pool.splice(pos, 1);
      }
    });
  });
}

validateQuestions();

// ============================================================
// LEVEL
// ============================================================

const LEVEL_PAGE = 'level.html';

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

// PENTING:
// Jangan memfilter berdasarkan kompetensiDashboard.
// Semua soal lama pada level ini dimainkan bersama-sama.
const levelQuestions = questions.filter(
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

if (levelQuestions.length === 0) {
  alert(`Level ${currentLevel} belum memiliki soal.`);

  window.location.replace(
    hasDashboardSession && dashboardHomeUrl
      ? dashboardHomeUrl
      : LEVEL_PAGE
  );

  throw new Error(`Soal Level ${currentLevel} tidak ditemukan.`);
}

function levelPageUrl() {
  // Setelah misi dari Dashboard, kembali ke Dashboard.
  if (hasDashboardSession && dashboardHomeUrl) {
    return dashboardHomeUrl;
  }

  const params = new URLSearchParams();

  if (ssoToken) {
    params.set('ssoToken', ssoToken);
  }

  if (dashboardCompetency) {
    params.set('kompetensi', dashboardCompetency);
  }

  const query = params.toString();

  return query
    ? `${LEVEL_PAGE}?${query}`
    : LEVEL_PAGE;
}

// ============================================================
// STATE PERMAINAN
// ============================================================

let currentQuestionIdx = 0;
let selectedWords = [];
let availableWords = [];
let grabbedWord = null;
let startTime = Date.now();

let sesiId = buatSesiId();
let soalState = {};

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

function getSoalState(q) {
  if (!soalState[q.id]) {
    soalState[q.id] = {
      mulai: Date.now(),
      jumlahSalah: 0,
      selesai: false,
      waktuDetik: 0
    };
  }

  return soalState[q.id];
}

// ============================================================
// PENILAIAN ASLI GAME 1
// ============================================================

const SKOR_PER_PERCOBAAN = [100, 75, 50];
const SKOR_MINIMUM = 25;

function hitungSkorSoal(jumlahSalah) {
  return jumlahSalah < SKOR_PER_PERCOBAAN.length
    ? SKOR_PER_PERCOBAAN[jumlahSalah]
    : SKOR_MINIMUM;
}

function tentukanPredikat(nilai) {
  if (nilai >= 100) return 'Sempurna';
  if (nilai >= 90) return 'Sangat Baik';
  if (nilai >= 75) return 'Baik';
  if (nilai >= 60) return 'Cukup';
  return 'Perlu Pendampingan';
}

function hitungHasilLevel() {
  const daftar = levelQuestions.map(q => {
    const state = getSoalState(q);

    return {
      soal_id: q.id,
      jumlah_salah: state.jumlahSalah,
      skor: hitungSkorSoal(state.jumlahSalah),
      waktu_detik: state.waktuDetik
    };
  });

  const total = daftar.length;

  const nilai = total
    ? Math.round(
        daftar.reduce((totalSkor, item) => (
          totalSkor + item.skor
        ), 0) / total * 10
      ) / 10
    : 0;

  const langsungBenar = daftar.filter(
    item => item.jumlah_salah === 0
  ).length;

  return {
    daftar,
    total,
    nilai,
    langsungBenar,
    predikat: tentukanPredikat(nilai)
  };
}

// ============================================================
// ELEMEN HALAMAN
// ============================================================

const soalNumEl = document.getElementById('soal-num');
const soalTotalEl = document.getElementById('soal-total');
const soalGambarEl = document.getElementById('soal-gambar');
const soalInstruksiEl = document.getElementById('soal-instruksi');
const levelBadgeEl = document.getElementById('level-badge');
const progressBarEl = document.getElementById('progress-bar');
const dropZoneEl = document.getElementById('drop-zone');
const wordBankEl = document.getElementById('word-bank');

const gestureStatusEl = document.getElementById('gesture-status');
const cameraDotEl = document.getElementById('camera-dot');
const virtualCursorEl = document.getElementById('virtual-cursor');
const floatingWordEl = document.getElementById('floating-word');

const successModalEl = document.getElementById('success-modal');
const errorModalEl = document.getElementById('error-modal');
const modalErrorDescEl = document.getElementById('modal-error-desc');

const resultModalEl = document.getElementById('result-modal');
const resultScoreEl = document.getElementById('result-score');
const resultCorrectEl = document.getElementById('result-correct');
const resultLevelLabelEl = document.getElementById('result-level-label');
const confettiLayerEl = document.getElementById('confetti-layer');

const videoElement = document.getElementById('webcam');

const imageModalEl = document.getElementById('image-modal');
const imageModalContentEl = document.getElementById('image-modal-content');
const imageModalCaptionEl = document.getElementById('image-modal-caption');

const IMAGE_PATH_REGEX = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i;

// ============================================================
// LAPORAN LOKAL FLASK — DIPERTAHANKAN
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
  return kirimJson('/api/misi1/soal', {
    ssoToken: legacySsoToken,
    sesi_id: sesiId,
    level: q.level,
    soal_id: q.id,
    jumlah_salah: state.jumlahSalah,
    waktu_detik: state.waktuDetik
  });
}

function kirimHasilLevel(hasil) {
  return kirimJson('/api/misi1/level', {
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
// ============================================================

const dashboardEventPromises = [];

function kirimEventDashboard(event) {
  if (!hasDashboardSession || !dashboardApiUrl) {
    return Promise.resolve({
      ok: true,
      dilewati: true
    });
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

      return {
        ok: true,
        data: body
      };
    })
    .catch(error => {
      console.error('Jawaban gagal dikirim ke Dashboard:', error);

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
    return {
      ok: true,
      dilewati: true
    };
  }

  // Pastikan pengiriman jawaban sebelumnya selesai terlebih dahulu.
  const hasilEvent = await Promise.all(dashboardEventPromises);
  const gagal = hasilEvent.find(item => !item.ok);

  if (gagal) {
    return {
      ok: false,
      error: gagal.error
    };
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

    if (
      !response.ok ||
      body.error ||
      body.selesai !== true
    ) {
      return {
        ok: false,
        error: body.error || (
          `Dashboard belum menyatakan misi selesai. HTTP ${response.status}`
        )
      };
    }

    console.info('Misi selesai tercatat di Dashboard.', body);

    return {
      ok: true,
      data: body
    };
  } catch (error) {
    console.error('Konfirmasi penyelesaian misi gagal:', error);

    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

// ============================================================
// GAMBAR DAN ZOOM
// ============================================================

function disableImageZoom() {
  soalGambarEl.classList.remove(
    'interactive-elem',
    'cursor-pointer'
  );

  soalGambarEl.onclick = null;
  soalGambarEl.removeAttribute('title');
}

function isImageZoomOpen() {
  return !imageModalEl.classList.contains('hidden');
}

function renderGambar(q) {
  const gambar = String(q.gambar || '').trim();

  soalGambarEl.innerHTML = '';
  disableImageZoom();

  if (!gambar) {
    soalGambarEl.innerText = '🖼️';
    return;
  }

  if (IMAGE_PATH_REGEX.test(gambar)) {
    const img = document.createElement('img');

    img.src = gambar;
    img.alt = String(q.instruksi || '').replace(/"/g, '');
    img.className = 'w-full h-full object-contain';

    img.onerror = () => {
      console.warn(`Gambar tidak ditemukan: ${gambar}`);

      soalGambarEl.innerHTML = '';
      soalGambarEl.innerText = '🖼️';

      disableImageZoom();
    };

    soalGambarEl.appendChild(img);
  } else {
    soalGambarEl.innerText = gambar;
  }

  enableImageZoom(q, gambar);
}

function enableImageZoom(q, gambar) {
  soalGambarEl.classList.add(
    'interactive-elem',
    'cursor-pointer'
  );

  soalGambarEl.title = 'Klik untuk memperbesar gambar';
  soalGambarEl.onclick = () => openImageZoom(q, gambar);

  const hint = document.createElement('span');

  hint.className =
    'absolute bottom-1 right-1 bg-white/90 border border-slate-200 ' +
    'rounded-full w-6 h-6 flex items-center justify-center text-xs shadow ' +
    'pointer-events-none';

  hint.innerText = '🔍';

  soalGambarEl.appendChild(hint);
}

function openImageZoom(q, gambar) {
  imageModalContentEl.innerHTML = '';

  if (IMAGE_PATH_REGEX.test(gambar)) {
    const img = document.createElement('img');

    img.src = gambar;
    img.alt = String(q.instruksi || '').replace(/"/g, '');
    img.className = 'w-full h-full object-contain';

    imageModalContentEl.appendChild(img);
  } else {
    const emoji = document.createElement('div');

    emoji.className = 'leading-none text-center';
    emoji.style.fontSize = 'min(40vw, 30vh)';
    emoji.innerText = gambar;

    imageModalContentEl.appendChild(emoji);
  }

  imageModalCaptionEl.innerText = q.instruksi || '';
  imageModalEl.classList.remove('hidden');

  resetDwell();
  dwellLock = null;
}

function closeImageZoom() {
  if (!isImageZoomOpen()) return;

  imageModalEl.classList.add('hidden');
  imageModalContentEl.innerHTML = '';

  resetDwell();
}

document.getElementById('image-modal-close').onclick = closeImageZoom;

imageModalEl.addEventListener('click', event => {
  if (event.target === imageModalEl) {
    closeImageZoom();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeImageZoom();
  }
});

// ============================================================
// TAMPILKAN DAN PILIH SOAL
// ============================================================

function renderQuestion() {
  const q = levelQuestions[currentQuestionIdx];
  if (!q) return;

  getSoalState(q);

  soalNumEl.innerText = currentQuestionIdx + 1;
  soalTotalEl.innerText = levelQuestions.length;

  closeImageZoom();
  renderGambar(q);

  soalInstruksiEl.innerText = q.instruksi;
  levelBadgeEl.innerText = `Level ${q.level}`;

  progressBarEl.style.width =
    `${((currentQuestionIdx + 1) / levelQuestions.length) * 100}%`;

  selectedWords = [];
  availableWords = [...q.words];
  grabbedWord = null;

  renderWordBank();
  renderDropZone();

  startTime = Date.now();
}

function renderWordBank() {
  wordBankEl.innerHTML = '';

  availableWords.forEach(word => {
    const btn = document.createElement('div');

    btn.className =
      'word-card interactive-word bg-white border-2 border-slate-200 ' +
      'hover:border-orange-400 font-semibold text-slate-700 px-4 py-2 ' +
      'rounded-xl shadow-sm text-xs cursor-pointer';

    btn.dataset.word = word;
    btn.innerText = word;

    btn.onclick = () => {
      if (grabbedWord) return;

      const index = availableWords.indexOf(word);
      if (index === -1) return;

      availableWords.splice(index, 1);
      selectedWords.push(word);

      renderWordBank();
      renderDropZone();
    };

    wordBankEl.appendChild(btn);
  });
}

function renderDropZone() {
  dropZoneEl.innerHTML = '';

  if (selectedWords.length === 0) {
    dropZoneEl.innerHTML =
      '<span class="text-xs text-slate-400 italic">' +
      'Cubit kata di bawah, seret, lalu lepaskan di sini...' +
      '</span>';

    return;
  }

  selectedWords.forEach((word, index) => {
    const chip = document.createElement('div');

    chip.className =
      'word-card interactive-cancel bg-orange-500 text-white ' +
      'font-semibold px-3 py-1.5 rounded-xl flex items-center gap-2 ' +
      'shadow-sm text-xs cursor-pointer';

    const wordSpan = document.createElement('span');
    wordSpan.textContent = word;

    const closeSpan = document.createElement('span');
    closeSpan.className = 'text-orange-200 font-bold text-xs';
    closeSpan.textContent = '✕';

    chip.appendChild(wordSpan);
    chip.appendChild(closeSpan);

    chip.onclick = () => {
      selectedWords.splice(index, 1);
      availableWords.push(word);

      renderWordBank();
      renderDropZone();
    };

    dropZoneEl.appendChild(chip);
  });
}

function resetAnswer() {
  renderQuestion();
}

function playAudioPrompt() {
  const q = levelQuestions[currentQuestionIdx];

  const utterance = new SpeechSynthesisUtterance(
    String(q.instruksi || '').replace(/"/g, '')
  );

  utterance.lang = 'id-ID';

  window.speechSynthesis.speak(utterance);
}

document.getElementById('audio-btn').onclick = playAudioPrompt;
document.getElementById('reset-btn').onclick = resetAnswer;
document.getElementById('submit-btn').onclick = submitAnswer;

document.getElementById('back-btn').onclick = () => {
  successModalEl.classList.add('hidden');
  errorModalEl.classList.add('hidden');

  if (currentQuestionIdx > 0) {
    currentQuestionIdx--;
    renderQuestion();
  } else {
    window.location.href = levelPageUrl();
  }
};

document.getElementById('modal-close-btn').onclick = () => {
  errorModalEl.classList.add('hidden');
};

document.getElementById('success-next-btn').onclick = () => {
  successModalEl.classList.add('hidden');

  if (currentQuestionIdx + 1 < levelQuestions.length) {
    currentQuestionIdx++;
    renderQuestion();
  } else {
    showResult();
  }
};

// ============================================================
// HASIL, NILAI, DAN ANIMASI
// ============================================================

function launchConfetti() {
  confettiLayerEl.innerHTML = '';

  const colors = [
    '#f97316',
    '#fbbf24',
    '#f43f5e',
    '#3b82f6',
    '#10b981',
    '#a855f7',
    '#ffffff'
  ];

  const emojis = ['⭐', '🎉', '✨', '🎊'];

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('span');

    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${2.5 + Math.random() * 3}s`;
    piece.style.animationDelay = `${Math.random() * 3}s`;

    if (i % 7 === 0) {
      piece.innerText =
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

    resultScoreEl.innerText = Math.round(target * eased);

    if (t < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function hitungBintang(nilai) {
  if (nilai < 50) return 1;
  if (nilai < 80) return 2;
  return 3;
}

function tampilkanBintang(nilai) {
  const jumlah = hitungBintang(nilai);

  document.querySelectorAll('#result-stars .result-star')
    .forEach((element, index) => {
      element.classList.toggle('off', index >= jumlah);
    });
}

function showResult() {
  const hasil = hitungHasilLevel();

  resultLevelLabelEl.innerText = `Level ${currentLevel} Selesai`;
  resultCorrectEl.innerText =
    `${hasil.langsungBenar}/${hasil.total}`;

  document.getElementById('result-predikat').innerText =
    hasil.predikat;

  resultScoreEl.innerText = '0';

  tampilkanBintang(hasil.nilai);

  resultModalEl.classList.remove('hidden');

  launchConfetti();

  setTimeout(() => countUpScore(hasil.nilai), 400);

  // Simpan nilai dan laporan di backend Flask lama.
  kirimHasilLevel(hasil);

  // Konfirmasi misi ke Dashboard hanya setelah seluruh event
  // jawaban selesai dikirim.
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

document.getElementById('result-level-btn').onclick = () => {
  window.location.href = levelPageUrl();
};

document.getElementById('result-retry-btn').onclick = () => {
  // Misi dari Dashboard tidak diulang melalui sesi yang sama.
  if (hasDashboardSession && dashboardHomeUrl) {
    window.location.href = dashboardHomeUrl;
    return;
  }

  resultModalEl.classList.add('hidden');
  confettiLayerEl.innerHTML = '';

  currentQuestionIdx = 0;
  sesiId = buatSesiId();
  soalState = {};

  renderQuestion();
};

// ============================================================
// PENILAIAN JAWABAN DAN PENGIRIMAN KE DJANGO
// ============================================================

async function submitAnswer() {
  // FIX: jangan proses jika salah satu popup jawaban masih terbuka.
  if (
    !errorModalEl.classList.contains('hidden') ||
    !successModalEl.classList.contains('hidden')
  ) {
    return;
  }

  const q = levelQuestions[currentQuestionIdx];
  const state = getSoalState(q);

  const responseTimeMs = Math.max(
    0,
    Date.now() - startTime
  );

  const userSentence = selectedWords.join(' ');

  const semuaJawabanBenar = [
    q.correctOrder,
    ...(Array.isArray(q.jawabanLain) ? q.jawabanLain : [])
  ];

  const kunci = arr => [...arr].sort().join('|');

  const isCorrect = q.urutanBebas
    ? semuaJawabanBenar.some(
        susunan => kunci(susunan) === kunci(selectedWords)
      )
    : semuaJawabanBenar.some(
        susunan => susunan.join(' ') === userSentence
      );

  let errorPattern = '';

  if (!isCorrect) {
    const userKey = selectedWords.join('_');

    if (q.urutanBebas) {
      const sisa = [...q.correctOrder];

      const semuaBenar = selectedWords.every(word => {
        const index = sisa.indexOf(word);

        if (index === -1) return false;

        sisa.splice(index, 1);
        return true;
      });

      errorPattern =
        (q.errorPatterns && q.errorPatterns[userKey]) ||
        (semuaBenar ? 'JAWABAN_KURANG' : 'PILIHAN_SALAH');

      modalErrorDescEl.innerText = semuaBenar
        ? `Jawabanmu: "${userSentence}". Pilihanmu sudah benar, tetapi masih ada yang kurang.`
        : `Jawabanmu: "${userSentence}". Ada pilihan yang tidak sesuai gambar. Coba lagi!`;

    } else {
      errorPattern =
        (q.errorPatterns && q.errorPatterns[userKey]) ||
        'URUTAN_TIDAK_TETAP';

      modalErrorDescEl.innerText =
        `Susunanmu: "${userSentence}" masih salah. Ayo coba lagi!`;
    }

    errorModalEl.classList.remove('hidden');

    if (!state.selesai && selectedWords.length > 0) {
      state.jumlahSalah++;
    }

  } else {
    successModalEl.classList.remove('hidden');

    if (!state.selesai) {
      state.selesai = true;

      state.waktuDetik = Math.round(
        (Date.now() - state.mulai) / 1000
      );

      // Laporan lokal hanya dikirim ketika soal berhasil dijawab.
      kirimHasilSoal(q, state);
    }
  }

  // Kompetensi dari token diprioritaskan saat game dibuka
  // melalui Dashboard. Semua soal lama level itu digunakan.
  const kompetensiUntukDashboard = hasDashboardSession
    ? dashboardCompetency
    : normalizeCompetency(
        q.kompetensiDashboard ||
        q.kompetensi ||
        ''
      );

  await kirimEventDashboard({
    event_id: buatEventId(),
    item_id: q.id,
    question_id: q.id,
    kompetensi: kompetensiUntukDashboard,
    level: currentLevel,
    benar: isCorrect,
    is_correct: isCorrect,
    pola: errorPattern,
    error_code: errorPattern,
    error_pattern: errorPattern,
    waktu_ms: responseTimeMs,
    response_time_ms: responseTimeMs,
    petunjuk: false,
    used_hint: false,
    waktu: new Date().toISOString()
  });
}

// ============================================================
// SENSOR GESTUR MEDIAPIPE
// ============================================================

const CFG = {
  detectConf: 0.6,
  trackConf: 0.5,
  filterMinCutoff: 0.8,
  filterBeta: 0.05,
  filterDCutoff: 1.0,
  smooth: 0.5,
  edgeMargin: 0.08,
  pinchOn: 0.50,
  pinchOff: 0.80,
  pinchOnFrames: 2,
  pinchOffFrames: 3,
  lostGraceFrames: 20,
  grabWindowMs: 700,
  grabPadding: 40,
  dropPadding: 40,
  hitRadius: 20,
  dwellMs: 1200,
  lockDistance: 60
};

let smoothX = null;
let smoothY = null;

let pinchActive = false;
let pinchFrames = 0;
let openFrames = 0;
let lostFrames = 0;

let releasePos = null;
let pinchStartAt = 0;

let hoverEl = null;
let dwellStart = 0;
let dwellLock = null;

// ============================================================
// ONE EURO FILTER
// ============================================================

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

    const dt = Math.max(
      (t - this.tPrev) / 1000,
      0.001
    );

    this.tPrev = t;

    const dx = (x - this.xPrev) / dt;

    this.dxPrev +=
      OneEuro.alpha(CFG.filterDCutoff, dt) *
      (dx - this.dxPrev);

    const cutoff =
      CFG.filterMinCutoff +
      CFG.filterBeta * Math.abs(this.dxPrev);

    this.xPrev +=
      OneEuro.alpha(cutoff, dt) * (x - this.xPrev);

    return this.xPrev;
  }
}

const lmFilters = Array.from(
  { length: 21 },
  () => ({
    x: new OneEuro(),
    y: new OneEuro()
  })
);

function resetLandmarkFilters() {
  lmFilters.forEach(filter => {
    filter.x.reset();
    filter.y.reset();
  });
}

function smoothLandmarks(raw, vw, vh, t) {
  return raw.map((point, index) => ({
    x: lmFilters[index].x.filter(point.x * vw, t) / vw,
    y: lmFilters[index].y.filter(point.y * vh, t) / vh
  }));
}

// ============================================================
// KANVAS PENANDA TANGAN
// ============================================================

const DOT_COLORS = {
  line: '#60a5fa',
  joint: '#ffffff',
  jointEdge: '#3b82f6',
  tipEdge: '#ffffff',
  open: '#f97316',
  near: '#fbbf24',
  pinch: '#10b981',
  shadow: 'rgba(15, 23, 42, 0.35)'
};

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const FINGER_TIPS = [4, 8, 12, 16, 20];

const handCanvas = document.createElement('canvas');

handCanvas.style.cssText =
  'position:fixed;left:0;top:0;pointer-events:none;' +
  'z-index:2147483000;display:none;';

document.body.appendChild(handCanvas);

const handCtx = handCanvas.getContext('2d');

const camCanvas = document.createElement('canvas');

camCanvas.style.cssText =
  'position:fixed;pointer-events:none;' +
  'z-index:2147483001;display:none;';

document.body.appendChild(camCanvas);

const camCtx = camCanvas.getContext('2d');

function hideMarkers() {
  handCanvas.style.display = 'none';
  camCanvas.style.display = 'none';
}

function paintHand(ctx, pointAt, state, scale) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = DOT_COLORS.shadow;
  ctx.shadowBlur = 6 * scale;

  ctx.lineWidth = 4 * scale;
  ctx.strokeStyle = DOT_COLORS.line;
  ctx.beginPath();

  HAND_CONNECTIONS.forEach(([a, b]) => {
    const p = pointAt(a);
    const q = pointAt(b);

    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  });

  ctx.stroke();

  if (state !== 'open') {
    const thumb = pointAt(4);
    const index = pointAt(8);

    ctx.lineWidth = 5 * scale;
    ctx.strokeStyle =
      state === 'pinch'
        ? DOT_COLORS.pinch
        : DOT_COLORS.near;

    ctx.beginPath();
    ctx.moveTo(thumb.x, thumb.y);
    ctx.lineTo(index.x, index.y);
    ctx.stroke();
  }

  for (let id = 0; id < 21; id++) {
    const point = pointAt(id);
    const isTip = FINGER_TIPS.includes(id);

    let fill = DOT_COLORS.joint;

    if (id === 4 || id === 8) {
      if (state === 'pinch') {
        fill = DOT_COLORS.pinch;
      } else if (state === 'near') {
        fill = DOT_COLORS.near;
      } else {
        fill = DOT_COLORS.open;
      }
    }

    ctx.beginPath();

    ctx.arc(
      point.x,
      point.y,
      (isTip ? 13 : 7) * scale,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = fill;
    ctx.fill();

    ctx.lineWidth = (isTip ? 3 : 2) * scale;

    ctx.strokeStyle =
      isTip
        ? DOT_COLORS.tipEdge
        : DOT_COLORS.jointEdge;

    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

function drawMarkers(landmarks, toScreen, state) {
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

  paintHand(
    handCtx,
    id => toScreen(landmarks[id]),
    state,
    1
  );

  const rect = videoElement.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const w = Math.round(rect.width);
  const h = Math.round(rect.height);

  if (camCanvas.width !== w || camCanvas.height !== h) {
    camCanvas.width = w;
    camCanvas.height = h;
  }

  camCanvas.style.display = 'block';
  camCanvas.style.left = `${rect.left}px`;
  camCanvas.style.top = `${rect.top}px`;
  camCanvas.style.width = `${w}px`;
  camCanvas.style.height = `${h}px`;

  const vw = videoElement.videoWidth || 4;
  const vh = videoElement.videoHeight || 3;

  const scale = Math.max(w / vw, h / vh);

  const dw = vw * scale;
  const dh = vh * scale;

  const ox = (w - dw) / 2;
  const oy = (h - dh) / 2;

  camCtx.clearRect(0, 0, w, h);

  paintHand(
    camCtx,
    id => ({
      x: ox + (1 - landmarks[id].x) * dw,
      y: oy + landmarks[id].y * dh
    }),
    state,
    0.4
  );
}

// ============================================================
// KURSOR DAN DWELL CLICK
// ============================================================

function setCursorProgress(progress) {
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

function findInteractiveNear(x, y) {
  const radius = CFG.hitRadius;

  const offsets = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius]
  ];

  for (const [dx, dy] of offsets) {
    const element = document.elementFromPoint(
      x + dx,
      y + dy
    );

    const hit = element
      ? element.closest('.interactive-elem, .interactive-cancel')
      : null;

    if (hit) return hit;
  }

  return null;
}

function findWordNear(x, y) {
  const padding = CFG.grabPadding;

  let best = null;
  let bestDistance = Infinity;

  document.querySelectorAll('.interactive-word').forEach(element => {
    const rect = element.getBoundingClientRect();

    if (
      x >= rect.left - padding &&
      x <= rect.right + padding &&
      y >= rect.top - padding &&
      y <= rect.bottom + padding
    ) {
      const distance = Math.hypot(
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        best = element;
      }
    }
  });

  return best;
}

function isInsideDropZone(x, y) {
  const rect = dropZoneEl.getBoundingClientRect();
  const padding = CFG.dropPadding;

  return (
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding
  );
}

function updateDwell(x, y, now) {
  if (dwellLock) {
    const distance = Math.hypot(
      x - dwellLock.x,
      y - dwellLock.y
    );

    if (distance < CFG.lockDistance) {
      resetDwell();
      return;
    }

    dwellLock = null;
  }

  const target = findInteractiveNear(x, y);

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
    const targetClick = hoverEl;

    dwellLock = { x, y };

    resetDwell();

    targetClick.click();
  }
}

function dropGrabbedWord(x, y) {
  if (!grabbedWord) return;

  if (isInsideDropZone(x, y)) {
    selectedWords.push(grabbedWord);
  } else {
    availableWords.push(grabbedWord);
  }

  grabbedWord = null;
  floatingWordEl.style.display = 'none';

  renderWordBank();
  renderDropZone();
}

// ============================================================
// HASIL MEDIAPIPE
// ============================================================

function onResults(results) {
  const now = performance.now();

  if (
    !results.multiHandLandmarks ||
    results.multiHandLandmarks.length === 0
  ) {
    lostFrames++;

    if (lostFrames > CFG.lostGraceFrames) {
      gestureStatusEl.innerText = 'Mencari Tangan...';

      cameraDotEl.className =
        'w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping';

      virtualCursorEl.style.display = 'none';
      floatingWordEl.style.display = 'none';

      hideMarkers();
      resetDwell();

      pinchActive = false;
      pinchFrames = 0;
      openFrames = 0;

      smoothX = null;
      smoothY = null;

      resetLandmarkFilters();

      if (grabbedWord) {
        availableWords.push(grabbedWord);
        grabbedWord = null;

        renderWordBank();
        renderDropZone();
      }
    }

    return;
  }

  lostFrames = 0;

  const vw = videoElement.videoWidth || 4;
  const vh = videoElement.videoHeight || 3;

  const landmarks = smoothLandmarks(
    results.multiHandLandmarks[0],
    vw,
    vh,
    now
  );

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];

  const distance = (a, b) => Math.hypot(
    (a.x - b.x) * vw,
    (a.y - b.y) * vh
  );

  const handSize = Math.max(
    distance(wrist, middleMcp),
    0.0001
  );

  const ratio = distance(thumbTip, indexTip) / handSize;

  if (ratio < CFG.pinchOn) {
    pinchFrames++;
    openFrames = 0;
  } else if (ratio > CFG.pinchOff) {
    openFrames++;
    pinchFrames = 0;
  } else {
    pinchFrames = 0;
    openFrames = 0;
  }

  const wasPinching = pinchActive;

  if (
    !pinchActive &&
    pinchFrames >= CFG.pinchOnFrames
  ) {
    pinchActive = true;
    pinchStartAt = now;
  }

  if (
    pinchActive &&
    openFrames >= CFG.pinchOffFrames
  ) {
    pinchActive = false;
  }

  const margin = CFG.edgeMargin;

  const toScreen = point => ({
    x: Math.min(
      1,
      Math.max(
        0,
        ((1 - point.x) - margin) / (1 - 2 * margin)
      )
    ) * window.innerWidth,

    y: Math.min(
      1,
      Math.max(
        0,
        (point.y - margin) / (1 - 2 * margin)
      )
    ) * window.innerHeight
  });

  const thumbScreen = toScreen(thumbTip);
  const indexScreen = toScreen(indexTip);

  const usePinchPoint =
    pinchActive || ratio < CFG.pinchOn;

  const targetX = usePinchPoint
    ? (thumbScreen.x + indexScreen.x) / 2
    : indexScreen.x;

  const targetY = usePinchPoint
    ? (thumbScreen.y + indexScreen.y) / 2
    : indexScreen.y;

  if (smoothX === null) {
    smoothX = targetX;
    smoothY = targetY;
  } else {
    smoothX += (targetX - smoothX) * CFG.smooth;
    smoothY += (targetY - smoothY) * CFG.smooth;
  }

  const screenX = smoothX;
  const screenY = smoothY;

  if (pinchActive && openFrames === 1) {
    releasePos = { x: screenX, y: screenY };
  }

  if (pinchActive && openFrames === 0) {
    releasePos = null;
  }

  const state = pinchActive
    ? 'pinch'
    : (ratio < CFG.pinchOff ? 'near' : 'open');

  cameraDotEl.className =
    'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';

  gestureStatusEl.innerText = pinchActive
    ? 'Mencubit 🤏'
    : (
        state === 'near'
          ? 'Hampir cubit...'
          : 'Telunjuk Aktif 👆'
      );

  virtualCursorEl.style.display = 'flex';
  virtualCursorEl.style.left = `${screenX}px`;
  virtualCursorEl.style.top = `${screenY}px`;
  virtualCursorEl.innerText = pinchActive ? '🤏' : '👆';

  drawMarkers(landmarks, toScreen, state);

  if (grabbedWord) {
    floatingWordEl.style.display = 'block';
    floatingWordEl.style.left = `${screenX}px`;
    floatingWordEl.style.top = `${screenY - 25}px`;
    floatingWordEl.innerText = `🤏 ${grabbedWord}`;
  } else {
    floatingWordEl.style.display = 'none';
  }

  // Ambil kata ketika mencubit.
  if (
    pinchActive &&
    !grabbedWord &&
    !isImageZoomOpen() &&
    now - pinchStartAt <= CFG.grabWindowMs
  ) {
    const target = findWordNear(screenX, screenY);

    if (target) {
      const word = target.dataset.word;
      const index = availableWords.indexOf(word);

      if (index !== -1) {
        availableWords.splice(index, 1);
        grabbedWord = word;

        renderWordBank();
        renderDropZone();
      }
    }
  }

  // Lepas kata.
  if (!pinchActive && wasPinching && grabbedWord) {
    const position = releasePos || {
      x: screenX,
      y: screenY
    };

    dropGrabbedWord(position.x, position.y);
    releasePos = null;
  }

  // Klik tombol dengan telunjuk saat tidak membawa kata.
  if (
    pinchActive ||
    grabbedWord ||
    ratio < CFG.pinchOn
  ) {
    resetDwell();
  } else {
    updateDwell(screenX, screenY, now);
  }
}

// ============================================================
// INISIALISASI KAMERA
// ============================================================

try {
  if (
    typeof Hands === 'undefined' ||
    typeof Camera === 'undefined' ||
    !videoElement
  ) {
    throw new Error('MediaPipe atau elemen kamera tidak tersedia.');
  }

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

    gestureStatusEl.innerText = 'Mode Sentuh Saja';

    cameraDotEl.className =
      'w-1.5 h-1.5 rounded-full bg-rose-500';
  });

} catch (error) {
  console.warn('Sensor gestur tidak tersedia:', error);

  if (gestureStatusEl) {
    gestureStatusEl.innerText = 'Mode Sentuh Aktif';
  }
}

// ============================================================
// JALANKAN SOAL PERTAMA
// ============================================================

renderQuestion();
