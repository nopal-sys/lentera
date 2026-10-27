// =============================================================
//  SOAL MISI 1 - MENYUSUN KALIMAT
//  Edit soal & gambar HANYA di file ini. misi1.js tidak perlu disentuh.
// =============================================================
//
//  CARA TAMBAH SOAL : copy satu blok { ... } di bawah, tempel setelah blok terakhir
//                     (jangan lupa koma di antara blok), lalu ganti isinya.
//  CARA HAPUS SOAL  : hapus satu blok { ... } utuh beserta komanya.
//  CARA GANTI URUTAN: pindahkan blok ke atas / ke bawah. Nomor soal & progress bar ikut otomatis.
//
//  ISI SETIAP SOAL
//  id            : kode unik, tidak boleh sama dengan soal lain (dikirim ke backend)
//  kompetensi    : biarkan 'menyusun_kalimat'
//  level         : angka 1-5 (soal masuk ke level ini di halaman level.html; tampil di pojok kanan atas, dikirim ke backend)
//  gambar        : GAMBAR SOAL. Boleh salah satu:
//                    - alamat file : 'gambar/misi1/ibu-belanja.png'  (png/jpg/jpeg/webp/gif/svg)
//                    - emoji       : '👩‍🍳🛒'
//                    - dikosongkan : '' (tampil ikon 🖼️)
//  instruksi     : pertanyaan yang tampil & dibacakan tombol "Dengarkan soal"
//  correctOrder  : urutan kata yang BENAR (jawaban utama)
//  jawabanLain   : (BOLEH DIHAPUS) susunan benar tambahan, kalau jawabannya boleh lebih dari satu.
//                  Isinya daftar susunan, contoh:  jawabanLain: [ ['pada', 'pukul', 'tujuh'] ]
//                  Semua kata di susunan ini juga harus ada di words.
//  words         : isi "Pilihan Kata" = semua kata di correctOrder (dan jawabanLain) + kata pengecoh.
//                  Ejaan & huruf besar-kecil harus SAMA PERSIS dengan correctOrder.
//                  Urutannya tampil persis seperti yang ditulis (tidak diacak otomatis),
//                  jadi acak sendiri supaya kata yang benar tidak sudah berurutan.
//  errorPatterns : (BOLEH DIHAPUS) label untuk susunan salah tertentu, buat laporan guru.
//                  Kunci = kata-kata susunan salah digabung pakai _ . Selain yang terdaftar
//                  otomatis dilabeli 'URUTAN_TIDAK_TETAP'.
//
//  FOLDER GAMBAR: taruh file gambar di folder  gambar/misi1/  (sejajar dengan misi1.html).
//  Kalau halaman dibuka lewat Flask dari folder static, tulis alamatnya lengkap, misalnya:
//      '/static/gambar/misi1/ibu-belanja.png'
//  Nama file: huruf kecil, tanpa spasi (pakai tanda -), contoh: ibu-belanja.png
//  Ukuran gambar disarankan persegi, sekitar 300x300 px, supaya tampil rapi di kotak gambar.
// =============================================================

const questions = [
  {
    id: 'LIT-SPO-01',
    kompetensi: 'menyusun_kalimat',
    level: 1,
    gambar: 'gambar/sayuribu.jpg',                    // contoh gambar file: 'gambar/misi1/ibu-belanja.png'
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
    level: 1,
    gambar: 'gambar/rakabaca.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 1,
    gambar: 'gambar/budibola.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 1,
    gambar: 'gambar/sitibunga.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Apa yang sedang dilakukan Siti?"',
    correctOrder: ['Siti', 'menyiram', 'bunga'],
    words: ['bunga', 'Siti', 'meletakkan', 'mangga', 'menanam', 'menyiram',],
    errorPatterns: {
      'bunga_menyiram_Siti': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-05',
    kompetensi: 'menyusun_kalimat',
    level: 1,
    gambar: 'gambar/pandabambu.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 2,
    gambar: 'gambar/bersepeda.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 2,
    gambar: 'gambar/musik.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Kegiatan apa yang sedang dilakukan Andi?"',
    correctOrder: ['Andi', 'sedang', 'mendengarkan', 'musik'],
    words: ['mendengarkan', 'menggambar', 'menyanyi', 'gitar', 'musik', 'Andi', 'sedang' ],
    errorPatterns: {
      'mendengarkan_musik_sedang_Andi': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-08',
    kompetensi: 'menyusun_kalimat',
    level: 2,
    gambar: 'gambar/mainanmerah.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Apa warna mobil mainan yang sedang dipegang Bima?"',
    correctOrder: ['berwarna', 'merah',],
    jawabanLain: [
      ['merah'],
      ['mobil', 'berwarna', 'merah']                           // jawaban benar ke-2
    ],
    words: ['cokelat', 'mobil', 'berwarna', 'Bima', 'sedang', 'mengendarai', 'merah', 'biru', 'hijau'],
    errorPatterns: {
      'merah_berwarna': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-09',
    kompetensi: 'menyusun_kalimat',
    level: 2,
    gambar: 'gambar/jamtujuh.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Pada pukul berapa Ahmad bangun tidur?"',
    correctOrder: ['pukul', 'tujuh'],
    jawabanLain: [
      ['pada', 'pukul', 'tujuh']                           // jawaban benar ke-2
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
    level: 2,
    gambar: 'gambar/jamduabelas.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Pada pukul berapa Rendi memakan MBG?"',
    correctOrder: ['pukul', 'dua belas'],
    jawabanLain: [
      ['pada', 'pukul', 'dua belas']                           // jawaban benar ke-2
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
    level: 3,
    gambar: 'gambar/otwsekolah.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Susun kalimat yang tepat sesuai dengan kondisi gambar disamping!"',
    correctOrder: ['Tomi', 'berangkat', 'ke', 'sekolah'],
    jawabanLain: [
      ['berangkat', 'ke', 'sekolah']                           // jawaban benar ke-2
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
    level: 3,
    gambar: 'gambar/sampah.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Kegiatan terpuji apa yang sedang dilakukan Doni?"',
    correctOrder: ['Doni', 'membuang', 'sampah', 'pada', 'tempatnya'],
    jawabanLain: [
      ['membuang', 'sampah', 'pada', 'tempatnya']                           // jawaban benar ke-2
    ],
    words: ['tempatnya', 'membuang','sembarangan', 'terserah', 'Doni', 'sampah', 'pada', 'sungai', 'jalan',],  
    errorPatterns: {
      'tempatnya_pada_sampah_membuang_Doni': 'SPO_TERBALIK',
      'tempatnya_pada_sampah_membuang': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-13',
    kompetensi: 'menyusun_kalimat',
    level: 3,
    gambar: 'gambar/belajarmalam.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Kegiatan terpuji apa yang sedang dilakukan Pandu?"',
    correctOrder: ['Pandu', 'sedang', 'belajar', 'untuk', 'ujian', 'besok'],
    jawabanLain: [
      ['sedang', 'belajar', 'untuk', 'ujian', 'besok'],
      ['belajar', 'untuk', 'ujian', 'besok']                          // jawaban benar ke-2
    ],
    words: ['Pandu', 'ujian','bermain', 'besok', 'memakan', 'untuk', 'belajar', 'sedang', 'malas'],  
    errorPatterns: {
      'besok_ujian_untuk_belajar_sedang_Pandu': 'SPO_TERBALIK',
      'besok_ujian_untuk_belajar_sedang': 'SPO_TERBALIK',
      'besok_ujian_untuk_belajar': 'SPO_TERBALIK'
    }
  },
  {
    id: 'LIT-SPO-14',
    kompetensi: 'menyusun_kalimat',
    level: 3,
    gambar: 'gambar/hewan1.jpg',
    instruksi: '"Ada hewan apa saja yang ada digambar samping?"',
    urutanBebas: true,   // urutan bebas, asal 6 hewannya benar & lengkap
    correctOrder: ['kucing', 'anjing', 'ikan', 'ular', 'burung', 'kelinci'],
    words: ['ular', 'gajah', 'kelinci', 'harimau', 'kucing', 'katak',
            'burung', 'sapi', 'ikan', 'anjing', 'kuda'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-15',
    kompetensi: 'menyusun_kalimat',
    level: 3,
    gambar: 'gambar/hewan2.jpg',
    instruksi: '"Ada hewan apa saja yang ada digambar samping?"',
    urutanBebas: true,   // urutan bebas, asal 6 hewannya benar & lengkap
    correctOrder: ['jerapah', 'kucing', 'gajah', 'burung', 'monyet', 'landak', 'beruang', 'kura-kura', 'rubah', 'kelinci'],
    words: ['ular', 'gajah', 'kelinci', 'harimau', 'kucing', 'katak',
            'burung', 'sapi', 'ikan', 'anjing', 'kuda', 'jerapah', 'monyet', 'landak', 'beruang', 'kura-kura', 'rubah'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-16',
    kompetensi: 'menyusun_kalimat',
    level: 4,
    gambar: 'gambar/melukis1.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Susun kata dibawah ini agar menjadi satu kalimat yang sesuai dengan gambar disamping!"',
    correctOrder: ['Aziz', 'sedang', 'melukis', 'pemandangan', 'gunung', 'di', 'siang', 'hari'],
    jawabanLain: [
      ['Aziz', 'sedang', 'melukis', 'pemandangan', 'gunung'],
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
    level: 4,
    gambar: 'gambar/mancing.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 4,
    gambar: 'gambar/memupuk.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Susun kata dibawah ini agar menjadi satu kalimat yang sesuai dengan gambar disamping!"',
    correctOrder: ['Anton', 'dan', 'Bela', 'sedang', 'menanam', 'tanaman'],
    jawabanLain: [
      ['Anton', 'dan', 'Bela', 'menanam', 'tanaman'],
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
    level: 4,
    gambar: 'gambar/buah.jpg',
    instruksi: '"Ada buah apa saja yang ada digambar samping?"',
    urutanBebas: true,   // urutan bebas, asal 6 buahnya benar & lengkap
    correctOrder: ['apel', 'pisang', 'jeruk', 'anggur', 'stroberi' ],
    words: ['apel', 'durian', 'jeruk', 'mangga', 'pisang', 'rambutan',
            'stroberi', 'nanas', 'anggur', 'semangka', 'jambu', 'bluberi'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-20',
    kompetensi: 'menyusun_kalimat',
    level: 4,
    gambar: 'gambar/sayurfix.jpg',
    instruksi: '"Ada sayur apa saja yang ada digambar samping?"',
    urutanBebas: true,   // urutan bebas, asal 6 sayurnya benar & lengkap
    correctOrder: ['wortel', 'brokoli', 'tomat', 'sawi', 'jagung',],
    words: ['wortel', 'cabai', 'bawang merah', 'alpukat', 'tomat', 'labu', 'jagung', 'singkong', 'sawi', 'bawang putih', 'timun', 'brokoli'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-21',
    kompetensi: 'menyusun_kalimat',
    level: 5,
    gambar: 'gambar/upacara.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 5,
    gambar: 'gambar/hutindo.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 5,
    gambar: 'gambar/petaindo.jpg',
    instruksi: '"Sebutkan nama pulau besar di Indonesia!"',
    urutanBebas: true,   // urutan bebas, asal 6 sayurnya benar & lengkap
    correctOrder: ['Jawa', 'Sumatra', 'Kalimantan', 'Sulawesi', 'Papua'],
    words: ['Jawa', 'Sumatra', 'Kalimantan', 'Sulawesi', 'Papua', 'Bali', 'Nusa Tenggara', 'Miangas'],
    errorPatterns: {}
  },
  {
    id: 'LIT-SPO-24',
    kompetensi: 'menyusun_kalimat',
    level: 5,
    gambar: 'gambar/piketkelas.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
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
    level: 5,
    gambar: 'gambar/jatoh.jpg',                        // contoh gambar file: 'gambar/misi1/raka-membaca.png'
    instruksi: '"Sikap terpuji apa yang ditunjukkan anak berbaju biru saat temannya jatuh"',
    correctOrder: ['langsung', 'menolong', 'temannya', 'yang', 'sedang', 'jatuh'],
    words: ['yang', 'temannya', 'langsung', 'menolong', 'sedang', 'jatuh'],
    errorPatterns: {
      'jatuh_sedang_jatuh_yang_temannya_menolong_langsung': 'SPO_TERBALIK'
    }
  },
];