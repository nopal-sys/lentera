
'use strict';

// ============================================================
// LENTERA GAME 1 — PILIH LEVEL
// Semua soal asli digunakan bersama oleh seluruh kompetensi
// literasi. Pemilihan soal hanya berdasarkan nomor level.
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
const ssoToken = urlParams.get('ssoToken') || '';

function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        let payload = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        payload += '='.repeat((4 - payload.length % 4) % 4);

        const binary = atob(payload);
        const bytes = Uint8Array.from(
            binary,
            character => character.charCodeAt(0)
        );

        return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
        console.error('Token Dashboard tidak bisa dibaca:', error);
        return null;
    }
}

const session = ssoToken
    ? decodeJwtPayload(ssoToken)
    : null;

const hasDashboardSession = Boolean(
    session &&
    session.misi &&
    session.kompetensi &&
    Number.isInteger(Number(session.level)) &&
    Number(session.level) >= 1 &&
    Number(session.level) <= 5 &&
    session.api
);

const assignedLevel = hasDashboardSession
    ? Number(session.level)
    : 0;

const competencyCode = String(
    session?.kompetensi ||
    urlParams.get('kompetensi') ||
    ''
).trim();

const namaKompetensi = {
    'LT-KOSAKATA': 'Kosakata',
    'LT-LANCAR': 'Membaca',
    'LT-PAHAM': 'Pemahaman Literasi',
    'LT-KALIMAT': 'Menyusun Kalimat'
};

const badge = document.querySelector('header .bg-orange-100');

if (badge && competencyCode) {
    badge.textContent =
        `Literasi · ${namaKompetensi[competencyCode] || 'Literasi'}`;
}

const gridEl = document.getElementById('level-grid');

// ============================================================
// BANK SOAL
// ============================================================

// PENTING:
// Tidak menyaring berdasarkan LT-KALIMAT, LT-PAHAM,
// LT-KOSAKATA, atau LT-LANCAR.
// Semua soal asli pada sebuah level akan digunakan.

function dapatkanSoal() {
    if (
        typeof questions === 'undefined' ||
        !Array.isArray(questions)
    ) {
        return [];
    }

    return questions;
}

function soalUntukLevel(level) {
    return dapatkanSoal().filter(
        soal => Number(soal.level) === Number(level)
    );
}

function jumlahSoal(level) {
    return soalUntukLevel(level).length;
}

// ============================================================
// DATA TAMPILAN LEVEL
// ============================================================

const animEmoji = kode =>
    `https://fonts.gstatic.com/s/e/notoemoji/latest/${kode}/512.webp`;

const LEVELS = [
    {
        level: 1,
        emoji: '🐣',
        img: animEmoji('1f423'),
        warna: 'from-lime-300 to-green-400',
        border: 'hover:border-green-400'
    },
    {
        level: 2,
        emoji: '🐥',
        img: animEmoji('1f425'),
        warna: 'from-yellow-200 to-amber-400',
        border: 'hover:border-amber-400'
    },
    {
        level: 3,
        emoji: '🦉',
        img: animEmoji('1f989'),
        warna: 'from-sky-300 to-blue-500',
        border: 'hover:border-blue-400'
    },
    {
        level: 4,
        emoji: '🚀',
        img: animEmoji('1f680'),
        warna: 'from-violet-300 to-purple-500',
        border: 'hover:border-purple-400'
    },
    {
        level: 5,
        emoji: '👑',
        img: animEmoji('1f451'),
        warna: 'from-orange-300 to-rose-500',
        border: 'hover:border-rose-400'
    }
];

// ============================================================
// MEMBUAT URL GAME
// ============================================================

function buatUrlGame(level) {
    const params = new URLSearchParams();

    params.set('level', String(level));

    if (ssoToken) {
        params.set('ssoToken', ssoToken);
    }

    if (competencyCode) {
        params.set('kompetensi', competencyCode);
    }

    return `misi1.html?${params.toString()}`;
}

// ============================================================
// PESAN STATUS
// ============================================================

function tampilkanPesan(judul, pesan) {
    if (!gridEl) return;

    const kotak = document.createElement('div');

    kotak.className =
        'col-span-full bg-white border border-slate-200 ' +
        'rounded-2xl p-5 text-center shadow-sm';

    const heading = document.createElement('h3');
    heading.className = 'font-bold text-slate-800';
    heading.textContent = judul;

    const isi = document.createElement('p');
    isi.className = 'mt-2 text-sm text-slate-500';
    isi.textContent = pesan;

    kotak.appendChild(heading);
    kotak.appendChild(isi);

    gridEl.appendChild(kotak);
}

// ============================================================
// TAMPILKAN SEMUA KARTU LEVEL
// ============================================================

function renderLevels() {
    if (!gridEl) {
        console.error('Elemen #level-grid tidak ditemukan di level.html.');
        return;
    }

    gridEl.innerHTML = '';

    const daftarSoal = dapatkanSoal();

    if (daftarSoal.length === 0) {
        tampilkanPesan(
            'Bank soal belum terbaca',
            'Pastikan soal-misi1.js berhasil dimuat sebelum level.js.'
        );

        console.error(
            'Bank soal tidak ditemukan. Periksa URL file soal-misi1.js.'
        );

        return;
    }

    if (ssoToken && !hasDashboardSession) {
        tampilkanPesan(
            'Sesi Dashboard tidak valid',
            'Silakan kembali ke Dashboard dan buka kembali misi literasi.'
        );

        console.error(
            'Token tidak dapat digunakan sebagai sesi misi yang valid.'
        );
    }

    LEVELS.forEach(data => {
        const jumlah = jumlahSoal(data.level);

        // Jika dibuka dari Dashboard, hanya level yang ditugaskan
        // yang boleh dimainkan dengan token misi tersebut.
        const levelSesuaiTugas =
            !hasDashboardSession ||
            data.level === assignedLevel;

        const bisaDimainkan =
            jumlah > 0 &&
            levelSesuaiTugas &&
            (!ssoToken || hasDashboardSession);

        const card = document.createElement(
            bisaDimainkan ? 'a' : 'div'
        );

        if (bisaDimainkan) {
            card.href = buatUrlGame(data.level);

            card.className =
                'interactive-elem word-card group relative bg-white ' +
                `border-2 border-slate-200 ${data.border} rounded-3xl ` +
                'p-5 shadow-md hover:shadow-xl hover:-translate-y-1 ' +
                'transition-all flex flex-col items-center gap-3 ' +
                'text-center cursor-pointer';

        } else {
            card.className =
                'relative bg-slate-100 border-2 border-slate-200 ' +
                'rounded-3xl p-5 flex flex-col items-center ' +
                'gap-3 text-center opacity-65';
        }

        const lingkaran = document.createElement('div');

        lingkaran.className =
            'relative w-24 h-24 rounded-full flex items-center ' +
            'justify-center text-5xl shadow-inner ' +
            (
                bisaDimainkan
                    ? `bg-gradient-to-br ${data.warna} ` +
                      'group-hover:scale-110 transition-transform'
                    : 'bg-slate-200'
            );

        const gambar = document.createElement('img');

        gambar.src = data.img;
        gambar.alt = `Level ${data.level}`;
        gambar.draggable = false;

        gambar.className =
            'w-16 h-16 object-contain pointer-events-none';

        gambar.onerror = () => {
            gambar.replaceWith(
                document.createTextNode(data.emoji)
            );
        };

        lingkaran.appendChild(gambar);

        const nomor = document.createElement('span');

        nomor.className =
            'absolute -top-1 -right-1 w-8 h-8 rounded-full ' +
            'bg-white border-2 border-slate-200 text-sm font-extrabold ' +
            'flex items-center justify-center shadow';

        nomor.textContent = data.level;

        lingkaran.appendChild(nomor);

        const judul = document.createElement('h3');

        judul.className =
            'text-xl font-extrabold text-slate-800';

        judul.textContent = `Level ${data.level}`;

        const jumlahLabel = document.createElement('span');

        jumlahLabel.className =
            'text-xs font-semibold px-3 py-1 rounded-full border ' +
            (
                bisaDimainkan
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-slate-200 text-slate-600 border-slate-300'
            );

        jumlahLabel.textContent =
            jumlah > 0
                ? `${jumlah} soal`
                : 'Belum tersedia';

        card.appendChild(lingkaran);
        card.appendChild(judul);
        card.appendChild(jumlahLabel);

        if (hasDashboardSession && data.level === assignedLevel) {
            const labelTugas = document.createElement('span');

            labelTugas.className =
                'text-xs font-bold text-emerald-700';

            labelTugas.textContent = 'Misi dari Dashboard';

            card.appendChild(labelTugas);
        }

        if (bisaDimainkan) {
            const tombol = document.createElement('span');

            tombol.className =
                'w-full py-2 rounded-xl bg-orange-500 text-white ' +
                'text-sm font-bold';

            tombol.textContent = 'Mulai ▶';

            card.appendChild(tombol);

        } else {
            const keterangan = document.createElement('span');

            keterangan.className =
                'text-xs text-slate-500';

            if (jumlah === 0) {
                keterangan.textContent = 'Tidak ada soal';

            } else if (
                hasDashboardSession &&
                data.level !== assignedLevel
            ) {
                keterangan.textContent =
                    `Misi ini menetapkan Level ${assignedLevel}`;

            } else {
                keterangan.textContent = 'Buka misi dari Dashboard';
            }

            card.appendChild(keterangan);
        }

        gridEl.appendChild(card);
    });

    if (hasDashboardSession) {
        const info = document.createElement('p');

        info.className =
            'col-span-full text-xs text-center text-slate-500 mt-2';

        info.textContent =
            `Dashboard menugaskan Level ${assignedLevel}. ` +
            'Semua soal asli pada level tersebut digunakan bersama.';

        gridEl.appendChild(info);
    }
}

// ============================================================
// SENSOR GESTUR
// ============================================================

const videoElement = document.getElementById('webcam');
const gestureStatusEl = document.getElementById('gesture-status');
const cameraDotEl = document.getElementById('camera-dot');
const virtualCursorEl = document.getElementById('virtual-cursor');

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

        const dt = Math.max(
            (t - this.tPrev) / 1000,
            0.001
        );

        this.tPrev = t;

        const dx = (x - this.xPrev) / dt;

        this.dxPrev +=
            OneEuro.alpha(1, dt) *
            (dx - this.dxPrev);

        const cutoff = 0.8 + 0.05 * Math.abs(this.dxPrev);

        this.xPrev +=
            OneEuro.alpha(cutoff, dt) *
            (x - this.xPrev);

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
        const element = document.elementFromPoint(
            x + dx,
            y + dy
        );

        const target = element
            ? element.closest('.interactive-elem')
            : null;

        if (target) return target;
    }

    return null;
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

// ============================================================
// HASIL DETEKSI TANGAN
// ============================================================

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
                    'w-1.5 h-1.5 rounded-full ' +
                    'bg-amber-400 animate-ping';
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

    const raw = daftarTangan[0];
    const indexTip = raw[8];

    const margin = CFG.edgeMargin;

    const targetX =
        Math.min(
            1,
            Math.max(
                0,
                ((1 - indexTip.x) - margin) / (1 - 2 * margin)
            )
        ) * window.innerWidth;

    const targetY =
        Math.min(
            1,
            Math.max(
                0,
                (indexTip.y - margin) / (1 - 2 * margin)
            )
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

    if (cameraDotEl) {
        cameraDotEl.className =
            'w-1.5 h-1.5 rounded-full ' +
            'bg-emerald-500 animate-pulse';
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

// ============================================================
// INISIALISASI KAMERA
// ============================================================

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
            'Kartu level tetap dapat dipilih dengan mouse.'
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
                await hands.send({
                    image: videoElement
                });
            },
            width: 640,
            height: 480
        });

        camera.start().catch(error => {
            console.error('Kamera gagal dijalankan:', error);

            if (gestureStatusEl) {
                gestureStatusEl.textContent = 'Mode Sentuh Aktif';
            }

            if (cameraDotEl) {
                cameraDotEl.className =
                    'w-1.5 h-1.5 rounded-full bg-rose-500';
            }
        });

    } catch (error) {
        console.error('Gagal memulai MediaPipe:', error);

        if (gestureStatusEl) {
            gestureStatusEl.textContent = 'Mode Sentuh Aktif';
        }
    }
}

// ============================================================
// JALANKAN HALAMAN
// ============================================================

// Selalu render kartu meski token atau mapping kompetensi
// bermasalah. Jangan throw sebelum kartu dibuat.
renderLevels();

// Kamera tidak boleh menghalangi pembuatan kartu.
mulaiKamera();
