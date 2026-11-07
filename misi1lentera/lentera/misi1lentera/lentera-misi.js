/* ============================================================
   LENTERA — Lapisan integrasi misi Dashboard
   Dipakai bersama oleh Game 1 (Literasi) dan Game 2 (Numerasi).

   Aktif hanya bila URL membawa ?ssoToken= (mode Dashboard).
   Tanpa token (mode mandiri) semua fungsi aman dan tidak melakukan apa-apa.

   Tugas modul ini:
     1. mengambil soal level dari bank guru           (GET  soal_api)
     2. menampilkan lampu (1 lampu per soal) dan jam  (HUD)
     3. mencatat awal jam di server                   (POST mulai_api)
     4. denda poin tiap `tick` detik setelah waktu habis; lewat
        `toleransi` detik = level GAGAL                (POST api, gagal)
     5. layar galat / waktu habis dengan satu tombol "Kembali ke Beranda"

   Aturan waktu (identik dengan dashboard, lihat belajar/jalur.py):
     sisa  = batas - berjalan
     lewat = max(0, berjalan - batas)
     kena  = min(floor(lewat / tick), floor(toleransi / tick))   // jumlah denda
     gagal bila lewat > toleransi
   ============================================================ */
(function (global) {
  'use strict';

  const doc = global.document;
  const params = new URLSearchParams(global.location.search);
  const token = params.get('ssoToken') || '';

  function dekode(t) {
    try {
      const bagian = String(t).split('.')[1];
      if (!bagian) return null;
      const n = bagian.replace(/-/g, '+').replace(/_/g, '/');
      const biner = atob(n + '='.repeat((4 - n.length % 4) % 4));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(biner, c => c.charCodeAt(0))));
    } catch (_) {
      return null;
    }
  }

  const sesi = token ? dekode(token) : null;

  const LM = {
    token,
    sesi,
    aktif: Boolean(sesi && sesi.misi && sesi.api && sesi.soal_api && sesi.mulai_api),
    soal: [],
    benar: new Set(),   // id soal yang sudah pernah dijawab benar
    total: 0,
    bagian: 0,
    level: 0,
    batas: 0,           // detik, 0 = tanpa batas waktu
    tick: Number(sesi && sesi.tick_detik) || 10,
    toleransi: Number(sesi && sesi.toleransi_detik) || 30,
    penalti: Number(sesi && sesi.penalti_poin) || 5
  };

  let awal = 0;          // detik yang sudah lewat menurut server saat jam dimulai
  let tMulai = 0;        // Date.now() ketika respons mulai_api diterima
  let berhenti = false;
  let timer = null;
  let denda = 0;         // jumlah denda waktu yang sudah dikenakan
  let durasiAkhir = null; // durasi level, dibekukan saat akhiri()
  let cb = {};
  let muatJanji = null;
  let mulaiJanji = null;
  const el = {};

  const tunggu = ms => new Promise(r => setTimeout(r, ms));
  const berjalan = () => (tMulai ? awal + (Date.now() - tMulai) / 1000 : 0);
  const pad = n => String(n).padStart(2, '0');
  const fmt = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
  const header = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token });

  // ---------- CSS (milik modul, tidak bergantung pada Tailwind) ----------
  function pasangCss() {
    if (doc.getElementById('lm-css')) return;
    const s = doc.createElement('style');
    s.id = 'lm-css';
    s.textContent = `
.lm-hud{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap}
.lm-hud.lm-melayang{position:fixed;top:10px;right:10px;z-index:9000;background:#fff;padding:6px 10px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.lm-jam{display:inline-flex;align-items:center;gap:5px;font:800 13px/1 system-ui,sans-serif;color:#334155;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;padding:5px 9px}
.lm-jam[hidden]{display:none}
.lm-jam.lm-hampir{color:#92400e;background:#fef3c7;border-color:#f59e0b}
.lm-jam.lm-habis{color:#fff;background:#dc2626;border-color:#b91c1c;animation:lmDenyut .8s ease-in-out infinite}
.lm-lampu{display:inline-flex;gap:6px;align-items:center}
.lm-lamp{position:relative;display:inline-block;width:22px;height:24px;border-radius:50% 50% 42% 42%;background:#e2e8f0;border:2px solid #cbd5e1;transition:background .3s,box-shadow .3s,border-color .3s}
.lm-lamp::before{content:"";position:absolute;left:50%;bottom:-6px;width:10px;height:4px;margin-left:-5px;border-radius:2px;background:#cbd5e1}
.lm-lamp.on{background:radial-gradient(circle at 50% 38%,#fffbe0,#fbbf24 72%);border-color:#f59e0b;box-shadow:0 0 0 3px rgba(251,191,36,.28),0 0 14px 4px rgba(251,191,36,.7)}
.lm-lamp.on::before{background:#f59e0b}
.lm-lamp.on::after{content:"\\2713";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 13px/1 system-ui,sans-serif;color:#92400e}
.lm-lamp.baru{animation:lmPop .8s cubic-bezier(.2,.9,.3,1.4)}
.lm-banner{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9500;max-width:min(92vw,640px);background:#dc2626;color:#fff;font:700 14px/1.35 system-ui,sans-serif;padding:10px 16px;border-radius:14px;box-shadow:0 8px 24px rgba(220,38,38,.45);text-align:center}
.lm-toast{position:fixed;bottom:84px;left:50%;transform:translateX(-50%);z-index:9600;background:#111827;color:#fde68a;font:900 20px/1 system-ui,sans-serif;padding:10px 18px;border-radius:14px;animation:lmToast 1.9s ease forwards}
.lm-layar{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.8);display:flex;align-items:center;justify-content:center;padding:16px}
.lm-kartu{background:#fff;border-radius:24px;max-width:420px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4);border:4px solid #fbbf24;font-family:system-ui,sans-serif}
.lm-ikon{font-size:54px;line-height:1.1;margin-bottom:6px}
.lm-kartu h2{margin:0 0 8px;font-size:26px;font-weight:900;color:#1e293b}
.lm-kartu p{margin:0 0 20px;color:#475569;font-size:15px;line-height:1.5}
.lm-kartu button{width:100%;padding:14px;border:0;border-radius:16px;background:linear-gradient(90deg,#f97316,#e11d48);color:#fff;font:800 16px system-ui,sans-serif;cursor:pointer}
@keyframes lmPop{0%{transform:scale(.55)}55%{transform:scale(1.4)}100%{transform:scale(1)}}
@keyframes lmDenyut{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes lmToast{0%{opacity:0;transform:translate(-50%,8px)}12%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-6px)}}
`;
    doc.head.appendChild(s);
  }

  // ---------- Komponen tampilan ----------
  function layar(o) {
    pasangCss();
    const lama = doc.getElementById('lm-layar');
    if (lama) lama.remove();
    const w = doc.createElement('div');
    w.className = 'lm-layar';
    w.id = 'lm-layar';
    const k = doc.createElement('div');
    k.className = 'lm-kartu';
    k.setAttribute('role', 'alertdialog');
    const i = doc.createElement('div');
    i.className = 'lm-ikon';
    i.textContent = o.ikon || '💡';
    const h = doc.createElement('h2');
    h.textContent = o.judul || '';
    const p = doc.createElement('p');
    p.textContent = o.pesan || '';
    const b = doc.createElement('button');
    b.type = 'button';
    b.id = 'lm-tombol';
    b.className = 'interactive-elem modal-action-btn';
    b.textContent = o.tombol || '🏠 Kembali ke Beranda';
    b.addEventListener('click', () => {
      if (o.aksi) { w.remove(); o.aksi(); } else { LM.keBeranda(); }
    });
    k.append(i, h, p, b);
    w.appendChild(k);
    doc.body.appendChild(w);
    return w;
  }

  function muatan(tampil) {
    let w = doc.getElementById('lm-muat');
    if (!tampil) { if (w) w.remove(); return; }
    if (w) return;
    pasangCss();
    w = doc.createElement('div');
    w.id = 'lm-muat';
    w.className = 'lm-layar';
    w.innerHTML = '<div class="lm-kartu"><div class="lm-ikon">⏳</div><h2>Memuat soal…</h2><p>Tunggu sebentar ya.</p></div>';
    doc.body.appendChild(w);
  }

  function banner(teks) {
    let b = doc.getElementById('lm-banner');
    if (!teks) { if (b) b.remove(); return; }
    pasangCss();
    if (!b) {
      b = doc.createElement('div');
      b.id = 'lm-banner';
      b.className = 'lm-banner';
      b.setAttribute('role', 'alert');
      doc.body.appendChild(b);
    }
    if (b.textContent !== teks) b.textContent = teks;
  }

  function toast(teks) {
    pasangCss();
    const t = doc.createElement('div');
    t.className = 'lm-toast';
    t.textContent = teks;
    doc.body.appendChild(t);
    setTimeout(() => t.remove(), 1900);
  }

  function gambarLampu(baru) {
    if (!el.lamps) return;
    el.lamps.forEach((l, i) => {
      l.classList.toggle('on', i < LM.benar.size);
      l.classList.toggle('baru', i === baru);
    });
    el.lampu.setAttribute('aria-label', `${Math.min(LM.benar.size, LM.total)} dari ${LM.total} lampu menyala`);
  }

  function bangunHud() {
    if (el.hud) return;
    pasangCss();
    let hud = doc.getElementById('lentera-hud');
    const melayang = !hud;
    if (melayang) { hud = doc.createElement('div'); doc.body.appendChild(hud); }
    hud.className = 'lm-hud' + (melayang ? ' lm-melayang' : '');
    hud.innerHTML = '<span class="lm-jam" hidden><span aria-hidden="true">⏱</span><b class="lm-jam-teks">00:00</b></span><span class="lm-lampu" role="img"></span>';
    el.hud = hud;
    el.jam = hud.querySelector('.lm-jam');
    el.teks = hud.querySelector('.lm-jam-teks');
    el.lampu = hud.querySelector('.lm-lampu');
    el.lamps = [];
    for (let i = 0; i < LM.total; i++) {
      const l = doc.createElement('span');
      l.className = 'lm-lamp';
      el.lampu.appendChild(l);
      el.lamps.push(l);
    }
    if (LM.batas > 0) { el.jam.hidden = false; el.teks.textContent = fmt(LM.batas); }
    gambarLampu(-1);
  }

  // ---------- Jam, denda, gagal ----------
  function hentikanJam() {
    berhenti = true;
    clearInterval(timer);
    banner(null);
  }

  function tampilGagal() {
    banner(null);
    layar({
      ikon: '⏰',
      judul: 'Waktu Habis',
      pesan: 'Tidak apa-apa! Waktu belajarmu sudah lewat. Kembali ke beranda, lalu coba lagi dengan soal baru ya.'
    });
  }

  async function gagalWaktu() {
    if (berhenti) return;
    hentikanJam();
    if (cb.onGagal) { try { cb.onGagal(); } catch (_) { /* abaikan */ } }
    tampilGagal();
    let skor = 0;
    try { skor = cb.skor ? Number(cb.skor()) : 0; } catch (_) { skor = 0; }
    const body = {
      events: [],
      gagal: 'waktu',
      skor: Math.max(0, Math.min(100, Math.round(skor) || 0)),
      durasi_detik: Math.round(berjalan())
    };
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(sesi.api, { method: 'POST', mode: 'cors', credentials: 'omit', headers: header(), body: JSON.stringify(body) });
        if (r.ok) return;
      } catch (_) { /* coba lagi */ }
      await tunggu(1200);
    }
  }

  function detak() {
    if (berhenti) return;
    const t = berjalan();
    const sisa = LM.batas - t;
    if (sisa > 0) {
      el.teks.textContent = fmt(Math.ceil(sisa));
      el.jam.classList.toggle('lm-hampir', sisa <= Math.max(30, LM.batas * 0.2));
      return;
    }
    el.jam.classList.remove('lm-hampir');
    el.jam.classList.add('lm-habis');
    el.teks.textContent = '00:00';
    const lewat = t - LM.batas;
    const kena = Math.min(Math.floor(lewat / LM.tick), Math.floor(LM.toleransi / LM.tick));
    if (kena > denda) {
      const baru = kena - denda;
      denda = kena;
      toast(`−${baru * LM.penalti} poin`);
      if (cb.onDenda) cb.onDenda(baru, denda);
    }
    if (lewat > LM.toleransi) { gagalWaktu(); return; }
    banner(`⚠️ Waktu habis! Poin berkurang ${LM.penalti} tiap ${LM.tick} detik. Gagal dalam ${Math.max(0, Math.ceil(LM.toleransi - lewat))} detik.`);
  }

  // ---------- API publik ----------
  LM.tampilLayar = layar;

  LM.keBeranda = function () {
    if (sesi && sesi.home) global.location.href = sesi.home;
    else if (global.history.length > 1) global.history.back();
  };

  LM.teksBagian = () => (sesi && sesi.bagian ? `Bagian ${sesi.bagian} · ` : '');

  /** Ambil soal level ini. Mengembalikan data API, atau null bila gagal (layar galat sudah tampil). */
  LM.muat = function () {
    if (!token) return Promise.resolve(null);
    if (!muatJanji) {
      muatan(true);
      muatJanji = (async () => {
        if (!LM.aktif) {
          layar({ ikon: '🔗', judul: 'Tautan misi sudah lama', pesan: 'Kembali ke beranda, lalu tekan "Mulai misi" lagi ya.' });
          return null;
        }
        let r;
        try {
          const resp = await fetch(sesi.soal_api, { headers: { Authorization: 'Bearer ' + token }, mode: 'cors', credentials: 'omit' });
          r = { ok: resp.ok, data: await resp.json().catch(() => ({})) };
        } catch (_) {
          r = { ok: false, data: {} };
        }
        const d = r.data || {};
        if (!r.ok) {
          if (d.gagal) tampilGagal();
          else if (d.selesai) layar({ ikon: '🏆', judul: 'Level ini sudah selesai', pesan: 'Lampumu sudah menyala. Kembali ke beranda untuk lanjut ke level berikutnya.' });
          else layar({ ikon: '😕', judul: 'Soal belum bisa dibuka', pesan: d.error || 'Tidak bisa terhubung ke dashboard. Kembali ke beranda, lalu coba lagi.' });
          return null;
        }
        LM.soal = Array.isArray(d.soal) ? d.soal : [];
        LM.benar = new Set(d.benar_ids || []);
        LM.total = Number(d.total) || LM.soal.length;
        LM.bagian = d.bagian;
        LM.level = d.level;
        LM.batas = Math.max(0, Number(d.batas_detik) || 0);
        bangunHud();
        return d;
      })().finally(() => muatan(false));
    }
    return muatJanji;
  };

  /**
   * Mulai jam level (panggil saat soal pertama tampil). Aman dipanggil berulang.
   * opsi: { onDenda(jumlahBaru, totalDenda), onGagal(), skor() }. Mengembalikan true bila level boleh dimainkan.
   */
  LM.mulai = function (opsi) {
    if (!LM.aktif) return Promise.resolve(true);
    cb = opsi || {};
    if (!mulaiJanji) {
      mulaiJanji = (async () => {
        let d = null;
        for (let i = 0; i < 3 && !d; i++) {
          try {
            const r = await fetch(sesi.mulai_api, { method: 'POST', mode: 'cors', credentials: 'omit', headers: header(), body: '{}' });
            const j = await r.json().catch(() => ({}));
            if (r.ok) d = j;
          } catch (_) { /* coba lagi */ }
          if (!d) await tunggu(700 * (i + 1));
        }
        if (!d) {
          layar({ ikon: '📡', judul: 'Belum tersambung', pesan: 'Level belum bisa dimulai. Kembali ke beranda, lalu coba lagi.' });
          return false;
        }
        if (d.gagal) { tampilGagal(); return false; }
        awal = Number(d.berjalan_detik) || 0;
        tMulai = Date.now();
        if (LM.batas > 0 && el.jam) {
          el.jam.hidden = false;
          timer = setInterval(detak, 250);
          detak();
        }
        return true;
      })();
    }
    return mulaiJanji;
  };

  /** Nyalakan lampu untuk soal yang pertama kali dijawab benar. true bila lampu baru menyala. */
  LM.tandaiBenar = function (id) {
    if (!LM.aktif || !id || LM.benar.has(id)) return false;
    LM.benar.add(id);
    gambarLampu(LM.benar.size - 1);
    return true;
  };

  /** Samakan lampu dengan status server (objek `lampu` pada respons event). */
  LM.sinkron = function (lampu) {
    if (!LM.aktif || !lampu || !Array.isArray(lampu.benar_ids)) return;
    let baru = -1;
    lampu.benar_ids.forEach(id => {
      if (!LM.benar.has(id)) { LM.benar.add(id); baru = LM.benar.size - 1; }
    });
    gambarLampu(baru);
  };

  /** Hentikan jam saat level selesai. Mengembalikan {skor, durasi_detik} untuk dikirim bersama `selesai`. */
  LM.akhiri = function (skor) {
    hentikanJam();
    if (durasiAkhir === null) durasiAkhir = Math.round(berjalan());
    return {
      skor: Math.max(0, Math.min(100, Math.round(Number(skor) || 0))),
      durasi_detik: durasiAkhir
    };
  };

  /** Total poin denda waktu yang sudah dikenakan. */
  LM.dendaPoin = () => denda * LM.penalti;

  global.LenteraMisi = LM;
})(window);
