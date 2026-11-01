
// =============================================================
// SOAL MISI 1 — BANK SOAL ASLI GAME 1
// Mempertahankan 25 soal asli dan ID yang sudah ada.
// Metadata kompetensi dashboard ditambahkan untuk integrasi.
// =============================================================
//
// kompetensi              : kode lama untuk backend lokal.
// kompetensiDashboard     : kode kompetensi di dashboard.
// jenisKompetensi          : menjelaskan kemampuan yang diuji.
// Tidak ada soal baru yang ditambahkan.
//
// PEMETAAN SEMENTARA:
// LT-KALIMAT: menyusun kata/frasa/kalimat.
// LT-KOSAKATA: mengenali atau menyebut nama/kata dari gambar.
// LT-PAHAM: dua soal konteks visual jam, bukan bacaan teks.
// LT-LANCAR: belum tersedia soal yang mengukur kelancaran
// membaca lisan secara langsung.
//
// ID SOAL ASLI TIDAK DIUBAH.
// =============================================================

const questions = [
  {
    id: 'LIT-SPO-01',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 1,
    gambar: 'gambar/sayuribu.jpg',
    instruksi: '"Apa yang sedang dilakukan Ibu?"',
    correctOrder: ['Ibu', 'membeli', 'sayur'],
    words: ['sayur', 'Ibu', 'membeli', 'bermain', 'kemarin'],
    errorPatterns: {
      'sayur_membeli_Ibu': 'SPO_TERBALIK',
      'membeli_Ibu_sayur': 'PREDIKAT_AWAL'
    }
  },
  {
    id: 'LIT-SPO-02',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 1,
    gambar: 'gambar/rakabaca.jpg',
    instruksi: '"Apa yang sedang dilakukan Raka?"',
    correctOrder: ['Raka', 'membaca', 'buku'],
    words: ['buku', 'Raka', 'membaca', 'menulis', 'melukis', 'handphone'],
    errorPatterns: {
      'buku_membaca_Raka': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-03',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 1,
    gambar: 'gambar/budibola.jpg',
    instruksi: '"Apa yang sedang dilakukan Budi?"',
    correctOrder: ['Budi', 'bermain', 'bola', 'di', 'lapangan'],
    words: ['bola', 'Budi', 'bermain', 'menulis', 'di', 'lapangan', 'memakan', 'bakso'],
    errorPatterns: {
      'lapangan_di_bola_bermain_Budi': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-04',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 1,
    gambar: 'gambar/sitibunga.jpg',
    instruksi: '"Apa yang sedang dilakukan Siti?"',
    correctOrder: ['Siti', 'menyiram', 'bunga'],
    words: ['bunga', 'Siti', 'meletakkan', 'mangga', 'menanam', 'menyiram'],
    errorPatterns: {
      'bunga_menyiram_Siti': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-05',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 1,
    gambar: 'gambar/pandabambu.jpg',
    instruksi: '"Apa yang sedang dilakukan Panda?"',
    correctOrder: ['Panda', 'memakan', 'bambu'],
    words: ['bambu', 'Panda', 'memakan', 'meminum', 'padi', 'pisang'],
    errorPatterns: {
      'bambu_memakan_Panda': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-06',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 2,
    gambar: 'gambar/bersepeda.jpg',
    instruksi: '"Apa yang sedang dilakukan Refan?"',
    correctOrder: ['Refan', 'sedang', 'bersepeda'],
    words: ['bersepeda', 'Refan', 'sedang', 'mendorong', 'menarik', 'berlari'],
    errorPatterns: {
      'bersepeda_sedang_Refan': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-07',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 2,
    gambar: 'gambar/musik.jpg',
    instruksi: '"Kegiatan apa yang sedang dilakukan Andi?"',
    correctOrder: ['Andi', 'sedang', 'mendengarkan', 'musik'],
    words: ['mendengarkan', 'menggambar', 'menyanyi', 'gitar', 'musik', 'Andi', 'sedang'],
    errorPatterns: {
      'mendengarkan_musik_sedang_Andi': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-08',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KOSAKATA',
    jenisKompetensi: 'kosakata_deskriptif_bergambar',
    level: 2,
    gambar: 'gambar/mainanmerah.jpg',
    instruksi: '"Apa warna mobil mainan yang sedang dipegang Bima?"',
    correctOrder: ['berwarna', 'merah'],
    jawabanLain: [
      ['merah'],
      ['mobil', 'berwarna', 'merah']
    ],
    words: ['cokelat', 'mobil', 'berwarna', 'Bima', 'sedang', 'mengendarai', 'merah', 'biru', 'hijau'],
    errorPatterns: {
      'merah_berwarna': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-09',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-PAHAM',
    jenisKompetensi: 'pemahaman_konteks_visual_bukan_bacaan_teks',
    level: 2,
    gambar: 'gambar/jamtujuh.jpg',
    instruksi: '"Pada pukul berapa Ahmad bangun tidur?"',
    correctOrder: ['pukul', 'tujuh'],
    jawabanLain: [
      ['pada', 'pukul', 'tujuh']
    ],
    words: ['delapan', 'pukul', 'tidur', 'enam', 'tujuh', 'setengah', 'pada'],
    errorPatterns: {
      'tujuh_pukul': 'SPO_TERBALIK',
      'tujuh_pukul_pada': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-10',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-PAHAM',
    jenisKompetensi: 'pemahaman_konteks_visual_bukan_bacaan_teks',
    level: 2,
    gambar: 'gambar/jamduabelas.jpg',
    instruksi: '"Pada pukul berapa Rendi memakan MBG?"',
    correctOrder: ['pukul', 'dua belas'],
    jawabanLain: [
      ['pada', 'pukul', 'dua belas']
    ],
    words: ['dua', 'pukul', 'setengah', 'tujuh', 'satu', 'dua belas', 'pada'],
    errorPatterns: {
      'dua belas_pukul': 'SPO_TERBALIK',
      'dua belas_pukul_pada': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-11',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 3,
    gambar: 'gambar/otwsekolah.jpg',
    instruksi: '"Susun kalimat yang tepat sesuai dengan kondisi gambar disamping!"',
    correctOrder: ['Tomi', 'berangkat', 'ke', 'sekolah'],
    jawabanLain: [
      ['berangkat', 'ke', 'sekolah']
    ],
    words: ['menaiki', 'sepeda', 'Tomi', 'sekolah', 'ke', 'pada', 'berangkat'],
    errorPatterns: {
      'Tomi_sekolah_ke_berangkat': 'SPO_TERBALIK',
      'sekolah_ke_berangkat': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-12',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 3,
    gambar: 'gambar/sampah.jpg',
    instruksi: '"Kegiatan terpuji apa yang sedang dilakukan Doni?"',
    correctOrder: ['Doni', 'membuang', 'sampah', 'pada', 'tempatnya'],
    jawabanLain: [
      ['membuang', 'sampah', 'pada', 'tempatnya']
    ],
    words: ['tempatnya', 'membuang', 'sembarangan', 'terserah', 'Doni', 'sampah', 'pada', 'sungai', 'jalan'],
    errorPatterns: {
      'tempatnya_pada_sampah_membuang_Doni': 'SPO_TERBALIK',
      'tempatnya_pada_sampah_membuang': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-13',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 3,
    gambar: 'gambar/belajarmalam.jpg',
    instruksi: '"Kegiatan terpuji apa yang sedang dilakukan Pandu?"',
    correctOrder: ['Pandu', 'sedang', 'belajar', 'untuk', 'ujian', 'besok'],
    jawabanLain: [
      ['sedang', 'belajar', 'untuk', 'ujian', 'besok'],
      ['belajar', 'untuk', 'ujian', 'besok']
    ],
    words: ['Pandu', 'ujian', 'bermain', 'besok', 'memakan', 'untuk', 'belajar', 'sedang', 'malas'],
    errorPatterns: {
      'besok_ujian_untuk_belajar_sedang_Pandu': 'SPO_TERBALIK',
      'besok_ujian_untuk_belajar_sedang': 'SPO_TERBALIK',
      'besok_ujian_untuk_belajar': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-14',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KOSAKATA',
    jenisKompetensi: 'identifikasi_kategori_nama_bergambar',
    level: 3,
    gambar: 'gambar/hewan1.jpg',
    instruksi: '"Ada hewan apa saja yang ada digambar samping?"',
    urutanBebas: true,
    correctOrder: ['kucing', 'anjing', 'ikan', 'ular', 'burung', 'kelinci'],
    words: ['ular', 'gajah', 'kelinci', 'harimau', 'kucing', 'katak',
            'burung', 'sapi', 'ikan', 'anjing', 'kuda'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-15',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KOSAKATA',
    jenisKompetensi: 'identifikasi_kategori_nama_bergambar',
    level: 3,
    gambar: 'gambar/hewan2.jpg',
    instruksi: '"Ada hewan apa saja yang ada digambar samping?"',
    urutanBebas: true,
    correctOrder: ['jerapah', 'kucing', 'gajah', 'burung', 'monyet', 'landak', 'beruang', 'kura-kura', 'rubah', 'kelinci'],
    words: ['ular', 'gajah', 'kelinci', 'harimau', 'kucing', 'katak',
            'burung', 'sapi', 'ikan', 'anjing', 'kuda', 'jerapah', 'monyet', 'landak', 'beruang', 'kura-kura', 'rubah'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-16',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 4,
    gambar: 'gambar/melukis1.jpg',
    instruksi: '"Susun kata dibawah ini agar menjadi satu kalimat yang sesuai dengan gambar disamping!"',
    correctOrder: ['Aziz', 'sedang', 'melukis', 'pemandangan', 'gunung', 'di', 'siang', 'hari'],
    jawabanLain: [
      ['Aziz', 'sedang', 'melukis', 'pemandangan', 'gunung']
    ],
    words: ['Aziz', 'mewarnai', 'gunung', 'di', 'hari', 'siang', 'menggambar', 'malam', 'pemandangan', 'melukis', 'sedang'],
    errorPatterns: {
      'hari_siang_di_gunung_pemandangan_melukis_sedang_Aziz': 'SPO_TERBALIK',
      'gunung_pemandangan_melukis_sedang_Aziz': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-17',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 4,
    gambar: 'gambar/mancing.jpg',
    instruksi: '"Susun kata dibawah ini agar menjadi satu kalimat yang sesuai dengan gambar disamping!"',
    correctOrder: ['Umpan', 'pancing', 'yang', 'digunakan', 'oleh', 'Abdul', 'dimakan', 'ikan'],
    jawabanLain: [
      ['Umpan', 'yang', 'digunakan', 'oleh', 'Abdul', 'dimakan', 'ikan'],
      ['Umpan', 'yang', 'digunakan', 'Abdul', 'dimakan', 'ikan']
    ],
    words: ['ditangkap', 'ikan', 'Abdul', 'oleh', 'burung', 'pancing', 'dimakan', 'digunakan', 'Umpan', 'yang', 'pohon'],
    errorPatterns: {
      'ikan_dimakan_Abdul_oleh_digunakan_yang_pancing_Umpan': 'SPO_TERBALIK',
      'ikan_dimakan_Abdul_oleh_digunakan_yang_Umpan': 'SPO_TERBALIK',
      'ikan_dimakan_Abdul_digunakan_yang_Umpan': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-18',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 4,
    gambar: 'gambar/memupuk.jpg',
    instruksi: '"Susun kata dibawah ini agar menjadi satu kalimat yang sesuai dengan gambar disamping!"',
    correctOrder: ['Anton', 'dan', 'Bela', 'sedang', 'menanam', 'tanaman'],
    jawabanLain: [
      ['Anton', 'dan', 'Bela', 'menanam', 'tanaman']
    ],
    words: ['Bela', 'dan', 'ke', 'memberikan', 'air', 'Anton', 'tanaman', 'Anton', 'sedang', 'menanam'],
    errorPatterns: {
      'tanaman_menanam_sedang_Bela_dan_Anton': 'SPO_TERBALIK',
      'tanaman_menanam_Bela_dan_Anton': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-19',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KOSAKATA',
    jenisKompetensi: 'identifikasi_kategori_nama_bergambar',
    level: 4,
    gambar: 'gambar/buah.jpg',
    instruksi: '"Ada buah apa saja yang ada digambar samping?"',
    urutanBebas: true,
    correctOrder: ['apel', 'pisang', 'jeruk', 'anggur', 'stroberi'],
    words: ['apel', 'durian', 'jeruk', 'mangga', 'pisang', 'rambutan',
            'stroberi', 'nanas', 'anggur', 'semangka', 'jambu', 'bluberi'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-20',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KOSAKATA',
    jenisKompetensi: 'identifikasi_kategori_nama_bergambar',
    level: 4,
    gambar: 'gambar/sayurfix.jpg',
    instruksi: '"Ada sayur apa saja yang ada digambar samping?"',
    urutanBebas: true,
    correctOrder: ['wortel', 'brokoli', 'tomat', 'sawi', 'jagung'],
    words: ['wortel', 'cabai', 'bawang merah', 'alpukat', 'tomat', 'labu', 'jagung', 'singkong', 'sawi', 'bawang putih', 'timun', 'brokoli'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-21',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 5,
    gambar: 'gambar/upacara.jpg',
    instruksi: '"Kegiatan apa yang sedang dilakukan para siswa di gambar samping?"',
    correctOrder: ['Para', 'siswa', 'sedang', 'mengikuti', 'upacara', 'bendera'],
    jawabanLain: [
      ['Para', 'siswa', 'mengikuti', 'upacara', 'bendera'],
      ['Para', 'siswa', 'sedang', 'mengikuti', 'upacara'],
      ['Para', 'siswa', 'mengikuti', 'upacara']
    ],
    words: ['mengikuti', 'pramuka', 'siswa', 'memakan', 'bendera', 'sedang', 'Para', 'yang', 'dihukum', 'upacara'],
    errorPatterns: {
      'bendera_upacara_mengikuti_sedang_siswa_Para': 'SPO_TERBALIK',
      'bendera_upacara_mengikuti_siswa_Para': 'SPO_TERBALIK',
      'upacara_mengikuti_sedang_siswa_Para': 'SPO_TERBALIK',
      'upacara_mengikuti_siswa_Para': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-22',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 5,
    gambar: 'gambar/hutindo.jpg',
    instruksi: '"Buatlah kalimat yang sesuai dengan gambar disamping!"',
    correctOrder: ['perayaan', 'hari', 'ulang', 'tahun', 'Indonesia', 'berlangsung', 'meriah'],
    jawabanLain: [
      ['perayaan', 'hari', 'ulang', 'tahun', 'Indonesia', 'meriah'],
      ['anak-anak', 'sedang', 'merayakan', 'hari', 'ulang', 'tahun', 'Indonesia'],
      ['anak-anak', 'sedang', 'mengikuti', 'perayaan', 'hari', 'ulang', 'tahun', 'Indonesia'],
      ['anak-anak', 'mengikuti', 'perayaan', 'hari', 'ulang', 'tahun', 'Indonesia']
    ],
    words: ['perayaan', 'anak-anak', 'hari', 'sedang', 'meriah', 'ulang', 'tahun', 'Indonesia', 'berlangsung', 'mengikuti'],
    errorPatterns: {
      'meriah_berlangsung_Indonesia_tahun_ulang_hari_perayaan': 'SPO_TERBALIK',
      'meriah_Indonesia_tahun_ulang_hari_perayaan': 'SPO_TERBALIK',
      'Indonesia_tahun_ulang_hari_merayakan_sedang_anak-anak': 'SPO_TERBALIK',
      'Indonesia_tahun_ulang_hari_perayaan_mengikuti_sedang_anak-anak': 'SPO_TERBALIK',
      'Indonesia_tahun_ulang_hari_perayaan_mengikuti_anak-anak': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-23',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KOSAKATA',
    jenisKompetensi: 'identifikasi_kategori_nama_bergambar',
    level: 5,
    gambar: 'gambar/petaindo.jpg',
    instruksi: '"Sebutkan nama pulau besar di Indonesia!"',
    urutanBebas: true,
    correctOrder: ['Jawa', 'Sumatra', 'Kalimantan', 'Sulawesi', 'Papua'],
    words: ['Jawa', 'Sumatra', 'Kalimantan', 'Sulawesi', 'Papua', 'Bali', 'Nusa Tenggara', 'Miangas'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-24',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 5,
    gambar: 'gambar/piketkelas.jpg',
    instruksi: '"Sikap apa yang ditunjukkan para siswa saat bekerja bersama membersihkan kelas?"',
    correctOrder: ['gotong', 'royong', 'membuat', 'pekerjaan', 'berat', 'menjadi', 'lebih', 'ringan'],
    words: ['pekerjaan', 'lebih', 'ringan', 'gotong', 'royong', 'membuat', 'menjadi', 'berat'],
    errorPatterns: {
      'ringan_lebih_menjadi_berat_pekerjaan_membuat_royong_gotong': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-25',
    kompetensi: 'menyusun_kalimat',
    kompetensiDashboard: 'LT-KALIMAT',
    jenisKompetensi: 'susun_kalimat',
    level: 5,
    gambar: 'gambar/jatoh.jpg',
    instruksi: '"Sikap terpuji apa yang ditunjukkan anak berbaju biru saat temannya jatuh"',
    correctOrder: ['langsung', 'menolong', 'temannya', 'yang', 'sedang', 'jatuh'],
    words: ['yang', 'temannya', 'langsung', 'menolong', 'sedang', 'jatuh'],
    errorPatterns: {
      'jatuh_sedang_jatuh_yang_temannya_menolong_langsung': 'SPO_TERBALIK'
    }
  }
];
