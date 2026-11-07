@echo off
setlocal EnableExtensions
title LENTERA Game 1 - port 5000
cd /d "%~dp0"

rem --- cari Python (python, atau py bila python tidak ada di PATH) ---
set "PY=python"
%PY% --version >nul 2>nul
if errorlevel 1 set "PY=py"
%PY% --version >nul 2>nul
if errorlevel 1 (
  echo Python belum terpasang atau belum ada di PATH.
  echo Pasang dari https://www.python.org/downloads/ lalu centang "Add python.exe to PATH".
  pause
  exit /b 1
)

rem --- pasang Flask bila belum ada ---
%PY% -c "import flask" >nul 2>nul
if errorlevel 1 (
  echo Memasang Flask...
  %PY% -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Gagal memasang Flask. Periksa koneksi internet lalu coba lagi.
    pause
    exit /b 1
  )
)

echo.
echo Game 1 - Susun dan Baca Kalimat: http://127.0.0.1:5000/level.html
echo Dari Dashboard, murid cukup menekan Mulai misi.
echo Bagian mikrofon: pakai Google Chrome atau Microsoft Edge, buka lewat 127.0.0.1, dan izinkan mikrofon.
echo Tutup jendela ini untuk menghentikan server.
echo.

%PY% app.py
pause
