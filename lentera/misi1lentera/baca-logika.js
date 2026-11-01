'use strict';

// =============================================================
// LENTERA — GAME BACA KALIMAT : LOGIKA MURNI (tanpa DOM)
// Dipakai baca.js di browser, dan bisa diuji di Node:
//     node -e "console.log(require('./baca-logika.js'))"
// =============================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BacaLogika = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // ===========================================================
  // ATURAN PENILAIAN (final)
  // Tiap kalimat bernilai 100. Setiap bacaan yang salah
  // mengurangi 5 poin. Poin tidak pernah di bawah 0.
  // Kalau diubah, ubah juga di app.py (BACA_POIN_*).
  // ===========================================================
  const POIN_AWAL = 100;
  const POIN_PER_SALAH = 5;
  const POIN_MINIMUM = 0;

  function hitungPoin(jumlahSalah) {
    const salah = Math.max(0, Math.floor(Number(jumlahSalah) || 0));
    return Math.max(POIN_MINIMUM, POIN_AWAL - POIN_PER_SALAH * salah);
  }

  // Sama dengan Game 1 (misi1.js) supaya predikat & bintang seragam.
  function tentukanPredikat(nilai) {
    if (nilai >= 100) return 'Sempurna';
    if (nilai >= 90) return 'Sangat Baik';
    if (nilai >= 75) return 'Baik';
    if (nilai >= 60) return 'Cukup';
    return 'Perlu Pendampingan';
  }

  function hitungBintang(nilai) {
    if (nilai < 50) return 1;
    if (nilai < 80) return 2;
    return 3;
  }

  function rataRata(daftar) {
    if (!daftar.length) return 0;
    const jumlah = daftar.reduce((total, n) => total + n, 0);
    return Math.round((jumlah / daftar.length) * 10) / 10;
  }

  // ===========================================================
  // ANGKA -> KATA  (mic sering menulis "7" untuk "tujuh")
  // ===========================================================
  const SATUAN = [
    'nol', 'satu', 'dua', 'tiga', 'empat',
    'lima', 'enam', 'tujuh', 'delapan', 'sembilan'
  ];

  function angkaKeKata(n) {
    n = Math.floor(n);

    if (n < 10) return SATUAN[n];
    if (n === 10) return 'sepuluh';
    if (n === 11) return 'sebelas';

    if (n < 20) return `${SATUAN[n - 10]} belas`;

    if (n < 100) {
      const sisa = n % 10;
      return `${SATUAN[Math.floor(n / 10)]} puluh` +
        (sisa ? ` ${SATUAN[sisa]}` : '');
    }

    if (n < 1000) {
      const ratusan = Math.floor(n / 100);
      const sisa = n % 100;
      const awal = ratusan === 1 ? 'seratus' : `${SATUAN[ratusan]} ratus`;
      return awal + (sisa ? ` ${angkaKeKata(sisa)}` : '');
    }

    if (n < 1000000) {
      const ribuan = Math.floor(n / 1000);
      const sisa = n % 1000;
      const awal = ribuan === 1 ? 'seribu' : `${angkaKeKata(ribuan)} ribu`;
      return awal + (sisa ? ` ${angkaKeKata(sisa)}` : '');
    }

    return String(n);
  }

  // ===========================================================
  // NORMALISASI
  // huruf kecil, tanpa aksen, angka jadi kata, tanda baca jadi spasi
  // ===========================================================
  function normalisasi(teks) {
    let s = String(teks === null || teks === undefined ? '' : teks)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    s = s.replace(/\d+/g, angka => ` ${angkaKeKata(parseInt(angka, 10))} `);
    s = s.replace(/[^a-z\s]/g, ' ');

    return s.replace(/\s+/g, ' ').trim();
  }

  function pecahKata(teks) {
    const bersih = normalisasi(teks);
    return bersih ? bersih.split(' ') : [];
  }

  // ===========================================================
  // KUNCI FONETIK
  // Ejaan Indonesia hampir sama dengan bunyinya, tetapi mic
  // sering memilih ejaan lain untuk nama: Bela/Bella, Andi/Andy,
  // Aziz/Azis, Raka/Rakha, Refan/Revan. Kata yang bunyinya sama
  // diberi kunci yang sama. Kata yang benar-benar beda
  // (membeli/memberi, sayur/sayuran) tetap dianggap beda.
  // ===========================================================
  function kunciFonetik(kata) {
    return String(kata)
      .replace(/kh/g, 'k')
      .replace(/ph/g, 'f')
      .replace(/th/g, 't')
      .replace(/sh/g, 's')
      .replace(/sy/g, 's')
      .replace(/dj/g, 'j')
      .replace(/tj/g, 'c')
      .replace(/oe/g, 'u')
      .replace(/x/g, 'ks')
      .replace(/q/g, 'k')
      .replace(/v/g, 'f')
      .replace(/z/g, 's')
      .replace(/([a-z])\1+/g, '$1')
      .replace(/y$/, 'i');
  }

  // ===========================================================
  // PERIKSA BACAAN
  //
  // Bacaan dianggap SAMA bila ada satu rentang kata berurutan
  // pada hasil mic yang hurufnya persis sama dengan kalimat
  // target (spasi tidak dihitung, jadi "perpus takaan" tetap
  // cocok dengan "perpustakaan").
  //
  // Karena yang dicari adalah rentang, kata tambahan di awal
  // atau di akhir ("eh", "ya") dan bacaan yang diulang setelah
  // salah ucap ("ibu masak ibu memasak nasi") tetap benar.
  // Kata yang kurang, tertukar, atau diganti kata lain: salah.
  //
  // Hasil:
  //   benar        true bila kalimat sama
  //   cocok[i]     kata target ke-i sudah terdengar (berurutan)
  //   jumlahCocok  banyaknya kata target yang terdengar
  //   jumlahKata   banyaknya kata target
  //   kataTerdengar banyaknya kata yang ditangkap mic
  // ===========================================================
  function periksaBacaan(target, hasil) {
    const kataTarget = pecahKata(target).map(kunciFonetik);
    const kataHasil = pecahKata(hasil).map(kunciFonetik);

    const cocok = new Array(kataTarget.length).fill(false);

    if (kataTarget.length === 0) {
      return {
        benar: false,
        cocok,
        jumlahCocok: 0,
        jumlahKata: 0,
        kataTerdengar: kataHasil.length
      };
    }

    const targetRapat = kataTarget.join('');
    let benar = false;

    for (let awal = 0; awal < kataHasil.length && !benar; awal++) {
      let gabungan = '';

      for (let akhir = awal; akhir < kataHasil.length; akhir++) {
        gabungan += kataHasil[akhir];

        if (gabungan.length > targetRapat.length) break;

        if (gabungan === targetRapat) {
          benar = true;
          break;
        }
      }
    }

    // Status per kata untuk sorotan: pencocokan berurutan.
    let posisi = 0;

    for (let i = 0; i < kataTarget.length; i++) {
      for (let j = posisi; j < kataHasil.length; j++) {
        if (kataHasil[j] === kataTarget[i]) {
          cocok[i] = true;
          posisi = j + 1;
          break;
        }
      }
    }

    if (benar) cocok.fill(true);

    return {
      benar,
      cocok,
      jumlahCocok: cocok.filter(Boolean).length,
      jumlahKata: kataTarget.length,
      kataTerdengar: kataHasil.length
    };
  }

  // Mic memberi beberapa kemungkinan kalimat. Benar bila salah
  // satunya cocok; kalau tidak, pakai yang paling banyak cocok.
  function periksaAlternatif(target, daftarTeks) {
    let terbaik = null;
    let teksTerbaik = '';

    daftarTeks.forEach(teks => {
      const hasil = periksaBacaan(target, teks);

      if (
        !terbaik ||
        (hasil.benar && !terbaik.benar) ||
        (
          hasil.benar === terbaik.benar &&
          hasil.jumlahCocok > terbaik.jumlahCocok
        )
      ) {
        terbaik = hasil;
        teksTerbaik = teks;
      }
    });

    return {
      ...(terbaik || periksaBacaan(target, '')),
      teks: teksTerbaik
    };
  }

  // ===========================================================
  // KATA UNTUK TAMPILAN
  // Kalimat ditampilkan per kata (dengan tanda bacanya). Satu
  // kata tampilan bisa berisi 0 sampai beberapa kata ternormalisasi
  // ("murid-murid" = 2, "7" = "tujuh", "," = 0), jadi dibuat peta
  // dari kata tampilan ke indeks pada hasil periksaBacaan().
  // ===========================================================
  function pecahTampilan(kalimat) {
    const kata = String(kalimat || '').trim().split(/\s+/).filter(Boolean);
    let nomor = 0;

    const peta = kata.map(item => {
      const jumlah = pecahKata(item).length;
      const indeks = [];

      for (let i = 0; i < jumlah; i++) indeks.push(nomor++);

      return indeks;
    });

    return { kata, peta };
  }

  // 'benar' | 'salah' untuk tiap kata tampilan.
  // Kata tanpa huruf (mis. tanda "-") dianggap benar.
  function statusTampilan(peta, cocok) {
    return peta.map(indeks => (
      indeks.every(i => cocok[i]) ? 'benar' : 'salah'
    ));
  }

  return {
    POIN_AWAL,
    POIN_PER_SALAH,
    POIN_MINIMUM,
    hitungPoin,
    tentukanPredikat,
    hitungBintang,
    rataRata,
    angkaKeKata,
    normalisasi,
    pecahKata,
    kunciFonetik,
    periksaBacaan,
    periksaAlternatif,
    pecahTampilan,
    statusTampilan
  };
});
