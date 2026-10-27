const urlParams = new URLSearchParams(window.location.search);
const ssoToken = urlParams.get('ssoToken'); // diteruskan ke halaman soal kalau ada

// -------------------------------------------------------------
//  DAFTAR LEVEL
//  Level otomatis TERBUKA kalau di soal-misi1.js ada soal dengan "level" yang sama.
//  Level yang belum ada soalnya tampil terkunci ("Segera hadir").
//  Mau ganti emoji / judul level? Edit di sini saja.
// -------------------------------------------------------------
// Ikon bergerak: Noto Animated Emoji (Google). Butuh internet; kalau gagal dimuat otomatis balik ke emoji biasa.
const animEmoji = (kode) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${kode}/512.webp`;

const LEVELS = [
  { level: 1, emoji: '🐣', img: animEmoji('1f423'), sub: 'Level 1',  warna: 'from-lime-300 to-green-400',    border: 'hover:border-green-400' },
  { level: 2, emoji: '🐥', img: animEmoji('1f425'), sub: 'Level 2', warna: 'from-yellow-200 to-amber-400',  border: 'hover:border-amber-400' },
  { level: 3, emoji: '🦉', img: animEmoji('1f989'), sub: 'Level 3',  warna: 'from-sky-300 to-blue-500',      border: 'hover:border-blue-400' },
  { level: 4, emoji: '🚀', img: animEmoji('1f680'), sub: 'Level 4',   warna: 'from-violet-300 to-purple-500', border: 'hover:border-purple-400' },
  { level: 5, emoji: '👑', img: animEmoji('1f451'), sub: 'Level 5',   warna: 'from-orange-300 to-rose-500',   border: 'hover:border-rose-400' }
];

const gridEl = document.getElementById('level-grid');

function countSoal(level) {
  if (typeof questions === 'undefined' || !Array.isArray(questions)) return 0;
  return questions.filter((q) => q.level === level).length;
}

function levelUrl(level) {
  const p = new URLSearchParams({ level });
  if (ssoToken) p.set('ssoToken', ssoToken);
  return `misi1.html?${p.toString()}`;
}

function renderLevels() {
  gridEl.innerHTML = '';
  LEVELS.forEach((lv) => {
    const jumlah = countSoal(lv.level);
    const terbuka = jumlah > 0;

    const card = document.createElement(terbuka ? 'a' : 'div');
    if (terbuka) {
      card.href = levelUrl(lv.level);
      card.className = `interactive-elem word-card group relative bg-white border-2 border-slate-200 ${lv.border} rounded-3xl p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center gap-3 text-center cursor-pointer`;
    } else {
      card.className = 'relative bg-slate-100 border-2 border-slate-200 rounded-3xl p-5 flex flex-col items-center gap-3 text-center opacity-60';
    }

    const ikon = terbuka
      ? `<img src="${lv.img}" alt="${lv.sub}" draggable="false" class="w-16 h-16 object-contain pointer-events-none"
              onerror="this.replaceWith(document.createTextNode('${lv.emoji}'))">`
      : '🔒';

    card.innerHTML = `
      <div class="relative">
        <div class="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-inner
                    ${terbuka ? `bg-gradient-to-br ${lv.warna} group-hover:scale-110 transition-transform` : 'bg-slate-200'}">
          ${ikon}
        </div>
        <span class="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-sm font-extrabold flex items-center justify-center shadow">
          ${lv.level}
        </span>
      </div>
      <h3 class="text-xl font-extrabold text-slate-800">${lv.sub}</h3>
      <span class="text-xs font-semibold px-3 py-1 rounded-full ${terbuka ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-200 text-slate-500'}">
        ${terbuka ? `${jumlah} soal` : 'Segera hadir'}
      </span>
      ${terbuka ? '<span class="w-full py-2 rounded-xl bg-orange-500 text-white text-sm font-bold">Mulai ▶</span>' : ''}
    `;
    gridEl.appendChild(card);
  });
}

renderLevels();

// -------------------------------------------------------------
//  Gestur (versi ringkas dari halaman soal): telunjuk 1 titik, tahan untuk klik.
//  Kalau kamera tidak aktif, level tetap bisa diklik / disentuh biasa.
// -------------------------------------------------------------
const videoElement = document.getElementById('webcam');
const gestureStatusEl = document.getElementById('gesture-status');
const cameraDotEl = document.getElementById('camera-dot');
const virtualCursorEl = document.getElementById('virtual-cursor');

const CFG = {
  detectConf: 0.6,
  trackConf: 0.5,
  filterMinCutoff: 0.8,
  filterBeta: 0.05,
  filterDCutoff: 1.0,
  smooth: 0.5,
  edgeMargin: 0.08,
  lostGraceFrames: 20,
  hitRadius: 20,
  dwellMs: 1200,
  lockDistance: 60
};

let smoothX = null, smoothY = null, lostFrames = 0;
let hoverEl = null, dwellStart = 0, dwellLock = null;

// One Euro Filter (penghalus landmark, sama seperti halaman soal)
class OneEuro {
  constructor() { this.reset(); }
  reset() { this.xPrev = null; this.dxPrev = 0; this.tPrev = 0; }
  static alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
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
const resetLandmarkFilters = () => lmFilters.forEach((f) => { f.x.reset(); f.y.reset(); });

// Rangka tangan (21 titik) digambar di canvas layar penuh
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
handCanvas.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;display:none;';
document.body.appendChild(handCanvas);
const handCtx = handCanvas.getContext('2d');

function drawHand(lm, toScreen) {
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
  handCtx.lineCap = 'round';
  handCtx.lineJoin = 'round';
  handCtx.shadowColor = 'rgba(15, 23, 42, 0.35)';
  handCtx.shadowBlur = 6;

  handCtx.lineWidth = 4;
  handCtx.strokeStyle = '#60a5fa';
  handCtx.beginPath();
  HAND_CONNECTIONS.forEach(([a, b]) => {
    const p = toScreen(lm[a]), q = toScreen(lm[b]);
    handCtx.moveTo(p.x, p.y);
    handCtx.lineTo(q.x, q.y);
  });
  handCtx.stroke();

  for (let id = 0; id < 21; id++) {
    const q = toScreen(lm[id]);
    const isTip = FINGER_TIPS.includes(id);
    handCtx.beginPath();
    handCtx.arc(q.x, q.y, isTip ? 13 : 7, 0, Math.PI * 2);
    handCtx.fillStyle = id === 8 ? '#f97316' : '#ffffff';
    handCtx.fill();
    handCtx.lineWidth = isTip ? 3 : 2;
    handCtx.strokeStyle = isTip ? '#ffffff' : '#3b82f6';
    handCtx.stroke();
  }
  handCtx.shadowBlur = 0;
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
    const hit = el ? el.closest('.interactive-elem') : null;
    if (hit) return hit;
  }
  return null;
}

function updateDwell(x, y, now) {
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

function onResults(results) {
  const now = performance.now();

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    lostFrames++;
    if (lostFrames > CFG.lostGraceFrames) {
      gestureStatusEl.innerText = 'Mencari Tangan...';
      cameraDotEl.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping';
      virtualCursorEl.style.display = 'none';
      handCanvas.style.display = 'none';
      resetDwell();
      smoothX = smoothY = null;
      resetLandmarkFilters();
    }
    return;
  }
  lostFrames = 0;

  const vw = videoElement.videoWidth || 4;
  const vh = videoElement.videoHeight || 3;
  const raw = results.multiHandLandmarks[0];
  const lm = raw.map((p, i) => ({
    x: lmFilters[i].x.filter(p.x * vw, now) / vw,
    y: lmFilters[i].y.filter(p.y * vh, now) / vh
  }));

  const m = CFG.edgeMargin;
  const toScreen = (p) => ({
    x: Math.min(1, Math.max(0, ((1 - p.x) - m) / (1 - 2 * m))) * window.innerWidth,
    y: Math.min(1, Math.max(0, (p.y - m) / (1 - 2 * m))) * window.innerHeight
  });
  const tip = toScreen(lm[8]); // ujung telunjuk

  if (smoothX === null) { smoothX = tip.x; smoothY = tip.y; }
  else {
    smoothX += (tip.x - smoothX) * CFG.smooth;
    smoothY += (tip.y - smoothY) * CFG.smooth;
  }

  cameraDotEl.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';
  gestureStatusEl.innerText = 'Telunjuk Aktif 👆';
  virtualCursorEl.style.display = 'flex';
  virtualCursorEl.style.left = `${smoothX}px`;
  virtualCursorEl.style.top = `${smoothY}px`;
  virtualCursorEl.innerText = '👆';
  drawHand(lm, toScreen);

  updateDwell(smoothX, smoothY, now);
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
  camera.start().catch(() => {
    gestureStatusEl.innerText = 'Mode Sentuh Saja';
    cameraDotEl.className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
  });
} catch (e) {
  gestureStatusEl.innerText = 'Mode Sentuh Aktif';
}