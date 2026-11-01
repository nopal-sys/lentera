
// =============================================================
// SOAL BACA KALIMAT — BANK KALIMAT GAME "BACA KALIMAT"
// Anak membaca kalimat dengan suara keras, lalu mikrofon
// memeriksa apakah bacaannya sama dengan kalimat di layar.
//
// Kompetensi dashboard: LT-LANCAR (Membaca lancar).
// ID tidak boleh diubah setelah dipakai karena tersimpan di
// laporan dan di Dashboard.
//
// MENAMBAH / MENGUBAH KALIMAT
//   id        : unik, maksimal 40 karakter
//   level     : 1 sampai 5
//   gambar    : emoji ATAU alamat gambar (mis. 'gambar/sayuribu.jpg')
//   kalimat   : kalimat yang harus dibaca. Boleh memakai tanda baca;
//               tanda baca tidak ikut diperiksa.
//
// CATATAN
//   Dashboard menandai misi selesai setelah 5 kalimat berbeda
//   dibaca dengan benar. Jaga agar tiap level punya minimal
//   5 kalimat.
//
// Tingkat kesulitan:
//   Level 1  : 3 kata, kata dasar
//   Level 2  : 4 sampai 5 kata
//   Level 3  : 5 sampai 6 kata, mulai ada awalan me-/ber-/ny-
//   Level 4  : 8 sampai 9 kata
//   Level 5  : 10 sampai 11 kata
// =============================================================

const soalBaca = [
  // ---------------------------- LEVEL 1 ----------------------------
  {
    id: 'LIT-BACA-01',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 1,
    gambar: '🍚',
    kalimat: 'Ibu memasak nasi.'
  },
  {
    id: 'LIT-BACA-02',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 1,
    gambar: '🥛',
    kalimat: 'Adik meminum susu.'
  },
  {
    id: 'LIT-BACA-03',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 1,
    gambar: '🐱',
    kalimat: 'Kucing memakan ikan.'
  },
  {
    id: 'LIT-BACA-04',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 1,
    gambar: '📖',
    kalimat: 'Ayah membaca buku.'
  },
  {
    id: 'LIT-BACA-05',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 1,
    gambar: '🧹',
    kalimat: 'Kakak menyapu lantai.'
  },

  // ---------------------------- LEVEL 2 ----------------------------
  {
    id: 'LIT-BACA-06',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 2,
    gambar: '🎶',
    kalimat: 'Ani menyanyi dengan riang.'
  },
  {
    id: 'LIT-BACA-07',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 2,
    gambar: '🐦',
    kalimat: 'Burung terbang di langit.'
  },
  {
    id: 'LIT-BACA-08',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 2,
    gambar: '🌳',
    kalimat: 'Dina menanam pohon jambu.'
  },
  {
    id: 'LIT-BACA-09',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 2,
    gambar: '🍱',
    kalimat: 'Kami makan siang bersama.'
  },
  {
    id: 'LIT-BACA-10',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 2,
    gambar: '🐓',
    kalimat: 'Ayam jantan berkokok setiap pagi.'
  },

  // ---------------------------- LEVEL 3 ----------------------------
  {
    id: 'LIT-BACA-11',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 3,
    gambar: '📚',
    kalimat: 'Tono dan Rani pergi ke perpustakaan.'
  },
  {
    id: 'LIT-BACA-12',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 3,
    gambar: '🌧️',
    kalimat: 'Hujan turun deras di sore hari.'
  },
  {
    id: 'LIT-BACA-13',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 3,
    gambar: '🍰',
    kalimat: 'Nenek membuat kue lapis untuk cucunya.'
  },
  {
    id: 'LIT-BACA-14',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 3,
    gambar: '🦟',
    kalimat: 'Nyamuk menggigit kaki adikku saat tidur.'
  },
  {
    id: 'LIT-BACA-15',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 3,
    gambar: '🏫',
    kalimat: 'Siswa kelas tiga membersihkan halaman sekolah.'
  },

  // ---------------------------- LEVEL 4 ----------------------------
  {
    id: 'LIT-BACA-16',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 4,
    gambar: '🎵',
    kalimat: 'Setiap pagi kami menyanyikan lagu kebangsaan sebelum belajar.'
  },
  {
    id: 'LIT-BACA-17',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 4,
    gambar: '🌾',
    kalimat: 'Petani menanam padi di sawah yang luas dan hijau.'
  },
  {
    id: 'LIT-BACA-18',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 4,
    gambar: '🍎',
    kalimat: 'Pak guru menjelaskan pelajaran dengan sabar kepada seluruh muridnya.'
  },
  {
    id: 'LIT-BACA-19',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 4,
    gambar: '🧼',
    kalimat: 'Kami menjaga kebersihan kelas agar belajar terasa nyaman.'
  },
  {
    id: 'LIT-BACA-20',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 4,
    gambar: '🚲',
    kalimat: 'Ayah mengajak kami bersepeda di taman setiap hari Minggu.'
  },

  // ---------------------------- LEVEL 5 ----------------------------
  {
    id: 'LIT-BACA-21',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 5,
    gambar: '💡',
    kalimat: 'Dengan rajin membaca buku setiap hari, wawasan kita akan semakin luas.'
  },
  {
    id: 'LIT-BACA-22',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 5,
    gambar: '🌿',
    kalimat: 'Menjaga lingkungan tetap bersih adalah tanggung jawab kita semua di sekolah.'
  },
  {
    id: 'LIT-BACA-23',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 5,
    gambar: '🎖️',
    kalimat: 'Para pahlawan berjuang dengan gagah berani demi kemerdekaan bangsa Indonesia.'
  },
  {
    id: 'LIT-BACA-24',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 5,
    gambar: '🎣',
    kalimat: 'Nelayan berangkat melaut pada dini hari untuk menangkap ikan segar.'
  },
  {
    id: 'LIT-BACA-25',
    kompetensiDashboard: 'LT-LANCAR',
    jenisKompetensi: 'baca_lantang',
    level: 5,
    gambar: '🤝',
    kalimat: 'Kejujuran membuat kita selalu dipercaya oleh teman, guru, dan keluarga.'
  }
];
