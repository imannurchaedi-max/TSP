# CLASP Setup

Status terakhir diverifikasi: 9 September 2026 (clasp v3.3.0).

## Lokasi

Root project:

```text
C:\Users\imann\SYN DAM\SynologyDrive\0. TSP MODUL
```

Remote git: <https://github.com/imannurchaedi-max/TSP> (branch `master`).

Semua perintah `npm run ...` di dokumen ini dijalankan dari root project itu.

## Auth Account

Deploy production wajib memakai akun Google resmi:

```text
dayaanugrahmuly4@gmail.com
```

Akun ini harus punya akses ke Apps Script project dan spreadsheet runtime.
Kalau login memakai akun lain, production endpoint bisa gagal akses data
walaupun deploy terlihat sukses.

## Local Credential Policy

Jangan simpan credential/token clasp di Git atau dokumentasi.

Token clasp tersimpan lokal di `%USERPROFILE%\.clasprc.json`
(pada mesin ini: `C:\Users\imann\.clasprc.json`). Isinya rahasia:
refresh token, access token, dan client secret.

Cek status tanpa membocorkan token:

```powershell
npm run clasp:whoami
```

## Project Binding

`Active/.clasp.json` memakai `rootDir` relatif supaya portabel antar-mesin:

```json
{
  "scriptId": "1FwO2eOD9kCwYifAD0j8kuJ4hKBR5CAYcRia8yeV1MLgGEJJOGOfKh4QY",
  "rootDir": "."
}
```

`rootDir: "."` dibaca relatif terhadap lokasi `.clasp.json` itu sendiri,
yaitu folder `Active/`. Jangan tulis path absolut di sini — path absolut
membuat repo tidak bisa dipakai di mesin atau akun Windows lain.

Production deployment ID:

```text
AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ
```

## Perintah Harian

```powershell
npm run clasp:status        # daftar berkas yang akan dipush
npm run clasp:pull          # tarik dari remote (MENIMPA berkas lokal)
npm run clasp:push          # dorong ke @HEAD / URL /dev saja
npm run clasp:deployments   # daftar deployment
npm run clasp:open          # buka editor Apps Script
npm run clasp:web           # buka web app terdeploy
npm run deploy              # docs:build + push + prune + promote production
```

Hanya `npm run deploy` yang mengubah URL `/exec` (production).
`clasp push` sendirian hanya menyentuh `@HEAD` (`/dev`).

## PENTING: `clasp push` tidak menghapus berkas

Ini perilaku clasp v3 yang mudah menjebak. `push` hanya mengunggah berkas
yang **ada** di lokal. Berkas yang Anda hapus dari `Active/` akan **tetap
hidup di remote**, tetap dieksekusi runtime Apps Script, dan **tidak muncul**
di `clasp status`:

```text
# setelah menghapus sebuah berkas dari Active/
$ clasp push -f
Script is already up to date.     <-- padahal berkas masih ada di remote
```

Akibatnya berbahaya: berkas `.js` lama yang sudah Anda ganti tetap ikut
dimuat dan bisa menimpa fungsi baru dengan definisi lama.

Penawarnya `tools/clasp_prune.py`, yang menghapus berkas remote yang sudah
tidak ada di lokal lewat Apps Script API `projects.updateContent`:

```powershell
npm run clasp:prune         # dry-run, hanya melaporkan
npm run clasp:prune:apply   # benar-benar menghapus
```

`npm run deploy` sudah memanggil `clasp:prune:apply` otomatis setelah push,
jadi alur deploy normal aman. Pengaman script: menolak jalan kalau berkas
lokal kurang dari 5, dan butuh `--force` kalau penghapusan lebih dari 3 berkas.

## `.claspignore`

`Active/.claspignore` mencegah berkas non-sumber ikut terdorong. Tanpa itu,
berkas `.js` apa pun yang kebetulan tersimpan di `Active/` akan langsung
masuk ke Apps Script pada push berikutnya.

## Dependency

`@google/clasp` dan `@mermaid-js/mermaid-cli` terpasang lokal di
`node_modules/`. `npm run ...` otomatis memakai yang lokal, jadi versinya
terkunci per-project dan tidak bergantung instalasi global.

Setelah `git clone` di mesin baru:

```powershell
npm install
npx clasp login
```

## Yang Belum Aktif: `clasp logs`, `clasp run`, `clasp list-apis`

Ketiganya mengembalikan `GCP project ID is not set, unable to continue.`

Penyebabnya **bukan** kekurangan otorisasi — token sudah memegang 13 scope
lengkap termasuk `cloud-platform`, `logging.read`, `script.deployments`, dan
`script.webapp.deploy`. Penyebabnya: script ini masih memakai GCP project
bawaan yang tersembunyi, sementara ketiga perintah itu mensyaratkan GCP
project standar.

Ini tidak mempengaruhi push, pull, deploy, status, maupun deployments.

Kalau suatu saat dibutuhkan, langkahnya harus lewat browser (tidak ada
jalur API/CLI untuk penautan ini):

1. Buat project di <https://console.cloud.google.com/projectcreate>, catat
   **Project number**.
2. Buka editor Apps Script → ikon gerigi **Project Settings**.
3. Bagian **Google Cloud Platform (GCP) Project** → **Change project** →
   masukkan Project number → **Set project**.
4. Aktifkan Apps Script API di
   <https://script.google.com/home/usersettings> (untuk `clasp run`).
5. Tambahkan `"projectId": "<project-id>"` ke `Active/.clasp.json`.
