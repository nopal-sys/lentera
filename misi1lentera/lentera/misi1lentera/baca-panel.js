'use strict';

// =============================================================
// LENTERA — PANEL BACA KALIMAT (MIKROFON)
//
// Susun kalimat dan baca kalimat adalah satu kesatuan dalam satu
// game Literasi: satu level memuat keduanya. Panel ini tampil di
// halaman misi1.html bila soal yang sedang dimainkan berjenis
// "baca"; soal susun memakai kartu kata seperti biasa.
//
// Logika pemeriksaan bacaan ada di baca-logika.js (murni, tanpa
// DOM). Panel ini hanya mengurus tampilan, mikrofon (Web Speech
// API), dan suara contoh. Penilaian soal, lampu, jam level, dan
// pengiriman ke Dashboard ada di misi1.js (callback onHasil).
//
// API:
//   BacaPanel.init({ onHasil })      pasang tombol, sekali saja
//   BacaPanel.tampilkan(q, salah)    tampilkan kalimat soal baca
//   BacaPanel.siapLagi({ otomatis }) setelah bacaan salah: coba lagi
//   BacaPanel.perbaruiPoin(salah, animasi)
//   BacaPanel.batalkan()             hentikan mikrofon dan suara contoh
//   BacaPanel.sembunyikan()          dipakai saat soal susun tampil
// =============================================================

window.BacaPanel = (function () {
  const L = window.BacaLogika;

  const CFG = {
    bahasa: 'id-ID',
    jedaDiamMs: 1800,      // diam setelah suara terakhir -> bacaan dinilai
    tungguSuaraMs: 9000,   // tidak ada suara sama sekali -> berhenti, poin TIDAK berkurang
    maksDengarMs: 30000,   // batas keras satu kali mendengarkan
    jumlahAlternatif: 5,   // kemungkinan kalimat yang diminta dari mikrofon
    lajuContoh: 0.85       // kecepatan suara "Dengarkan contoh"
  };

  const SpeechRecognitionAPI =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null;

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

  const IKON_MIC = { siap: '🎤', mendengar: '🎙️', menilai: '⏳', dialog: '🎤' };

  const JUDUL_MIC = {
    siap: 'Tekan mikrofon untuk mulai membaca',
    mendengar: 'Mendengarkan… baca sekarang!',
    menilai: 'Memeriksa bacaanmu…',
    dialog: 'Tekan mikrofon untuk mulai membaca'
  };

  // Gangguan perangkat/jaringan: bukan kesalahan anak, poin aman.
  const GANGGUAN = ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported'];

  const $ = id => document.getElementById(id);

  let el = null;               // elemen DOM (diisi init)
  let onHasil = () => {};
  let soal = null;             // soal baca yang sedang tampil
  let mode = 'siap';           // siap | mendengar | menilai | dialog
  let tampilan = { kata: [], peta: [] };
  let kataEls = [];
  let mulaiPercobaan = Date.now();
  let sesiAktif = null;        // satu kali mendengarkan mikrofon
  let sesiNomor = 0;
  let sedangBicara = false;    // suara contoh sedang diputar
  const pakaiContoh = new Set();  // id soal yang memakai suara contoh (dicatat sebagai petunjuk)
  let butuhBantuan = false;    // mikrofon tidak bisa dipakai di perangkat ini

  // ------------------------------------------------------------
  // Tampilan
  // ------------------------------------------------------------

  function statusLine(teks) {
    el.status.textContent = teks || '';
  }

  function resetTerdengar() {
    el.terdengar.innerHTML =
      '<span class="text-slate-400 italic">Kata yang terdengar akan muncul di sini.</span>';
  }

  function tampilkanTerdengar(teks) {
    if (!teks) {
      resetTerdengar();
      return;
    }

    el.terdengar.textContent = teks;
  }

  function tampilkanCatatan(kode) {
    const isi = CATATAN[kode];

    if (!isi) return;

    el.catatanJudul.textContent = isi[0];
    el.catatanIsi.textContent = isi[1];
    el.catatan.classList.remove('hidden');

    // Mikrofon tidak bisa dipakai sama sekali di perangkat ini: sediakan bantuan guru
    // supaya level tidak macet. Bantuan dicatat sebagai petunjuk di Dashboard.
    if (['tidak-didukung', 'tidak-aman', 'not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(kode)) {
      butuhBantuan = true;
      el.bantuan.classList.remove('hidden');
    }
  }

  function sembunyikanCatatan() {
    el.catatan.classList.add('hidden');
  }

  function ukuranKalimat(jumlahKata) {
    if (jumlahKata <= 4) return 'text-4xl sm:text-5xl';
    if (jumlahKata <= 8) return 'text-3xl sm:text-4xl';
    return 'text-2xl sm:text-3xl';
  }

  function renderKalimat(q) {
    tampilan = L.pecahTampilan(q.kalimat);

    el.kalimat.className =
      'kalimat font-extrabold text-slate-800 ' + ukuranKalimat(tampilan.kata.length);

    el.kalimat.setAttribute('aria-label', q.kalimat);
    el.kalimat.innerHTML = '';
    kataEls = [];

    tampilan.kata.forEach((kata, index) => {
      const span = document.createElement('span');

      span.className = 'kata';
      span.textContent = kata;
      el.kalimat.appendChild(span);

      if (index < tampilan.kata.length - 1) {
        el.kalimat.appendChild(document.createTextNode(' '));
      }

      kataEls.push(span);
    });
  }

  // cocok : hasil periksaBacaan().cocok, atau null untuk mengosongkan
  // opsi  : { berikut: garis bawah kata berikutnya, tandaiSalah: kata yang belum tepat }
  function terapkanSorotan(cocok, opsi = {}) {
    let sudahBerikut = false;

    const status = cocok
      ? L.statusTampilan(tampilan.peta, cocok)
      : tampilan.kata.map(() => 'netral');

    kataEls.forEach((kata, i) => {
      const adaHuruf = tampilan.peta[i].length > 0;
      const benar = Boolean(cocok) && adaHuruf && status[i] === 'benar';
      const sebelumnya = kata.classList.contains('kata-benar');

      kata.classList.toggle('kata-benar', benar);

      if (benar && !sebelumnya) {
        kata.classList.remove('kata-baru');
        void kata.offsetWidth;
        kata.classList.add('kata-baru');
      }

      kata.classList.toggle('kata-salah', Boolean(opsi.tandaiSalah) && adaHuruf && !benar);

      const berikut = Boolean(opsi.berikut) && adaHuruf && !benar && !sudahBerikut;

      if (berikut) sudahBerikut = true;

      kata.classList.toggle('kata-berikut', berikut);
    });
  }

  function perbaruiPoin(jumlahSalah, animasi) {
    el.poinVal.textContent = L.hitungPoin(jumlahSalah);

    if (!animasi) return;

    el.poinWrap.classList.remove('poin-turun');
    void el.poinWrap.offsetWidth;
    el.poinWrap.classList.add('poin-turun');

    const minus = document.createElement('span');

    minus.className = 'poin-minus';
    minus.textContent = `-${L.POIN_PER_SALAH}`;

    el.poinWrap.appendChild(minus);
    setTimeout(() => minus.remove(), 1000);
  }

  function perbaruiTombol() {
    const bisaMic =
      (mode === 'siap' || mode === 'mendengar') &&
      !sedangBicara &&
      Boolean(SpeechRecognitionAPI);

    el.micBtn.disabled = !bisaMic;
    el.contohBtn.disabled = sedangBicara || mode === 'menilai' || mode === 'dialog';
  }

  function setMode(baru) {
    mode = baru;

    el.micPanel.dataset.mode = baru;
    el.micBtn.dataset.mode = baru;

    el.micBtn.setAttribute('aria-pressed', baru === 'mendengar' ? 'true' : 'false');
    el.micBtn.setAttribute('aria-label', baru === 'mendengar' ? 'Selesai membaca' : 'Mulai membaca');

    el.micIkon.textContent = IKON_MIC[baru];
    el.micJudul.textContent = JUDUL_MIC[baru];

    perbaruiTombol();
  }

  // ------------------------------------------------------------
  // Pengenal suara (Web Speech API)
  // ------------------------------------------------------------

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
    }, CFG.tungguSuaraMs);

    sesi.tMaks = setTimeout(() => hentikanSesi(sesi), CFG.maksDengarMs);
  }

  // Minta mikrofon berhenti baik-baik. Hasil akhirnya dinilai di onend
  // supaya teks final dari mikrofon ikut terhitung.
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
    sesi.tSenyap = setTimeout(() => hentikanSesi(sesi), CFG.jedaDiamMs);
  }

  function mulaiMendengar() {
    if (mode !== 'siap' || sedangBicara || !soal) return;

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

    rec.lang = CFG.bahasa;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = CFG.jumlahAlternatif;

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

    const periksa = L.periksaAlternatif(soal.kalimat, kandidat);

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

    // Masalah mikrofon / jaringan bukan kesalahan anak: poin aman.
    if (GANGGUAN.includes(sesi.error)) {
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

    const periksa = L.periksaAlternatif(soal.kalimat, sesi.kandidat.length ? sesi.kandidat : [teks]);

    nilaiBacaan(periksa, periksa.teks || teks);
  }

  // Anak (atau guru) mengetuk mikrofon saat mendengarkan = selesai membaca.
  function selesaiManual() {
    if (!sesiAktif) return;

    statusLine('Memeriksa bacaanmu…');
    hentikanSesi(sesiAktif);
  }

  // Hentikan mikrofon dan suara contoh tanpa menilai apa pun.
  function batalkan() {
    const sesi = sesiAktif;

    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    sedangBicara = false;

    if (!sesi) {
      if (el) perbaruiTombol();
      return;
    }

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

  // ------------------------------------------------------------
  // Menilai satu bacaan -> diteruskan ke misi1.js
  // ------------------------------------------------------------

  function polaBacaan(periksa) {
    if (periksa.benar) return '';

    return periksa.kataTerdengar < periksa.jumlahKata
      ? 'baca_kata_terlewat'
      : 'baca_kata_berbeda';
  }

  function nilaiBacaan(periksa, teksTerdengar, opsi = {}) {
    const waktuMs = Math.max(0, Date.now() - mulaiPercobaan);

    setMode('dialog');
    statusLine('');
    tampilkanTerdengar(teksTerdengar);

    if (periksa.benar) {
      terapkanSorotan(periksa.cocok);
    } else {
      terapkanSorotan(periksa.cocok, { tandaiSalah: true });
    }

    onHasil({
      benar: Boolean(periksa.benar),
      teks: teksTerdengar,
      waktuMs,
      pola: polaBacaan(periksa),
      pakaiContoh: Boolean(soal && pakaiContoh.has(soal.id)),
      bantuanGuru: Boolean(opsi.bantuanGuru),
      jumlahKata: periksa.jumlahKata,
      jumlahCocok: periksa.jumlahCocok,
      kataTerdengar: periksa.kataTerdengar
    });
  }

  // ------------------------------------------------------------
  // Suara contoh ("Dengarkan contoh")
  // ------------------------------------------------------------

  function putarContoh() {
    if (!soal) return;

    if (!('speechSynthesis' in window)) {
      statusLine('Browser ini belum bisa membacakan kalimat.');
      return;
    }

    if (mode === 'menilai' || mode === 'dialog') return;

    // Suara contoh tidak boleh ikut tertangkap mikrofon.
    batalkan();

    window.speechSynthesis.cancel();

    const ucapan = new SpeechSynthesisUtterance(soal.kalimat);

    ucapan.lang = CFG.bahasa;
    ucapan.rate = CFG.lajuContoh;

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
    pakaiContoh.add(soal.id);

    sedangBicara = true;
    statusLine('Mendengarkan contoh bacaan…');
    perbaruiTombol();

    window.speechSynthesis.speak(ucapan);
  }

  // Perangkat tanpa mikrofon: guru menandai bacaan benar supaya level tidak macet.
  function bantuanGuru() {
    if (!soal || mode === 'menilai' || mode === 'dialog') return;

    batalkan();

    const periksa = {
      benar: true,
      cocok: tampilan.kata.map(() => true),
      jumlahCocok: tampilan.kata.length,
      jumlahKata: tampilan.kata.length,
      kataTerdengar: tampilan.kata.length
    };

    nilaiBacaan(periksa, soal.kalimat, { bantuanGuru: true });
  }

  // ------------------------------------------------------------
  // API publik
  // ------------------------------------------------------------

  function init(opsi = {}) {
    onHasil = typeof opsi.onHasil === 'function' ? opsi.onHasil : onHasil;

    el = {
      panel: $('panel-baca'),
      kalimat: $('baca-kalimat'),
      micPanel: $('baca-mic-panel'),
      micBtn: $('baca-mic-btn'),
      micIkon: $('baca-mic-ikon'),
      micJudul: $('baca-mic-judul'),
      contohBtn: $('baca-contoh-btn'),
      status: $('baca-status'),
      terdengar: $('baca-terdengar'),
      catatan: $('baca-catatan'),
      catatanJudul: $('baca-catatan-judul'),
      catatanIsi: $('baca-catatan-isi'),
      bantuan: $('baca-bantuan'),
      bantuanBtn: $('baca-bantuan-btn'),
      poinWrap: $('baca-poin-wrap'),
      poinVal: $('baca-poin-val')
    };

    el.micBtn.onclick = () => {
      if (mode === 'siap') {
        mulaiMendengar();
      } else if (mode === 'mendengar') {
        selesaiManual();
      }
    };

    el.contohBtn.onclick = putarContoh;
    el.bantuanBtn.onclick = bantuanGuru;
  }

  function tampilkan(q, jumlahSalah = 0) {
    soal = q;

    el.panel.classList.remove('hidden');

    renderKalimat(q);
    terapkanSorotan(null);
    perbaruiPoin(jumlahSalah, false);
    resetTerdengar();
    sembunyikanCatatan();
    el.bantuan.classList.toggle('hidden', !butuhBantuan);

    setMode('siap');

    statusLine(
      SpeechRecognitionAPI
        ? 'Tekan mikrofon, lalu baca kalimat di atas dengan suara jelas. Pilih Izinkan jika browser meminta akses mikrofon.'
        : ''
    );

    if (!SpeechRecognitionAPI) tampilkanCatatan('tidak-didukung');

    mulaiPercobaan = Date.now();
  }

  // Setelah bacaan salah dan popup ditutup: bersihkan sorotan lalu coba lagi.
  function siapLagi(opsi = {}) {
    terapkanSorotan(null);
    resetTerdengar();
    setMode('siap');

    mulaiPercobaan = Date.now();

    if (opsi.otomatis) {
      // Anak sudah memutuskan mencoba lagi: nyalakan mikrofon langsung.
      setTimeout(() => {
        if (mode === 'siap' && !sedangBicara && soal) mulaiMendengar();
      }, 350);
    }
  }

  function sembunyikan() {
    if (!el) return;

    batalkan();
    soal = null;
    el.panel.classList.add('hidden');
  }

  return {
    init,
    tampilkan,
    siapLagi,
    perbaruiPoin,
    batalkan,
    sembunyikan,
    get didukung() { return Boolean(SpeechRecognitionAPI); }
  };
})();
