# LENTERA Game 1 (Flask): Susun & Baca Kalimat

Game Literasi untuk Dashboard LENTERA. **Susun kalimat dan baca kalimat (mikrofon) satu kesatuan** dalam satu halaman
(`misi1.html`): satu level = 5 soal = **3 soal susun kalimat lalu 2 soal baca kalimat**, dengan satu jam dan satu set lampu.
Tidak ada tombol ganti game. Basis kodenya versi Game 1 yang sudah tersambung ke Dashboard (`lentera-misi.js`);
game mikrofon dari repo `lentera-main` sudah digabung ke dalamnya.

## Menjalankan
**Cara cepat (Windows):** klik dua kali **`jalankan_game1.bat`** (memasang Flask bila belum ada, lalu menyalakan server di port 5000).

**Cara manual:**
```
pip install -r requirements.txt        # Flask
python app.py                          # -> http://127.0.0.1:5000/level.html
```
- **Mode mandiri** (tanpa Dashboard): buka `http://127.0.0.1:5000/level.html`, pilih level. Soal dari `soal-misi1.js` (susun) dan `soal-baca.js` (baca).
- **Dari Dashboard**: jalankan Dashboard (port 8000), murid menekan **Mulai misi**. Soal diambil dari Bank Soal guru lewat `ssoToken`.
- Pakai `127.0.0.1` (atau `localhost`) di semua tempat; kamera dan mikrofon butuh `localhost` atau https.
- `lentera.db` (laporan lokal) dibuat otomatis. Skemanya tidak berubah, jadi `lentera.db` lama tetap bisa dipakai.

## Cara kerja satu level
| Soal | Jenis | Cara menjawab | Poin |
|---|---|---|---|
| 1-3 | susun kalimat | klik / angkat kartu kata ke kotak, lalu Periksa | 100 / 75 / 50 / 25 menurut percobaan |
| 4-5 | baca kalimat | tekan mikrofon, baca kalimat dengan suara | 100 dikurangi 5 tiap bacaan salah |

- Mode Dashboard: komposisi 3 susun + 2 baca ditentukan server (Bank Soal). Mode mandiri: dibuat di `misi1.js` (`soalLevelMandiri`).
- Bacaan salah: kata yang belum tepat digarisbawahi merah, lalu mikrofon menyala lagi otomatis. Tidak ada suara / mikrofon bermasalah **tidak** mengurangi poin.
- **Dengarkan contoh** (suara contoh) dicatat ke Dashboard sebagai petunjuk.
- Bila mikrofon tidak bisa dipakai di perangkat itu (browser tanpa Web Speech API, izin ditolak), muncul tombol **Bantuan guru: tandai bacaan sudah benar**
  supaya level tidak macet. Dicatat sebagai petunjuk di Dashboard.
- Kompetensi: soal baca selalu `LT-KETEPATAN`. Server Dashboard yang menentukan kompetensi akhir jawaban, jadi soal susun tidak pernah masuk `LT-KETEPATAN`.

## Syarat browser untuk bagian mikrofon
Google Chrome atau Microsoft Edge terbaru (Web Speech API). Pengenalan suara memakai layanan online, jadi perlu internet. Firefox/Safari belum mendukung.

## Yang berubah dari versi sebelumnya
- **Baru:** `baca-panel.js` (panel mikrofon yang menyatu di `misi1.html`), `baca-logika.js` (pemeriksaan bacaan, tanpa DOM), `soal-baca.js` (25 kalimat baca untuk mode mandiri), `requirements.txt`.
- **Diubah:** `misi1.html` (panel baca + `panel-susun`), `misi1.js` (jenis soal `susun` / `baca`, komposisi level, skor, event ke Dashboard; animasi nilai tidak lagi bisa menampilkan angka negatif sesaat),
  `misi1.css` (gaya panel baca), `level.js` (nama kompetensi), `soal-misi1.js` (`LT-PAHAM` jadi `LT-KOSAKATA`), `app.py` (skor baca vs susun lewat field `tipe`).
- **Tidak berubah:** `lentera-misi.js`, `laporan.html`, `laporan.js`, folder `gambar/`.
- **Hapus bila masih ada di repo lama:** `baca.html`, `baca.css`, `baca.js` (game baca terpisah). Fungsinya sudah pindah ke `misi1.html` + `baca-panel.js`.
