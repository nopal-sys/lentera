"""
LENTERA - Backend Flask
=======================
Jalankan:
    pip install flask
    python app.py
Lalu buka  http://localhost:5000/level.html   (kamera butuh localhost / https)

Struktur folder:
    app.py                  <- file ini
    lentera.db              <- dibuat otomatis (SQLite)
    misi1lentera/           <- semua file frontend (level.html, misi1.html, laporan.html, dst)

Endpoint:
    POST /api/misi1/soal        simpan hasil 1 soal   (dipanggil misi1.js saat soal dijawab benar)
    POST /api/misi1/level       simpan hasil 1 level  (dipanggil misi1.js saat popup hasil muncul)
    POST /api/pretest           simpan nilai pre-test anak (skala 0-100)
    GET  /api/laporan           ringkasan semua anak
    GET  /api/laporan/<anak_id> laporan 1 anak
    GET  /laporan               halaman laporan (laporan.html)
"""
import os
import sqlite3
from datetime import datetime, timedelta, timezone

from flask import Flask, g, jsonify, redirect, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, 'misi1lentera')
DB_PATH = os.path.join(BASE_DIR, 'lentera.db')
WIB = timezone(timedelta(hours=7))  # tanggal laporan pakai waktu Indonesia Barat

# Frontend disajikan dari root: /level.html, /misi1.html, /gambar/xxx.jpg, dst
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')


# =============================================================
#  ATURAN PENILAIAN (final)
#  Kalau diubah, ubah juga di misi1.js (hitungSkorSoal & tentukanPredikat)
# =============================================================
SKOR_PER_PERCOBAAN = [100, 75, 50]  # benar di percobaan ke-1, ke-2, ke-3
SKOR_MINIMUM = 25                   # percobaan ke-4 atau lebih


def hitung_skor_soal(jumlah_salah):
    """jumlah_salah 0 -> 100, 1 -> 75, 2 -> 50, >=3 -> 25."""
    if jumlah_salah < len(SKOR_PER_PERCOBAAN):
        return SKOR_PER_PERCOBAAN[jumlah_salah]
    return SKOR_MINIMUM


def tentukan_predikat(nilai):
    """Nilai 100 hanya mungkin kalau semua soal benar di percobaan 1 -> 'Sempurna'."""
    if nilai >= 100:
        return 'Sempurna'
    if nilai >= 90:
        return 'Sangat Baik'
    if nilai >= 75:
        return 'Baik'
    if nilai >= 60:
        return 'Cukup'
    return 'Perlu Pendampingan'


def rata_rata(daftar):
    return round(sum(daftar) / len(daftar), 1) if daftar else None


# =============================================================
#  IDENTITAS ANAK
#  Sekarang anak_id = ssoToken apa adanya. Kalau token berubah tiap login
#  atau punya mapping ke ID anak/nama, ubah di fungsi ini saja.
# =============================================================
def resolve_anak(sso_token):
    token = str(sso_token or '').strip()
    return token or None


# =============================================================
#  DATABASE (SQLite)
# =============================================================
SCHEMA = """
CREATE TABLE IF NOT EXISTS soal_hasil (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    anak_id      TEXT    NOT NULL,
    sesi_id      TEXT    NOT NULL,   -- 1 kali main 1 level = 1 sesi
    level        INTEGER NOT NULL,
    soal_id      TEXT    NOT NULL,
    jumlah_salah INTEGER NOT NULL,
    skor         INTEGER NOT NULL,
    waktu_detik  INTEGER NOT NULL,   -- data pendukung, TIDAK ikut nilai
    tanggal      TEXT    NOT NULL,
    UNIQUE (anak_id, sesi_id, soal_id)
);
CREATE TABLE IF NOT EXISTS level_hasil (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    anak_id        TEXT    NOT NULL,
    sesi_id        TEXT    NOT NULL,
    level          INTEGER NOT NULL,
    nilai          REAL    NOT NULL,
    predikat       TEXT    NOT NULL,
    langsung_benar INTEGER NOT NULL,
    total_soal     INTEGER NOT NULL,
    main_ke        INTEGER NOT NULL, -- 1 = pertama kali level ini diselesaikan
    tanggal        TEXT    NOT NULL,
    UNIQUE (anak_id, sesi_id)
);
CREATE TABLE IF NOT EXISTS pretest (
    anak_id TEXT PRIMARY KEY,
    nilai   REAL NOT NULL,           -- skala 0-100
    tanggal TEXT NOT NULL
);
"""


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH, timeout=10)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    with sqlite3.connect(DB_PATH) as db:
        db.executescript(SCHEMA)


def sekarang():
    return datetime.now(WIB).isoformat(timespec='seconds')


# =============================================================
#  HELPER VALIDASI
# =============================================================
class BadRequest(Exception):
    pass


@app.errorhandler(BadRequest)
def handle_bad_request(e):
    return jsonify(ok=False, error=str(e)), 400


def ambil_json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest('Body harus JSON object.')
    return data


def ambil_int(data, kunci, minimum=0):
    try:
        nilai = int(data.get(kunci))
    except (TypeError, ValueError):
        raise BadRequest(f'"{kunci}" harus angka bulat.')
    if nilai < minimum:
        raise BadRequest(f'"{kunci}" minimal {minimum}.')
    return nilai


def ambil_teks(data, kunci):
    nilai = str(data.get(kunci) or '').strip()
    if not nilai or len(nilai) > 200:
        raise BadRequest(f'"{kunci}" wajib diisi (maks 200 karakter).')
    return nilai


def ambil_anak(data):
    anak_id = resolve_anak(data.get('ssoToken'))
    if not anak_id:
        raise BadRequest('"ssoToken" wajib diisi.')
    return anak_id


def simpan_soal(db, anak_id, sesi_id, level, soal_id, jumlah_salah, waktu_detik):
    """Upsert: kirim ulang soal yang sama di sesi yang sama tidak bikin data dobel."""
    skor = hitung_skor_soal(jumlah_salah)
    db.execute(
        """
        INSERT INTO soal_hasil (anak_id, sesi_id, level, soal_id, jumlah_salah, skor, waktu_detik, tanggal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (anak_id, sesi_id, soal_id) DO UPDATE SET
            jumlah_salah = excluded.jumlah_salah,
            skor         = excluded.skor,
            waktu_detik  = excluded.waktu_detik
        """,
        (anak_id, sesi_id, level, soal_id, jumlah_salah, skor, waktu_detik, sekarang()),
    )
    return skor


# =============================================================
#  ENDPOINT: SIMPAN DATA
# =============================================================
@app.post('/api/misi1/soal')
def api_simpan_soal():
    """Body: {ssoToken, sesi_id, level, soal_id, jumlah_salah, waktu_detik}"""
    d = ambil_json()
    anak_id = ambil_anak(d)
    db = get_db()
    skor = simpan_soal(
        db, anak_id, ambil_teks(d, 'sesi_id'), ambil_int(d, 'level', 1),
        ambil_teks(d, 'soal_id'), ambil_int(d, 'jumlah_salah'), ambil_int(d, 'waktu_detik'),
    )
    db.commit()
    return jsonify(ok=True, skor=skor)


@app.post('/api/misi1/level')
def api_simpan_level():
    """
    Body: {ssoToken, sesi_id, level, total_soal,
           soal: [{soal_id, jumlah_salah, waktu_detik}, ...]}
    Nilai dihitung ulang di server dari jumlah_salah (angka dari browser tidak dipercaya).
    Aman dikirim ulang (idempotent per sesi_id).
    """
    d = ambil_json()
    anak_id = ambil_anak(d)
    sesi_id = ambil_teks(d, 'sesi_id')
    level = ambil_int(d, 'level', 1)
    total_soal = ambil_int(d, 'total_soal', 1)
    soal = d.get('soal')
    if not isinstance(soal, list) or len({str(s.get('soal_id')) for s in soal if isinstance(s, dict)}) != total_soal:
        raise BadRequest('Jumlah data "soal" harus sama dengan total_soal (dan soal_id tidak boleh dobel).')

    db = get_db()
    skor_list, langsung_benar = [], 0
    for s in soal:
        salah = ambil_int(s, 'jumlah_salah')
        skor_list.append(simpan_soal(db, anak_id, sesi_id, level, ambil_teks(s, 'soal_id'), salah, ambil_int(s, 'waktu_detik')))
        if salah == 0:
            langsung_benar += 1

    nilai = rata_rata(skor_list)
    predikat = tentukan_predikat(nilai)

    sudah = db.execute('SELECT main_ke FROM level_hasil WHERE anak_id = ? AND sesi_id = ?', (anak_id, sesi_id)).fetchone()
    if sudah:
        main_ke = sudah['main_ke']
        db.execute(
            'UPDATE level_hasil SET nilai=?, predikat=?, langsung_benar=?, total_soal=? WHERE anak_id=? AND sesi_id=?',
            (nilai, predikat, langsung_benar, total_soal, anak_id, sesi_id),
        )
    else:
        n = db.execute('SELECT COUNT(*) AS n FROM level_hasil WHERE anak_id = ? AND level = ?', (anak_id, level)).fetchone()['n']
        main_ke = n + 1
        db.execute(
            """INSERT INTO level_hasil (anak_id, sesi_id, level, nilai, predikat, langsung_benar, total_soal, main_ke, tanggal)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (anak_id, sesi_id, level, nilai, predikat, langsung_benar, total_soal, main_ke, sekarang()),
        )
    db.commit()
    return jsonify(ok=True, nilai=nilai, predikat=predikat, langsung_benar=langsung_benar,
                   total_soal=total_soal, main_ke=main_ke, dihitung_di_laporan=(main_ke == 1))


@app.post('/api/pretest')
def api_simpan_pretest():
    """
    Body: {ssoToken, nilai}            nilai sudah skala 0-100
      atau {ssoToken, benar, total}    otomatis diubah ke skala 0-100
    """
    d = ambil_json()
    anak_id = ambil_anak(d)
    if 'benar' in d and 'total' in d:
        total = ambil_int(d, 'total', 1)
        benar = ambil_int(d, 'benar')
        if benar > total:
            raise BadRequest('"benar" tidak boleh lebih besar dari "total".')
        nilai = round(benar / total * 100, 1)
    else:
        try:
            nilai = round(float(d.get('nilai')), 1)
        except (TypeError, ValueError):
            raise BadRequest('Isi "nilai" (0-100) atau "benar" + "total".')
        if not 0 <= nilai <= 100:
            raise BadRequest('"nilai" harus di antara 0 dan 100.')
    db = get_db()
    db.execute(
        'INSERT INTO pretest (anak_id, nilai, tanggal) VALUES (?, ?, ?) '
        'ON CONFLICT (anak_id) DO UPDATE SET nilai = excluded.nilai, tanggal = excluded.tanggal',
        (anak_id, nilai, sekarang()),
    )
    db.commit()
    return jsonify(ok=True, anak_id=anak_id, nilai=nilai)


# =============================================================
#  LAPORAN
#  Yang dihitung ke nilai = PENYELESAIAN PERTAMA tiap level (main_ke = 1).
#  "Main Lagi" tetap tersimpan, tapi tidak mengubah nilai laporan,
#  supaya anak tidak bisa mengulang sampai 100.
# =============================================================
def susun_laporan(db, anak_id):
    pre = db.execute('SELECT nilai FROM pretest WHERE anak_id = ?', (anak_id,)).fetchone()
    semua = db.execute('SELECT * FROM level_hasil WHERE anak_id = ? ORDER BY level, main_ke', (anak_id,)).fetchall()
    ada_soal = db.execute('SELECT 1 FROM soal_hasil WHERE anak_id = ? LIMIT 1', (anak_id,)).fetchone()
    if not pre and not semua and not ada_soal:
        return None

    pertama = [r for r in semua if r['main_ke'] == 1]
    ulang = {}
    for r in semua:
        if r['main_ke'] > 1:
            ulang[r['level']] = ulang.get(r['level'], 0) + 1

    nilai_literasi = rata_rata([r['nilai'] for r in pertama])
    pretest = pre['nilai'] if pre else None
    perkembangan = round(nilai_literasi - pretest, 1) if (nilai_literasi is not None and pretest is not None) else None

    total_soal = sum(r['total_soal'] for r in pertama)
    soal_langsung = sum(r['langsung_benar'] for r in pertama)

    per_tanggal = {}
    for r in sorted(pertama, key=lambda r: r['tanggal']):
        per_tanggal.setdefault(r['tanggal'][:10], []).append(r['nilai'])

    return {
        'anak_id': anak_id,
        'nilai_literasi': nilai_literasi,
        'predikat': tentukan_predikat(nilai_literasi) if nilai_literasi is not None else None,
        'pretest': pretest,
        'perkembangan': perkembangan,
        'soal_langsung_benar': soal_langsung,
        'total_soal': total_soal,
        'persen_langsung_benar': round(soal_langsung / total_soal * 100, 1) if total_soal else None,
        'level_selesai': [
            {
                'level': r['level'], 'nilai': r['nilai'], 'predikat': r['predikat'],
                'langsung_benar': r['langsung_benar'], 'total_soal': r['total_soal'],
                'tanggal': r['tanggal'][:10], 'main_ulang': ulang.get(r['level'], 0),
            }
            for r in pertama
        ],
        'tren': [{'tanggal': t, 'nilai': rata_rata(v)} for t, v in per_tanggal.items()],
    }


@app.get('/api/laporan/<path:anak_id>')
def api_laporan_anak(anak_id):
    hasil = susun_laporan(get_db(), anak_id)
    if hasil is None:
        return jsonify(ok=False, error='Data anak tidak ditemukan.'), 404
    return jsonify(ok=True, **hasil)


@app.get('/api/laporan')
def api_laporan_semua():
    db = get_db()
    ids = [r['anak_id'] for r in db.execute(
        'SELECT anak_id FROM level_hasil UNION SELECT anak_id FROM pretest UNION SELECT anak_id FROM soal_hasil ORDER BY anak_id'
    ).fetchall()]
    ringkas = []
    for anak_id in ids:
        l = susun_laporan(db, anak_id)
        ringkas.append({k: l[k] for k in ('anak_id', 'nilai_literasi', 'predikat', 'pretest', 'perkembangan')}
                       | {'jumlah_level': len(l['level_selesai'])})
    return jsonify(ok=True, anak=ringkas)


# =============================================================
#  HALAMAN
# =============================================================
@app.get('/laporan')
def halaman_laporan():
    return send_from_directory(FRONTEND_DIR, 'laporan.html')


@app.get('/')
def index():
    return redirect('/level.html')


init_db()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)