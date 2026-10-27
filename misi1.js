const urlParams = new URLSearchParams(window.location.search);
const ssoToken = urlParams.get('ssoToken') || 'DEMO_TOKEN_123';

// Data soal ada di file terpisah: soal-misi1.js (harus dimuat SEBELUM file ini di misi1.html)
if (typeof questions === 'undefined' || !Array.isArray(questions) || questions.length === 0) {
  alert('Data soal tidak ditemukan. Pastikan soal-misi1.js dimuat sebelum misi1.js di misi1.html dan isinya tidak kosong.');
  throw new Error('questions tidak ditemukan / kosong (cek soal-misi1.js)');
}

// Cek otomatis isi soal-misi1.js. Kalau ada salah ketik, pesannya muncul di Console (F12), game tetap jalan.
function validateQuestions() {
  const ids = new Set();
  questions.forEach((q, n) => {
    const label = `Soal ke-${n + 1} (${q.id || 'tanpa id'})`;
    if (!q.id) console.warn(`[soal-misi1] ${label}: field "id" kosong`);
    else if (ids.has(q.id)) console.warn(`[soal-misi1] ${label}: id dobel, id harus unik`);
    ids.add(q.id);
    if (!q.instruksi) console.warn(`[soal-misi1] ${label}: "instruksi" kosong`);
    if (!Array.isArray(q.correctOrder) || q.correctOrder.length === 0) {
      console.warn(`[soal-misi1] ${label}: "correctOrder" kosong`);
      return;
    }
    if (!Array.isArray(q.words)) { console.warn(`[soal-misi1] ${label}: "words" kosong`); return; }
    const pool = [...q.words];
    q.correctOrder.forEach((w) => {
      const i = pool.indexOf(w);
      if (i === -1) console.warn(`[soal-misi1] ${label}: kata "${w}" ada di correctOrder tapi TIDAK ada di words (cek ejaan & huruf besar-kecil). Soal ini tidak akan bisa dijawab benar.`);
      else pool.splice(i, 1);
    });
    if (q.jawabanLain !== undefined) {
      if (!Array.isArray(q.jawabanLain) || !q.jawabanLain.every(Array.isArray)) {
        console.warn(`[soal-misi1] ${label}: "jawabanLain" harus berupa daftar susunan, contoh: [ ['pada', 'pukul', 'tujuh'] ]`);
        return;
      }
      q.jawabanLain.forEach((susunan, k) => {
        const p2 = [...q.words];
        susunan.forEach((w) => {
          const i = p2.indexOf(w);
          if (i === -1) console.warn(`[soal-misi1] ${label}: kata "${w}" di jawabanLain ke-${k + 1} TIDAK ada di words (cek ejaan & huruf besar-kecil). Jawaban ini tidak akan bisa disusun.`);
          else p2.splice(i, 1);
        });
      });
    }
  });
}
validateQuestions();

// Level yang dimainkan diambil dari alamat halaman: misi1.html?level=1 (default level 1).
// Hanya soal dengan "level" yang sama di soal-misi1.js yang dimainkan.
const LEVEL_PAGE = 'level.html';
const currentLevel = parseInt(urlParams.get('level'), 10) || 1;
const levelQuestions = questions.filter((q) => q.level === currentLevel);
if (levelQuestions.length === 0) {
  alert(`Level ${currentLevel} belum ada soalnya. Kembali ke halaman level.`);
  window.location.href = LEVEL_PAGE;
  throw new Error(`Tidak ada soal untuk level ${currentLevel}`);
}

// Alamat halaman level (ssoToken ikut dibawa kalau ada di alamat)
function levelPageUrl() {
  return urlParams.get('ssoToken') ? `${LEVEL_PAGE}?ssoToken=${encodeURIComponent(urlParams.get('ssoToken'))}` : LEVEL_PAGE;
}

let currentQuestionIdx = 0;
let selectedWords = [];
let availableWords = [];
let grabbedWord = null;
let startTime = Date.now();

// -------------------------------------------------------------
//  PENILAIAN (aturan final)
//  Skor soal ditentukan percobaan ke berapa anak benar:
//    0 salah = 100 | 1 salah = 75 | 2 salah = 50 | 3+ salah = 25 (minimum)
//  Nilai level = rata-rata skor soal. Waktu TIDAK dihitung (hanya disimpan).
//  Aturan yang sama ada di app.py (hitung_skor_soal & tentukan_predikat).
// -------------------------------------------------------------
const SKOR_PER_PERCOBAAN = [100, 75, 50];
const SKOR_MINIMUM = 25;

function hitungSkorSoal(jumlahSalah) {
  return jumlahSalah < SKOR_PER_PERCOBAAN.length ? SKOR_PER_PERCOBAAN[jumlahSalah] : SKOR_MINIMUM;
}

function tentukanPredikat(nilai) {
  if (nilai >= 100) return 'Sempurna';   // 100 hanya mungkin kalau semua soal langsung benar
  if (nilai >= 90) return 'Sangat Baik';
  if (nilai >= 75) return 'Baik';
  if (nilai >= 60) return 'Cukup';
  return 'Perlu Pendampingan';
}

// 1 kali main 1 level = 1 sesi. "Main Lagi" membuat sesi baru.
function buatSesiId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
let sesiId = buatSesiId();
let soalState = {};   // { [soal_id]: { mulai, jumlahSalah, selesai, waktuDetik } }

function getSoalState(q) {
  if (!soalState[q.id]) soalState[q.id] = { mulai: Date.now(), jumlahSalah: 0, selesai: false, waktuDetik: 0 };
  return soalState[q.id];
}

function hitungHasilLevel() {
  const daftar = levelQuestions.map((q) => {
    const st = getSoalState(q);
    return { soal_id: q.id, jumlah_salah: st.jumlahSalah, skor: hitungSkorSoal(st.jumlahSalah), waktu_detik: st.waktuDetik };
  });
  const total = daftar.length;
  const nilai = Math.round((daftar.reduce((a, d) => a + d.skor, 0) / total) * 10) / 10;
  const langsungBenar = daftar.filter((d) => d.jumlah_salah === 0).length;
  return { daftar, total, nilai, langsungBenar, predikat: tentukanPredikat(nilai) };
}

async function kirimJson(url, body) {
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (err) {
    console.warn(`Gagal kirim ke ${url} (server offline?):`, err);
  }
}

// Dipanggil sekali per soal, saat soal pertama kali dijawab benar
function kirimHasilSoal(q, st) {
  return kirimJson('/api/misi1/soal', {
    ssoToken, sesi_id: sesiId, level: q.level, soal_id: q.id,
    jumlah_salah: st.jumlahSalah, waktu_detik: st.waktuDetik
  });
}

// Dipanggil sekali saat popup hasil level muncul
function kirimHasilLevel(hasil) {
  return kirimJson('/api/misi1/level', {
    ssoToken, sesi_id: sesiId, level: currentLevel, total_soal: hasil.total,
    soal: hasil.daftar.map((d) => ({ soal_id: d.soal_id, jumlah_salah: d.jumlah_salah, waktu_detik: d.waktu_detik }))
  });
}

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

// Field "gambar" di soal-misi1.js: alamat file gambar (.png/.jpg/.jpeg/.webp/.gif/.svg) ATAU emoji/teks pendek.
const IMAGE_PATH_REGEX = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i;

function renderGambar(q) {
  const g = (q.gambar || '').trim();
  soalGambarEl.innerHTML = '';
  disableImageZoom();
  if (!g) { soalGambarEl.innerText = '🖼️'; return; }

  if (IMAGE_PATH_REGEX.test(g)) {
    const img = document.createElement('img');
    img.src = g;
    img.alt = q.instruksi.replace(/"/g, '');
    img.className = 'w-full h-full object-contain';
    img.onerror = () => {
      console.warn(`[soal-misi1] Gambar tidak ketemu: "${g}" (soal ${q.id}). Cek nama file & foldernya.`);
      soalGambarEl.innerHTML = '';
      soalGambarEl.innerText = '🖼️';
      disableImageZoom();
    };
    soalGambarEl.appendChild(img);
  } else {
    soalGambarEl.innerText = g;
  }
  enableImageZoom(q, g);
}

// -------------------------------------------------------------
//  ZOOM GAMBAR SOAL
//  Gambar soal bisa diklik / disentuh / ditahan telunjuk (1,2 detik) -> tampil besar di tengah layar.
//  Tutup lewat tombol "Tutup" (bisa pakai telunjuk), klik area gelap, atau tombol Esc.
// -------------------------------------------------------------
const imageModalEl = document.getElementById('image-modal');
const imageModalContentEl = document.getElementById('image-modal-content');
const imageModalCaptionEl = document.getElementById('image-modal-caption');

function isImageZoomOpen() {
  return !imageModalEl.classList.contains('hidden');
}

function disableImageZoom() {
  soalGambarEl.classList.remove('interactive-elem', 'cursor-pointer');
  soalGambarEl.onclick = null;
  soalGambarEl.removeAttribute('title');
}

function enableImageZoom(q, g) {
  soalGambarEl.classList.add('interactive-elem', 'cursor-pointer');
  soalGambarEl.title = 'Klik untuk memperbesar gambar';
  soalGambarEl.onclick = () => openImageZoom(q, g);

  // ikon kaca pembesar kecil di pojok sebagai petunjuk
  const hint = document.createElement('span');
  hint.className = 'absolute bottom-1 right-1 bg-white/90 border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow pointer-events-none';
  hint.innerText = '🔍';
  soalGambarEl.appendChild(hint);
}

function openImageZoom(q, g) {
  imageModalContentEl.innerHTML = '';
  if (IMAGE_PATH_REGEX.test(g)) {
    const big = document.createElement('img');
    big.src = g;
    big.alt = q.instruksi.replace(/"/g, '');
    big.className = 'w-full h-full object-contain';
    imageModalContentEl.appendChild(big);
  } else {
    const emoji = document.createElement('div');
    emoji.className = 'leading-none text-center';
    emoji.style.fontSize = 'min(40vw, 30vh)';
    emoji.innerText = g;
    imageModalContentEl.appendChild(emoji);
  }
  imageModalCaptionEl.innerText = q.instruksi;
  imageModalEl.classList.remove('hidden');
  resetDwell();              // supaya hitungan tahan telunjuk mulai dari nol di tombol Tutup
  dwellLock = null;
}

function closeImageZoom() {
  if (!isImageZoomOpen()) return;
  imageModalEl.classList.add('hidden');
  imageModalContentEl.innerHTML = '';
  resetDwell();
}

document.getElementById('image-modal-close').onclick = closeImageZoom;
imageModalEl.addEventListener('click', (e) => { if (e.target === imageModalEl) closeImageZoom(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImageZoom(); });

function renderQuestion() {
  const q = levelQuestions[currentQuestionIdx];
  soalNumEl.innerText = currentQuestionIdx + 1;
  soalTotalEl.innerText = levelQuestions.length;
  closeImageZoom();
  renderGambar(q);
  soalInstruksiEl.innerText = q.instruksi;
  levelBadgeEl.innerText = `Level ${q.level}`;
  progressBarEl.style.width = `${((currentQuestionIdx + 1) / levelQuestions.length) * 100}%`;

  selectedWords = [];
  availableWords = [...q.words];
  grabbedWord = null;
  renderWordBank();
  renderDropZone();
  startTime = Date.now();
}

function renderWordBank() {
  wordBankEl.innerHTML = '';
  availableWords.forEach((word) => {
    const btn = document.createElement('div');
    btn.className = 'word-card interactive-word bg-white border-2 border-slate-200 hover:border-orange-400 font-semibold text-slate-700 px-4 py-2 rounded-xl shadow-sm text-xs cursor-pointer';
    btn.dataset.word = word;
    btn.innerText = word;
    // Fallback klik/sentuh: kata langsung masuk ke kotak (tanpa perlu cubitan)
    btn.onclick = () => {
      if (grabbedWord) return;
      const i = availableWords.indexOf(word);
      if (i === -1) return;
      availableWords.splice(i, 1);
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
    dropZoneEl.innerHTML = `<span class="text-xs text-slate-400 italic">Cubit kata di bawah, seret, lalu lepaskan di sini...</span>`;
    return;
  }

  selectedWords.forEach((word, idx) => {
    const chip = document.createElement('div');
    chip.className = 'word-card interactive-cancel bg-orange-500 text-white font-semibold px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm text-xs cursor-pointer';
    chip.innerHTML = `<span>${word}</span> <span class="text-orange-200 font-bold text-xs">✕</span>`;
    // Klik / telunjuk untuk menghapus (cancel) kata dari dalam kotak
    chip.onclick = () => {
      selectedWords.splice(idx, 1);
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
  const text = q.instruksi.replace(/"/g, '');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  window.speechSynthesis.speak(utterance);
}

document.getElementById('audio-btn').onclick = playAudioPrompt;
document.getElementById('reset-btn').onclick = resetAnswer;
document.getElementById('submit-btn').onclick = submitAnswer;

// Tombol Kembali: soal 2 -> soal 1, dst. Kalau sudah di soal 1 -> halaman level.
document.getElementById('back-btn').onclick = () => {
  successModalEl.classList.add('hidden');
  errorModalEl.classList.add('hidden');

  if (currentQuestionIdx > 0) {
    currentQuestionIdx--;
    renderQuestion();
  } else {
    // Soal 1: kembali ke halaman level
    window.location.href = levelPageUrl();
  }
};
document.getElementById('modal-close-btn').onclick = () => errorModalEl.classList.add('hidden');

document.getElementById('success-next-btn').onclick = () => {
  successModalEl.classList.add('hidden');
  if (currentQuestionIdx + 1 < levelQuestions.length) {
    currentQuestionIdx++;
    renderQuestion();
  } else {
    showResult();
  }
};

//  Nilai dihitung dari jumlah salah tiap soal (lihat blok PENILAIAN di atas).
// -------------------------------------------------------------

function launchConfetti() {
  confettiLayerEl.innerHTML = '';
  const colors = ['#f97316', '#fbbf24', '#f43f5e', '#3b82f6', '#10b981', '#a855f7', '#ffffff'];
  const emojis = ['⭐', '🎉', '✨', '🎊'];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${2.5 + Math.random() * 3}s`;
    piece.style.animationDelay = `${Math.random() * 3}s`;
    if (i % 7 === 0) {
      piece.innerText = emojis[Math.floor(Math.random() * emojis.length)];
      piece.style.fontSize = `${18 + Math.random() * 14}px`;
    } else {
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${10 + Math.random() * 10}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';
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
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Bintang: nilai < 50 = 1 bintang | 50-79 = 2 bintang | 80-100 = 3 bintang
function hitungBintang(nilai) {
  if (nilai < 50) return 1;
  if (nilai < 80) return 2;
  return 3;
}

function tampilkanBintang(nilai) {
  const jumlah = hitungBintang(nilai);
  document.querySelectorAll('#result-stars .result-star').forEach((el, i) => {
    el.classList.toggle('off', i >= jumlah);
  });
}

function showResult() {
  const hasil = hitungHasilLevel();
  resultLevelLabelEl.innerText = `Level ${currentLevel} Selesai`;
  resultCorrectEl.innerText = `${hasil.langsungBenar}/${hasil.total}`;
  document.getElementById('result-predikat').innerText = hasil.predikat;
  resultScoreEl.innerText = '0';
  tampilkanBintang(hasil.nilai);
  resultModalEl.classList.remove('hidden');
  launchConfetti();
  setTimeout(() => countUpScore(hasil.nilai), 400);
  kirimHasilLevel(hasil);
}

document.getElementById('result-level-btn').onclick = () => {
  window.location.href = levelPageUrl();
};

document.getElementById('result-retry-btn').onclick = () => {
  resultModalEl.classList.add('hidden');
  confettiLayerEl.innerHTML = '';
  currentQuestionIdx = 0;
  sesiId = buatSesiId();   // Main Lagi = sesi baru, hitungan salah mulai dari nol
  soalState = {};
  renderQuestion();
};

async function submitAnswer() {
  const q = levelQuestions[currentQuestionIdx];
  // Popup masih terbuka -> abaikan, supaya salah/benar tidak terhitung dobel
  if (!errorModalEl.classList.contains('hidden') || !successModalEl.classList.contains('hidden')) return;
  const st = getSoalState(q);
  const responseTimeMs = Date.now() - startTime;
  const userSentence = selectedWords.join(' ');
  // Jawaban benar = correctOrder, ATAU salah satu susunan di "jawabanLain" (opsional)
  const semuaJawabanBenar = [q.correctOrder, ...(Array.isArray(q.jawabanLain) ? q.jawabanLain : [])];
  // urutanBebas: true -> urutan kata tidak dipermasalahkan, yang penting semua kata benar terpilih
  const kunci = (arr) => [...arr].sort().join('|');
  const isCorrect = q.urutanBebas
    ? semuaJawabanBenar.some((susunan) => kunci(susunan) === kunci(selectedWords))
    : semuaJawabanBenar.some((susunan) => susunan.join(' ') === userSentence);

  let errorPattern = null;
  if (!isCorrect) {
    const userKey = selectedWords.join('_');
    if (q.urutanBebas) {
      const sisa = [...q.correctOrder];
      const semuaBenar = selectedWords.every((w) => { const i = sisa.indexOf(w); if (i === -1) return false; sisa.splice(i, 1); return true; });
      errorPattern = (q.errorPatterns && q.errorPatterns[userKey]) || (semuaBenar ? 'JAWABAN_KURANG' : 'PILIHAN_SALAH');
      modalErrorDescEl.innerText = semuaBenar
        ? `Jawabanmu: "${userSentence}". Hewan yang kamu pilih sudah benar, tapi masih ada yang kurang. Hitung lagi hewan di gambar ya!`
        : `Jawabanmu: "${userSentence}". Ada hewan yang tidak ada di gambar. Lihat gambar baik-baik, lalu coba lagi!`;
    } else {
      errorPattern = (q.errorPatterns && q.errorPatterns[userKey]) || 'URUTAN_TIDAK_TETAP';
      modalErrorDescEl.innerText = `Susunanmu: "${userSentence}" masih salah. Ayo coba lagi!`;
    }
    errorModalEl.classList.remove('hidden');
    // Tiap popup "Belum Tepat" = +1 salah. Kotak kosong tidak dihitung; soal yang sudah selesai dikunci.
    if (!st.selesai && selectedWords.length > 0) st.jumlahSalah++;
  } else {
    successModalEl.classList.remove('hidden');
    if (!st.selesai) {
      st.selesai = true;
      st.waktuDetik = Math.round((Date.now() - st.mulai) / 1000);
      kirimHasilSoal(q, st);
    }
  }
  const payload = {
    ssoToken: ssoToken,
    question_id: q.id,
    kompetensi: q.kompetensi,
    level: q.level,
    is_correct: isCorrect,
    error_pattern: errorPattern,
    response_time_ms: responseTimeMs,
    hints_used: 0
  };

  try {
    await fetch('/api/game/event/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('API Offline Mode (Simulasi Django):', err);
  }
}

// -------------------------------------------------------------
// Deteksi MediaPipe (versi ramah anak SD)
//  - Cubit  : jempol (4) + telunjuk (8), jarak dinormalisasi ukuran tangan (0 & 9)
//  - Klik   : telunjuk 1 titik (8), tahan di atas tombol / kata di kotak
//  - Rangka seluruh tangan (21 titik, layar penuh + preview webcam), selalu di atas gambar.
//    Ujung jempol & telunjuk jadi indikator cubit: oranye = terbuka, kuning = hampir cubit, hijau = SUDAH cubit
//  - Semua 21 titik dihaluskan (One Euro Filter) sebelum dipakai & digambar, jadi tidak geter
// -------------------------------------------------------------
const videoElement = document.getElementById('webcam');

// ---- Pengaturan kepekaan (ubah di sini kalau mau disetel lagi) ----
const CFG = {
  detectConf: 0.6,      // keyakinan deteksi tangan
  trackConf: 0.5,       // keyakinan tracking (lebih rendah = tracking tidak gampang putus & loncat)
  filterMinCutoff: 0.8, // One Euro: makin KECIL = makin halus saat tangan diam (kurangi geter)
  filterBeta: 0.05,     // One Euro: makin BESAR = makin responsif saat tangan bergerak cepat
  filterDCutoff: 1.0,   // One Euro: penghalus kecepatan (biarkan 1.0)
  smooth: 0.5,          // 0-1, penghalus ringan kursor (landmark sudah difilter, jadi tidak perlu berat)
  edgeMargin: 0.08,     // tepi kamera yang diabaikan, supaya tepi layar mudah dijangkau
  pinchOn: 0.50,        // rasio jarak jempol-telunjuk / ukuran tangan: di bawah ini = cubit (lebih besar = lebih mudah)
  pinchOff: 0.80,       // di atas ini = lepas cubitan (hysteresis, supaya cubitan tidak gampang putus)
  pinchOnFrames: 2,     // butuh 2 frame berturut-turut baru dianggap cubit
  pinchOffFrames: 3,    // butuh 3 frame berturut-turut baru dianggap lepas
  lostGraceFrames: 20,  // tangan hilang sebentar (~0.6 dtk) tidak langsung membatalkan kata
  grabWindowMs: 700,    // setelah mulai cubit, masih boleh "menyapu" ke kata selama ini (anak sering cubit dulu baru gerak)
  grabPadding: 40,      // area ambil kata diperluas (px)
  dropPadding: 40,      // area kotak jawaban diperluas (px)
  hitRadius: 20,        // area sentuh tombol/kata-di-kotak diperluas (px)
  dwellMs: 1200,        // lama telunjuk menahan untuk klik
  lockDistance: 60      // setelah klik, telunjuk harus bergeser segini dulu baru bisa klik lagi
};

let smoothX = null, smoothY = null;
let pinchActive = false;
let pinchFrames = 0, openFrames = 0, lostFrames = 0;
let releasePos = null;
let pinchStartAt = 0;

let hoverEl = null;
let dwellStart = 0;
let dwellLock = null;

// ---------- Penghalus landmark: One Euro Filter ----------
// Pelan/diam = dihaluskan kuat (tidak geter), cepat = hampir tanpa jeda (tidak terasa lambat).
class OneEuro {
  constructor() { this.reset(); }
  reset() { this.xPrev = null; this.dxPrev = 0; this.tPrev = 0; }
  static alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(x, t) {
    if (this.xPrev === null) { this.xPrev = x; this.dxPrev = 0; this.tPrev = t; return x; }
    const dt = Math.max((t - this.tPrev) / 1000, 0.001);
    this.tPrev = t;
    const dx = (x - this.xPrev) / dt;
    this.dxPrev += OneEuro.alpha(CFG.filterDCutoff, dt) * (dx - this.dxPrev);
    const cutoff = CFG.filterMinCutoff + CFG.filterBeta * Math.abs(this.dxPrev);
    this.xPrev += OneEuro.alpha(cutoff, dt) * (x - this.xPrev);
    return this.xPrev;
  }
}
const lmFilters = Array.from({ length: 21 }, () => ({ x: new OneEuro(), y: new OneEuro() }));

function resetLandmarkFilters() {
  lmFilters.forEach((f) => { f.x.reset(); f.y.reset(); });
}

// Filter dikerjakan di ruang piksel video (sudah adil untuk x dan y), hasil dikembalikan 0-1 lagi
function smoothLandmarks(raw, vw, vh, t) {
  return raw.map((p, i) => ({
    x: lmFilters[i].x.filter(p.x * vw, t) / vw,
    y: lmFilters[i].y.filter(p.y * vh, t) / vh
  }));
}

// ---------- Titik penanda: seluruh 21 titik tangan ----------
// Digambar di canvas layar penuh dengan z-index tertinggi, jadi selalu terlihat di atas gambar/kartu/popup.
// Warna diselaraskan dengan tema LENTERA (oranye = utama, biru = tombol, hijau = benar)
const DOT_COLORS = {
  line: '#60a5fa',    // biru muda (blue-400)  : garis rangka tangan
  joint: '#ffffff',   // putih                 : isi titik sendi
  jointEdge: '#3b82f6', // biru (blue-500)     : tepi titik sendi
  tipEdge: '#ffffff', // putih                 : tepi titik ujung
  open: '#f97316',    // oranye (orange-500)   : ujung jempol & telunjuk saat terbuka (sama dgn kursor)
  near: '#fbbf24',    // kuning (amber-400)    : hampir cubit
  pinch: '#10b981',   // hijau (emerald-500)   : SUDAH cubit
  shadow: 'rgba(15, 23, 42, 0.35)' // bayangan tipis supaya tetap terlihat di kartu putih
};
// Sambungan antar titik (standar MediaPipe Hands, 21 titik)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // jempol
  [0, 5], [5, 6], [6, 7], [7, 8],          // telunjuk
  [5, 9], [9, 10], [10, 11], [11, 12],     // jari tengah
  [9, 13], [13, 14], [14, 15], [15, 16],   // jari manis
  [13, 17], [17, 18], [18, 19], [19, 20],  // kelingking
  [0, 17]                                  // sisi telapak
];
const FINGER_TIPS = [4, 8, 12, 16, 20];

const handCanvas = document.createElement('canvas');
handCanvas.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;display:none;';
document.body.appendChild(handCanvas);
const handCtx = handCanvas.getContext('2d');

const camCanvas = document.createElement('canvas');
camCanvas.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483001;display:none;';
document.body.appendChild(camCanvas);
const camCtx = camCanvas.getContext('2d');

function hideMarkers() {
  handCanvas.style.display = 'none';
  camCanvas.style.display = 'none';
}

// Gambar rangka seluruh tangan. pt(id) -> {x, y}; k = skala ukuran titik/garis
function paintHand(ctx, pt, state, k) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = DOT_COLORS.shadow;
  ctx.shadowBlur = 6 * k;

  // Garis rangka
  ctx.lineWidth = 4 * k;
  ctx.strokeStyle = DOT_COLORS.line;
  ctx.beginPath();
  HAND_CONNECTIONS.forEach(([a, b]) => {
    const p = pt(a), q = pt(b);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  });
  ctx.stroke();

  // Indikator cubit: garis antara ujung jempol (4) & telunjuk (8) saat hampir/sudah cubit
  if (state !== 'open') {
    const t = pt(4), i8 = pt(8);
    ctx.lineWidth = 5 * k;
    ctx.strokeStyle = state === 'pinch' ? DOT_COLORS.pinch : DOT_COLORS.near;
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(i8.x, i8.y); ctx.stroke();
  }

  // Titik: sendi kecil, ujung jari besar
  for (let id = 0; id < 21; id++) {
    const q = pt(id);
    const isTip = FINGER_TIPS.includes(id);
    let fill = DOT_COLORS.joint;
    if (id === 4 || id === 8) {
      if (state === 'pinch') fill = DOT_COLORS.pinch;
      else if (state === 'near') fill = DOT_COLORS.near;
      else fill = DOT_COLORS.open;
    }
    ctx.beginPath();
    ctx.arc(q.x, q.y, (isTip ? 13 : 7) * k, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = (isTip ? 3 : 2) * k;
    ctx.strokeStyle = isTip ? DOT_COLORS.tipEdge : DOT_COLORS.jointEdge;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

// state: 'open' | 'near' | 'pinch'
function drawMarkers(lm, toScreen, state) {
  // --- di layar penuh ---
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  if (handCanvas.width !== Math.round(W * dpr) || handCanvas.height !== Math.round(H * dpr)) {
    handCanvas.width = Math.round(W * dpr);
    handCanvas.height = Math.round(H * dpr);
    handCanvas.style.width = `${W}px`;
    handCanvas.style.height = `${H}px`;
  }
  handCanvas.style.display = 'block';
  handCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  handCtx.clearRect(0, 0, W, H);
  paintHand(handCtx, (id) => toScreen(lm[id]), state, 1);

  // --- di preview webcam (dihitung ikut object-cover & mirror) ---
  const r = videoElement.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const w = Math.round(r.width), h = Math.round(r.height);
  if (camCanvas.width !== w || camCanvas.height !== h) { camCanvas.width = w; camCanvas.height = h; }
  camCanvas.style.display = 'block';
  camCanvas.style.left = `${r.left}px`;
  camCanvas.style.top = `${r.top}px`;
  camCanvas.style.width = `${w}px`;
  camCanvas.style.height = `${h}px`;

  const vw = videoElement.videoWidth || 4, vh = videoElement.videoHeight || 3;
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale, dh = vh * scale;
  const ox = (w - dw) / 2, oy = (h - dh) / 2;
  camCtx.clearRect(0, 0, w, h);
  paintHand(camCtx, (id) => ({ x: ox + (1 - lm[id].x) * dw, y: oy + lm[id].y * dh }), state, 0.4);
}

function setCursorProgress(p) {
  const px = Math.max(0, Math.min(1, p)) * 10;
  virtualCursorEl.style.boxShadow = px > 0 ? `0 0 0 ${px}px rgba(249,115,22,0.35)` : '';
}

function resetDwell() {
  if (hoverEl) hoverEl.classList.remove('cursor-hover');
  hoverEl = null;
  dwellStart = 0;
  setCursorProgress(0);
}

function findInteractiveNear(x, y) {
  const R = CFG.hitRadius;
  const offsets = [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]];
  for (const [dx, dy] of offsets) {
    const el = document.elementFromPoint(x + dx, y + dy);
    const hit = el ? el.closest('.interactive-elem, .interactive-cancel') : null;
    if (hit) return hit;
  }
  return null;
}

function findWordNear(x, y) {
  const pad = CFG.grabPadding;
  let best = null, bestDist = Infinity;
  document.querySelectorAll('.interactive-word').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bestDist) { bestDist = d; best = el; }
    }
  });
  return best;
}

function isInsideDropZone(x, y) {
  const r = dropZoneEl.getBoundingClientRect();
  const pad = CFG.dropPadding;
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

function updateDwell(x, y, now) {
  // Setelah klik, tunggu telunjuk pindah dulu (cegah klik beruntun / hapus kata berantai)
  if (dwellLock) {
    if (Math.hypot(x - dwellLock.x, y - dwellLock.y) < CFG.lockDistance) { resetDwell(); return; }
    dwellLock = null;
  }
  const target = findInteractiveNear(x, y);
  if (!target) { resetDwell(); return; }

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
    const t = hoverEl;
    dwellLock = { x, y };
    resetDwell();
    t.click();
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

function onResults(results) {
  const now = performance.now();

  // ---------- Tangan tidak terdeteksi ----------
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    lostFrames++;
    if (lostFrames > CFG.lostGraceFrames) {
      gestureStatusEl.innerText = 'Mencari Tangan...';
      cameraDotEl.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping';
      virtualCursorEl.style.display = 'none';
      floatingWordEl.style.display = 'none';
      hideMarkers();
      resetDwell();
      pinchActive = false; pinchFrames = 0; openFrames = 0;
      smoothX = smoothY = null;
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

  // Koordinat dikoreksi aspect ratio video supaya jarak x dan y adil
  const vw = videoElement.videoWidth || 4;
  const vh = videoElement.videoHeight || 3;

  // Semua 21 titik dihaluskan dulu -> rangka, rasio cubit, dan kursor sama-sama stabil
  const lm = smoothLandmarks(results.multiHandLandmarks[0], vw, vh, now);
  const thumbTip = lm[4];   // jempol
  const indexTip = lm[8];   // telunjuk
  const wrist = lm[0];      // pergelangan (untuk ukuran tangan)
  const midMcp = lm[9];     // pangkal jari tengah (untuk ukuran tangan)

  const dist = (a, b) => Math.hypot((a.x - b.x) * vw, (a.y - b.y) * vh);

  const handSize = Math.max(dist(wrist, midMcp), 0.0001);
  const ratio = dist(thumbTip, indexTip) / handSize;

  // ---------- Hysteresis + debounce cubitan ----------
  // Hitungan harus BERTURUT-TURUT: kalau rasio masuk zona tengah, hitungan diulang dari nol
  if (ratio < CFG.pinchOn) { pinchFrames++; openFrames = 0; }
  else if (ratio > CFG.pinchOff) { openFrames++; pinchFrames = 0; }
  else { pinchFrames = 0; openFrames = 0; }

  const wasPinching = pinchActive;
  if (!pinchActive && pinchFrames >= CFG.pinchOnFrames) { pinchActive = true; pinchStartAt = now; }
  if (pinchActive && openFrames >= CFG.pinchOffFrames) pinchActive = false;

  // ---------- Konversi landmark -> koordinat layar (mirror + margin tepi) ----------
  const m = CFG.edgeMargin;
  const toScreen = (p) => ({
    x: Math.min(1, Math.max(0, ((1 - p.x) - m) / (1 - 2 * m))) * window.innerWidth,
    y: Math.min(1, Math.max(0, (p.y - m) / (1 - 2 * m))) * window.innerHeight
  });
  const thumbS = toScreen(thumbTip);
  const indexS = toScreen(indexTip);

  // ---------- Posisi kursor ----------
  // Saat cubit pakai titik tengah jempol-telunjuk, selain itu pakai ujung telunjuk (1 titik)
  const usePinchPoint = pinchActive || ratio < CFG.pinchOn;
  const targetX = usePinchPoint ? (thumbS.x + indexS.x) / 2 : indexS.x;
  const targetY = usePinchPoint ? (thumbS.y + indexS.y) / 2 : indexS.y;

  if (smoothX === null) { smoothX = targetX; smoothY = targetY; }
  else {
    smoothX += (targetX - smoothX) * CFG.smooth;
    smoothY += (targetY - smoothY) * CFG.smooth;
  }
  const screenX = smoothX, screenY = smoothY;

  // Simpan posisi saat jari mulai membuka (titik tengah lebih stabil dari ujung telunjuk)
  if (pinchActive && openFrames === 1) releasePos = { x: screenX, y: screenY };
  if (pinchActive && openFrames === 0) releasePos = null;

  // ---------- Tampilan ----------
  const state = pinchActive ? 'pinch' : (ratio < CFG.pinchOff ? 'near' : 'open');
  cameraDotEl.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';
  gestureStatusEl.innerText = pinchActive ? 'Mencubit 🤏' : (state === 'near' ? 'Hampir cubit...' : 'Telunjuk Aktif 👆');
  virtualCursorEl.style.display = 'flex';
  virtualCursorEl.style.left = `${screenX}px`;
  virtualCursorEl.style.top = `${screenY}px`;
  virtualCursorEl.innerText = pinchActive ? '🤏' : '👆';
  drawMarkers(lm, toScreen, state);

  if (grabbedWord) {
    floatingWordEl.style.display = 'block';
    floatingWordEl.style.left = `${screenX}px`;
    floatingWordEl.style.top = `${screenY - 25}px`;
    floatingWordEl.innerText = `🤏 ${grabbedWord}`;
  } else {
    floatingWordEl.style.display = 'none';
  }

  // ---------- 1. Cubit: ambil kata ----------
  // Selama jendela waktu setelah mulai cubit, terus coba ambil kata di bawah kursor
  // (anak sering mencubit dulu baru menggerakkan tangan ke kata)
  if (pinchActive && !grabbedWord && !isImageZoomOpen() && (now - pinchStartAt) <= CFG.grabWindowMs) {
    const wordTarget = findWordNear(screenX, screenY);
    if (wordTarget) {
      const word = wordTarget.dataset.word;
      const i = availableWords.indexOf(word);
      if (i !== -1) {
        availableWords.splice(i, 1);
        grabbedWord = word;
        renderWordBank();
        renderDropZone();
      }
    }
  }

  // ---------- 2. Lepas cubit: jatuhkan kata ----------
  if (!pinchActive && wasPinching && grabbedWord) {
    const pos = releasePos || { x: screenX, y: screenY };
    dropGrabbedWord(pos.x, pos.y);
    releasePos = null;
  }

  // ---------- 3. Telunjuk 1 titik: klik tombol & hapus kata di kotak ----------
  // Dimatikan selama cubit / membawa kata supaya kata di kotak tidak terhapus tidak sengaja
  if (pinchActive || grabbedWord || ratio < CFG.pinchOn) {
    resetDwell();
  } else {
    updateDwell(screenX, screenY, now);
  }
}

try {
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: CFG.detectConf,
    minTrackingConfidence: CFG.trackConf
  });
  hands.onResults(onResults);

  const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 640, height: 480
  });
  camera.start().catch(err => {
    gestureStatusEl.innerText = 'Mode Sentuh Saja';
    cameraDotEl.className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
  });
} catch (e) {
  gestureStatusEl.innerText = 'Mode Sentuh Aktif';
}

renderQuestion();