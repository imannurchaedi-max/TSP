# Register Audit Integritas TSP Modul

Dokumen hidup. Tiap putaran audit ditambahkan sebagai bagian baru di bawah, **tidak menimpa
yang lama** — riwayat temuan yang sudah diperbaiki adalah bukti kenapa kode sekarang berbentuk
seperti sekarang, dan beberapa komentar di kode merujuk ke nomor temuannya.

Status temuan: `TERBUKA` · `DIPERBAIKI (<commit>)` · `DITOLAK (bukan cacat)`

---

## Putaran 2 — 10 September 2026 (commit `a6b7cf5`)

Cakupan: `Active/` (~10.000 baris), `android modif/TSPModul/lib` (~6.500 baris), `tools/`.
Metode: pembacaan kode statis. **Tidak ada pengujian terhadap deployment berjalan (`@130`).**

Header sheet diverifikasi terhadap `REF/TSP MODUL.xlsx` lewat `tools/parse_excel_ref.py`
(dijalankan 10 Sep 2026 19.48). Header di REF cocok persis dengan indeks fallback di kode untuk
STOCK TSP dan STOCK MESIN, jadi B-01 dan D-02 **tidak lagi bersandar pada tata letak yang
diasumsikan**. Yang masih belum diverifikasi adalah *isi* spreadsheet live — REF adalah salinan
struktur, bukan data berjalan.

Ringkasan: **3 kritis · 5 tinggi · 8 sedang · 9 rendah.**

Artifact versi terbaca: <https://claude.ai/code/artifact/6a80bdda-47e1-4d99-9893-f97ec5ad8729>

### §1 Akses dan otorisasi

Ketiganya berakar pada satu keputusan deployment: web app dipublikasikan sebagai
`ANYONE_ANONYMOUS`, sementara lapisan otorisasi di `ApiService.js` hanya menjaga jalur JSON API
(`doPost`) yang dipakai app Android. Jalur `google.script.run` yang dipakai web app tidak
melewati `dispatchApiAction_` sama sekali.

| ID | Sev | Temuan | Lokasi | Status |
| --- | --- | --- | --- | --- |
| A-01 | KRITIS | 17 endpoint baca tanpa kredensial apa pun | `Active/appsscript.json:8`, `Active/Code.js:102-241` | TERBUKA |
| A-02 | KRITIS | `saveMinMaxSetting` — endpoint tulis tanpa cek otorisasi | `Active/StockService.js:1791` | TERBUKA |
| A-03 | KRITIS | Identitas penulis web app cuma NIK kiriman client | `Active/Index.html:2595-2628`, `Active/AuthService.js:160` | TERBUKA |

**A-01.** Fungsi baca berikut tidak memanggil `requireRole_` maupun memeriksa token, sebagian
bahkan tidak menerima parameter `nik`:

```
getTspStock          getTspMesinMonitoring   getValidatorData
getShiftReceipts     getShiftDispatches      getMesinStock
getOperatorReceipts  getOperatorConsumption  getReprintData
getHistoricalTspStock                        getHistoricalMesinStock
getPortalHistory     getMaterialListApi      getMinMaxSettingsApi
getMinMaxSettings    getMesinList            getReservasiOptions
```

Gating `API_ACTION_ROLES_` benar dan lengkap, tetapi hanya dilewati `doPost`. Yang bocor:
seluruh neraca stok TSP, monitoring 6 mesin, data validator, master material, threshold
min/max, riwayat reprint.

*Arah perbaikan:* terapkan pola token `ApiService.js` ke jalur web — `doGet` menerbitkan token
sesi setelah login, tiap fungsi publik memvalidasinya lewat satu penjaga bersama.

**A-02.** Global tanpa akhiran garis bawah, jadi bisa dipanggil langsung lewat
`google.script.run` — melewati `saveMinMaxSettingApi` yang justru memegang
`requireRole_(nik, ['tsp','spv'])`. Di dalamnya `nik` cuma label audit
(`var updatedBy = String(nik || 'SPV').trim();`), tidak pernah diverifikasi. Digabung A-01, ini
satu-satunya endpoint **tulis** yang terbuka untuk anonim. Fungsi saudaranya
(`deleteMinMaxSetting_`, `saveMinMaxBatch_`, `saveMaterialMaster_`) aman **karena kebetulan**
berakhiran `_` sehingga Apps Script memblokirnya dari `google.script.run` — pemisahan yang
menyelamatkan di sini adalah konvensi penamaan, bukan desain keamanan.

*Arah perbaikan:* ganti nama jadi `saveMinMaxSetting_`. Audit sekalian tiap global tanpa
garis bawah — masing-masing adalah permukaan serang.

**A-03.** Sesi web app disimpan sebagai JSON polos di `localStorage`, atau diambil dari
parameter URL `?_u=` berisi base64 tanpa tanda tangan. Server tidak percaya `role` dari client
(`requireRole_` membaca ulang jabatan dari sheet KARYAWAN) tetapi **tidak pernah memverifikasi
bahwa pemanggilnya memang orang itu**. Cukup tahu satu NIK berjabatan TSP/SPV untuk membuka
`submitScan`, `tarikStokAwalShift`, `konfirmasiNeracaStokShift`, `saveMaterialApi`,
`deleteMaterialApi`, `deleteReprintBarcode`.

NIK bukan rahasia — tercetak di kartu identitas dan tersimpan di kolom `NIK TSP` sheet STOCK TSP
yang, lewat A-01, bisa dibaca anonim. A-01 memberi daftar NIK; A-03 mengubahnya jadi akses tulis.

Komentar di `ApiService.js` sudah menyadari ini ("lebih aman daripada jalur google.script.run
lama yang percaya nik dari client") — jalur lama itu masih hidup dan masih melayani semua
pengguna web.

### §2 Integritas angka stok

Kelompok paling merugikan secara operasional: tidak satu pun memunculkan pesan error.

| ID | Sev | Temuan | Lokasi | Status |
| --- | --- | --- | --- | --- |
| B-01 | TINGGI | `Stock Akhir (HITUNG AKTUAL)` selalu salah, dan jadi stok awal shift berikutnya | `Active/StockService.js:1152-1163`, `:945` | TERBUKA |
| B-02 | TINGGI | Semua mutasi stok tanpa lock — pembaruan bisa hilang | `Active/StockService.js:1098-1185` | TERBUKA |
| B-03 | TINGGI | Konfirmasi neraca menimpa 500 baris, menghapus scan bersamaan | `Active/StockService.js:1249-1325`, `:1331-1388` | TERBUKA |
| B-04 | TINGGI | Hapus barcode reprint tak membatalkan mutasi stok tapi mengembalikan kuota induk | `Active/BarcodeService.js:820-830`, `:855-960` | TERBUKA |
| B-05 | TINGGI | Gerbang anti-duplikasi cek-lalu-tulis tanpa lock | `Active/BarcodeService.js:360, 590, 640` | TERBUKA |

**B-01.** Penjaga di `incrementStockCell_`:

```js
if (cName === 'Stock Akhir (HITUNG AKTUAL)'
    && curStatic === 0 && currentVal === 0) continue;
```

`currentVal` adalah nilai kolom transaksi **sebelum** ditambah. `executeShiftRollover_`
menyeed kolom aktual kosong (`setColVal('stock akhir (hitung aktual)', '')`), jadi di awal tiap
shift `curStatic` nol dan tiap kolom transaksi nol. Akibatnya:

1. Transaksi pertama shift: keduanya nol → dilewati.
2. Transaksi kedua di kolom berbeda: keduanya masih nol → dilewati lagi.
3. Transaksi kedua di kolom yang **sama**: baru mulai menghitung — dari nol, tanpa stok awal dan
   tanpa transaksi sebelumnya.

`konfirmasiStokShift_` tidak mengoreksinya (hanya menimpa kalau selnya benar-benar kosong), jadi
angka parsial itu dianggap hitungan fisik sah dan barisnya ditandai `VALID (SELISIH)`. Rollover
berikutnya **mengutamakan kolom aktual di atas kolom rumus**:

```js
var val = (aktual !== '' && !isNaN(Number(aktual))) ? Number(aktual) : (Number(rumus) || 0);
```

`Stock Akhir (RUMUS)` sendiri benar — tidak punya penjaga itu, multiplier `KIRIM`/`MATCLAIM`-nya
tepat. **Selisih antara kedua kolom adalah ukuran langsung kerusakan ini** dan bisa dipakai
memperkirakan sudah berapa lama berjalan.

Tata letak terkonfirmasi dari REF: STOCK TSP kolom **24 = `Stock Akhir (RUMUS)`**, **25 =
`Stock Akhir (HITUNG AKTUAL)`**, **26 = `Check`** — persis indeks fallback di
`konfirmasiStokShift_` dan `executeShiftRollover_`. Jadi kedua kolom itu memang ada dan memang
yang dimaksud kode.

*Cara verifikasi tanpa alat:* buka STOCK TSP, bandingkan kolom 24 dengan kolom 25 pada shift yang
sudah dikonfirmasi. Kalau kolom aktual berisi angka jauh lebih kecil dan bukan hasil hitung
fisik, temuan terkonfirmasi.

*Arah perbaikan:* kolom aktual seharusnya hasil hitung fisik manusia, bukan akumulasi otomatis.
Hapus seluruh cabang `HITUNG AKTUAL` dari `incrementStockCell_`; biarkan hanya `konfirmasi*`
yang mengisinya. Sebelum itu, cek berapa shift ke belakang yang sudah terlanjur salah.

**B-02.** Di seluruh backend hanya ada **dua** pemakaian `LockService`, keduanya di
`BarcodeService.js` (`allocateChildBarcodes_`, `deleteReprintBarcode_`). Perhitungan stok tidak
termasuk. Inti `incrementStockCell_` adalah baca-ubah-tulis polos:

```js
var currentVal = Number(cell.getValue()) || 0;
cell.setValue(currentVal + amt);
```

Dua scan berbarengan pada MID sama membaca nilai lama; yang menulis belakangan menghapus
kontribusi yang pertama. Tanpa error. Diperbesar karena satu mutasi melakukan 3-4 operasi tulis
terpisah (kolom transaksi, RUMUS, aktual, stok akhir mesin) sehingga jendela bahayanya lebar.

*Arah perbaikan:* `LockService.getScriptLock()` + `waitLock(20000)` mengelilingi
`incrementStockCell_`. Pola dan durasinya sudah ada dan sudah dibenarkan di
`allocateChildBarcodes_` (harus di bawah `receiveTimeout` 30 detik client Android).

**B-03.** Kedua fungsi konfirmasi membaca satu blok besar, ubah di memori, tulis balik seluruhnya:

```js
var fullRange = tspSheet.getRange(startCheck, 1, checkRows, maxCol);
var vals = fullRange.getValues();
// ... ubah beberapa sel ...
fullRange.setValues(vals);
```

Setiap scan yang menaikkan sel mana pun di dalam 500 baris x seluruh kolom itu, di antara
`getValues()` dan `setValues()`, tertimpa balik. Blast radius jauh lebih luas dari B-02: bukan
satu sel meleset, melainkan seluruh mutasi shift aktif selama jendela itu.

`konfirmasiItemStokShift_` lebih parah rasionya — mengubah **satu baris** tapi menulis balik
seluruh 500 baris, dan dipakai persis saat Admin TSP keliling lapangan, yaitu ketika scan paling
ramai.

*Arah perbaikan:* untuk `konfirmasiItemStokShift_`, tulis hanya baris yang berubah. Untuk
konfirmasi massal, bungkus lock yang sama seperti B-02.

**B-04.** `REPRINT_DELETE_BLOCKING_COLUMNS_` sengaja tidak memuat `DIKIRIM OLEH TSP KE MESIN`,
dengan alasan kolom itu "sudah terisi sejak barcode anak diterbitkan". Benar untuk jalur scan —
tapi jalur itu juga sudah mencatat pengurangan stok. Alur yang bocor:

1. Scan Kirim ke Mesin pada induk → `handleKirimMesin_` menerbitkan anak, menstempel DIKIRIM,
   menaikkan `Kirim BHP 1` di STOCK TSP.
2. Hapus anak itu dari tab Reprint. Tidak diblokir — belum ada checkpoint operator.
3. Baris hilang dari kedua sheet. Mutasi `Kirim BHP 1` tetap tinggal, tanpa barcode yang mendasari.
4. Kuota induk dihitung ulang dari sheet REPRINT → kuantitas tadi tersedia lagi, bisa dikirim
   ulang, menaikkan `Kirim` untuk kedua kalinya.

Bisa diulang tanpa batas, tiap putaran menggelembungkan angka kirim tanpa jejak. Berlaku juga
untuk anak dari reprint batch yang dikirim lewat `sendExistingChildToMesin_`.

*Arah perbaikan:* kalau `DIKIRIM` terisi, penghapusan harus ikut menurunkan `Kirim <mesin>` pada
shift yang sesuai — atau blokir saja seperti checkpoint operator dan arahkan koreksi lewat retur.

**B-05.** Tiga handler memakai pola cek-lalu-tulis tanpa apa pun yang menyatukan keduanya:

| Handler | Pemeriksaan | Akibat kalau balapan |
| --- | --- | --- |
| `handleTerimaWrm_` | barcode belum terdaftar | dua baris induk, stok masuk dobel |
| `handleChildCheckpoint_` | kolom event masih kosong | checkpoint dobel, mutasi stok mesin dobel |
| `sendExistingChildToMesin_` | DIKIRIM masih kosong | `Kirim` terhitung dua kali |

Cache idempotency `apiSubmitScanIdempotent_` tidak menutup ini — ia hanya mengenali permintaan
yang sama persis lewat `clientRequestId`, bukan dua scan berbeda atas barcode yang sama. Lihat
juga D-04.

### §3 Alur kerja yang buntu

| ID | Sev | Temuan | Lokasi | Status |
| --- | --- | --- | --- | --- |
| C-01 | SEDANG | Label retur ikut memotong kuota induk → retur mustahil saat dibutuhkan | `Active/BarcodeService.js:127-137`, `Active/Index.html:2853-2858` | TERBUKA |
| C-02 | SEDANG | Hapus material tak pernah berhasil setelah rollover shift pertama | `Active/MaterialService.js:286, 317-336` | TERBUKA |
| C-03 | SEDANG | Tombol "Coba Lagi" antrian offline no-op selama 2 jam | `Active/ApiService.js:75-100`, `sync_service.dart:88` | TERBUKA |
| C-04 | SEDANG | Scan offline tercatat di shift saat sinkron, bukan shift saat scan | `scan_repository.dart:66`, `Active/BarcodeService.js:333` | TERBUKA |

**C-01.** Di `allocateChildBarcodes_`, `alreadyPrinted` menjumlahkan **semua** baris riwayat
kecuali pancingan `-00` — termasuk label retur `-R01`. Padahal retur adalah barang yang
*kembali*. Kondisi normal palet WRM adalah habis terpecah dan terkirim seluruhnya; di titik itu
`remainingQty` nol — dan retur baru diperlukan setelahnya. Server menolak ("Jumlah melebihi sisa
kuantitas induk"), client menolak lebih awal ("Stock barcode induk ini sudah 0") tanpa
membedakan mode retur. Akibatnya `retur_dari_mesin` dan `retur_ke_wrm` — dua dari enam event —
tak punya jalan masuk pada kasus paling umum.

*Arah perbaikan:* kecualikan sufiks `-R` dari `alreadyPrinted`; longgarkan penjaga
`remainingQty <= 0` di client khusus mode retur. Plafon retur seharusnya kuantitas yang **sudah
terkirim**, bukan sisa yang belum.

**C-02.** `deleteMaterial_` dijaga `isMidUsedAnywhere_` yang memindai STOCK TSP, STOCK MESIN,
BARCODE MATERIAL PRODUKSI, BARCODE OUTBOUND WRM. Tapi `executeShiftRollover_` menuliskan
**setiap material di Material Master** ke kedua sheet stok pada tiap "Tarik Stok Awal Shift".
Begitu satu shift ditarik, setiap MID otomatis "sudah pernah dipakai" — termasuk yang stoknya nol
dan tak pernah disentuh. Pesannya menyesatkan: yang ditemukan cuma baris kosong hasil generate
rutin.

*Arah perbaikan:* untuk kedua sheet stok, periksa apakah ada baris MID itu yang punya **mutasi
bukan nol**, bukan sekadar ada barisnya. Untuk sheet barcode, keberadaan baris sudah tepat.

**C-03.** `apiSubmitScanIdempotent_` menyimpan hasil ke cache **termasuk saat gagal** —
`submitScan()` tidak melempar untuk penolakan bisnis, ia mengembalikan
`{ success: false, message }`, dan objek itu ikut tersimpan 2 jam
(`API_IDEMPOTENCY_TTL_SECONDS`). `SyncService.retryFailed` mengirim ulang dengan
`clientRequestId` yang sama (disengaja, supaya urutan terjaga), jadi server menjawab dari cache
tanpa memproses ulang. Operator memperbaiki sebabnya, menekan Coba Lagi, dan mendapat pesan gagal
yang sama persis — selama 2 jam, tanpa penjelasan. Diperparah karena `syncPending` menghentikan
seluruh antrian (`break`) pada kegagalan bisnis.

*Arah perbaikan:* simpan ke cache hanya kalau `result.success === true`. Idempotency untuk
mencegah efek samping ganda; permintaan gagal tidak punya efek samping untuk dilindungi.

**C-04.** Antrian lokal menyimpan `createdAt: DateTime.now()` tapi tidak pernah mengirimnya.
Payload `submitScan` tanpa waktu; server memakai `var now = new Date();` di `processScan_`. Scan
21.55 (Shift 2) yang sinkron 22.10 tercatat Shift 3 — kolom TANGGAL/SHIFT salah, dan
`incrementStockCell_` mendarat di blok shift keliru atau gagal sama sekali kalau shift baru belum
ditarik. Sinkronisasi latar berjalan tiap 15 menit dan hanya saat ada koneksi, jadi pergeseran
lintas shift bukan kasus langka.

*Arah perbaikan:* kirim `createdAt` sebagai ISO-8601; jadikan parameter waktu opsional di
`processScan_`. Batasi ke rentang wajar (maks 24 jam ke belakang, tidak boleh ke depan).

### §4 Build, batas skala, dan dependensi

| ID | Sev | Temuan | Lokasi | Status |
| --- | --- | --- | --- | --- |
| D-01 | SEDANG | Build rilis diam-diam turun ke kunci debug kalau `key.properties` hilang | `android/app/build.gradle.kts:57-62` | TERBUKA |
| D-02 | SEDANG | Jendela 500 baris jadi plafon diam-diam jumlah material | `StockService.js:1122, 1261, 1343, 813, 857` | TERBUKA |
| D-03 | SEDANG | 3 skrip CDN pihak ketiga tanpa `integrity` | `Active/Index.html:3158-3166` | TERBUKA |
| D-04 | SEDANG | Sync latar & foreground bisa kirim antrian sama bersamaan | `background_sync.dart:16`, `sync_service.dart:24` | TERBUKA |

**D-01.** `signingConfig = if (hasReleaseSigning) ... else signingConfigs.getByName("debug")`.
Tidak ada peringatan, dan `build_release_local.ps1` tidak memeriksanya. APK hasilnya bernama sama,
ukurannya nyaris sama, jalan normal saat dipasang bersih. Kegagalannya baru muncul di lapangan:
Android menolak memasangnya sebagai pembaruan di atas APK bertanda tangan rilis — "App not
installed" tanpa petunjuk, setelah terlanjur diunggah ke GitHub Releases.

*Arah perbaikan:* hentikan build kalau `key.properties` tidak ada; verifikasi hasilnya dengan
`apksigner verify --print-certs` (harus `CN=TSP Modul`, bukan `CN=Android Debug`).

**D-02.** Lima tempat membatasi pembacaan ke `Math.min(lastRow - 1, 500)`. Rollover menulis satu
baris per material per shift, jadi tinggi blok shift aktif = jumlah material.

Angka sesungguhnya per 10 Sep 2026 (dari REF): **48 material** (`MID EXISTING`), STOCK TSP 462
baris, STOCK MESIN 277 baris. Artinya jendela 500 baris memuat sekitar **10 blok shift** —
plafonnya masih jauh, jadi ini **belum menggigit hari ini**. Yang perlu diingat: batasnya berlaku
pada *jumlah material*, bukan umur data, dan tidak ada yang memperingatkan saat terlampaui.
Di 500 material, satu blok shift saja sudah menghabiskan seluruh jendela.

Begitu material melewati 500, MID paling awal jatuh ke luar jendela — tanpa error apa pun:

- `incrementStockCell_` tidak menemukan barisnya → `false` → peringatan "belum tersinkron" yang
  menyesatkan.
- `konfirmasiStokShift_` tak pernah menyentuh baris itu → selamanya draft.
- `executeShiftRollover_` tak melihat stok akhirnya → shift berikutnya mulai dari nol.

Ada juga angka ajaib `i < vals.length - 150` di dua fungsi konfirmasi, yang mengasumsikan blok
shift tidak lebih tinggi dari 150 baris.

**D-03.** `html5-qrcode` (unpkg), `JsBarcode` dan `qrcode-generator` (jsDelivr) — tanpa atribut
`integrity`, di halaman yang menangani data produksi dan menyimpan sesi di `localStorage`. Dua
sisi risiko: ketersediaan (jaringan pabrik memblokir unpkg → scanner web dan pencetakan label
mati bersamaan) dan rantai pasok. `qrcode-generator` cuma ~8 KB — sebaiknya di-inline saja.

**D-04.** Penjaga `_isSyncing` adalah field instance; isolate WorkManager membuat `SyncService`,
`AppDatabase`, dan `ApiClient` sendiri, jadi tidak berlaku lintas isolate. Idempotency
menetralkan kebanyakan kasus, tapi hanya kalau permintaan pertama sempat selesai dan tersimpan ke
cache sebelum yang kedua tiba. Kalau benar-benar bersamaan, keduanya masuk `submitScan()` dan
gerbang cek-lalu-tulis B-05 tidak menahannya.

### §5 Kode mati dan sumber kebenaran usang

| ID | Sev | Temuan | Lokasi | Status |
| --- | --- | --- | --- | --- |
| E-01 | RENDAH | `submitReservasi_` menulis ke sheet yang tak pernah dibaca; kode mati | `Active/SheetService.js:518-557`, `Active/Code.js:379` | TERBUKA |
| E-02 | RENDAH | `queryReprintSheet_` mati; docstring `getReprintData` menjanjikan yang tak ada | `Active/SheetService.js:456-516`, `Active/Code.js:236-240` | TERBUKA |
| E-03 | RENDAH | 2 berkas `local.properties.bak` lolos `.gitignore`, berisi path lama | `.gitignore:38` | TERBUKA |
| E-04 | RENDAH | Penguncian login bisa dipakai mengunci karyawan mana pun | `Active/AuthService.js:88-97, 125` | TERBUKA |
| E-05 | RENDAH | Gangguan baca sheet WRM menyamar jadi kesalahan data | `Active/SheetService.js:319-322` | TERBUKA |
| E-06 | RENDAH | Pemindaian sheet penuh berulang di jalur scan | `Active/BarcodeService.js:479, 334` | TERBUKA |
| E-07 | RENDAH | Label tetap tersimpan meski dialog cetak dibatalkan | `Active/Index.html:3141-3145` | TERBUKA |
| E-08 | RENDAH | Kolom `Mesin` di STOCK MESIN tidak pernah diisi — vestigial | `Active/StockService.js:938-976` | TERBUKA (bukan cacat fungsional) |
| E-09 | RENDAH | `REF/TSP MODUL.xlsx` tertinggal dari `Config.js` (kolom `MESIN`) | `REF/TSP MODUL.xlsx`, `Active/Config.js:48` | TERBUKA |

**E-01.** Menulis ke `WRM_RESERVASI_SHEET_NAME` (`RESERVASI`) di spreadsheet WRM, sementara
seluruh pembacaan lewat `getReservasiList_` mengambil dari `SHEET_NAMES.WRM_INCOMING`
(`BARCODE OUTBOUND WRM`) di spreadsheet TSP. Jalur tulis dan baca menunjuk sheet berbeda.
Sekaligus kode mati: `submitReservasiApi` tidak dipanggil dari `Index.html`, tidak dari app
Android, tidak terdaftar di `API_ACTIONS_`. Tetap jadi endpoint global aktif yang bisa menulis ke
spreadsheet milik tim lain, tanpa UI dan tanpa pembaca.

**E-02.** 60 baris pencarian substring yang tak pernah dipanggil. Docstring `getReprintData`
masih menjanjikan perilakunya ("query: Kode Induk atau Kode Anak, substring, case-insensitive"),
padahal `getReprintData_` menuntut kode induk persis. UI-nya sendiri sudah benar ("Kode Induk
(Mother Barcode)") — yang salah cuma dokumentasinya.

**E-03.** `.gitignore` memuat `**/key.properties.bak` dan `**/local.properties`, tapi tidak
`**/local.properties.bak`. Isinya tidak mengandung rahasia, tapi menunjuk profil `sapuuser` yang
sudah tidak dipakai plus versi lama `1.0.4+5`. *Perbaikan:* `git rm --cached` keduanya, tambahkan
`**/*.properties.bak`.

**E-04.** Lima percobaan gagal mengunci sebuah NIK 15 menit, penghitungnya berbasis NIK bukan
asal permintaan. Karena login bisa dipanggil anonim (A-01), siapa pun yang tahu sebuah NIK bisa
mengunci pemiliknya selama satu shift, berulang. Untuk Admin TSP yang sedang menjalankan Tarik
Stok Awal, itu menghentikan seluruh pencatatan stok shift tersebut. Sisi baiknya sudah benar:
pesan gagal seragam untuk NIK tak dikenal maupun password salah — tidak ada kebocoran enumerasi.

**E-05.** `getReservasiList_` membungkus seluruh badannya dengan `catch (e) { return []; }`.
Kalau spreadsheet WRM tidak bisa diakses / di-rename / kena kuota, `validateMidInReservasi_`
menerima daftar kosong dan melempar "Nomor Reservasi tidak terdaftar". Gagalnya aman (scan
ditolak, bukan diloloskan) tapi Admin TSP akan mencari kesalahan pada nomor reservasinya, bukan
pada sambungan ke sheet WRM.

**E-06.** Tiap `classifyBarcode_` memanggil `findBarcodeRow_` (baca seluruh kolom BARCODE).
`handleKirimMesin_` memanggilnya untuk memutuskan cabang, lalu `sendExistingChildToMesin_`
memanggilnya **lagi** hanya untuk menyusun `parentBarcode` di objek balasan. Ditambah
`ensureSheetsReady_` tiap scan, satu scan Kirim ke Mesin melakukan 4-5 pemindaian penuh. Sheet
BARCODE tumbuh terus dan tak pernah dipangkas — ini melambat seiring waktu, dan waktu scan
panjang persis keluhan yang dilaporkan operator WRM. Panggilan kedua bisa langsung diganti hasil
klasifikasi yang sudah dihitung: satu baris.

**E-07.** Urutan simpan → render kode kanonik server → cetak sudah benar, sehingga label fisik
selalu memuat barcode yang sungguh ada di sistem. Yang tersisa: `window.print()` tidak memberi
tahu apakah user benar-benar mencetak. Kalau dibatalkan, barcode anak sudah terbit dan kuota
induk sudah terpotong tanpa label fisik. Bisa dipulihkan lewat hapus barcode reprint, tapi hanya
kalau operator sadar.

**E-08.** Pertanyaan yang menggantung sejak putaran 1 ("kenapa `setMVal` tidak pernah mengisi
kolom `Mesin`?") sekarang terjawab. Header STOCK MESIN yang sebenarnya:

```
1 No.  2 Tanggal  3 Shift  4 Mesin  5 NIK OP  6 NAMA OP  7 MID  8 Deskripsi  9 UOM
10-15 Stock Awal BHP1..BHP5   16-21 Terima ...   22-27 Consume ...
28-33 Return ...              34-39 Stock Akhir ...
```

Kolom `Mesin` memang ada di posisi 4, dan `executeShiftRollover_` memang tidak pernah mengisinya.
Tapi **itu bukan cacat**: tata letaknya per-kolom-mesin, satu baris mencakup keenam mesin
sekaligus (`Terima BHP 1`..`Terima BHP 5`). Kolom `Mesin` adalah sisa dari desain lama yang satu
baris per mesin. Mengisinya justru akan menyesatkan.

Dicatat supaya tidak ada yang bertanya ketiga kalinya. *Perbaikan opsional:* hapus kolomnya, atau
beri catatan di `EXCEL_SHEET_MAPPING.md` bahwa ia sengaja dikosongkan.

**E-09.** `BARCODE MATERIAL PRODUKSI` di REF punya **13 kolom** dan **tidak memuat `MESIN`**,
padahal `BARCODE_COLUMNS` di `Config.js` mendeklarasikannya di posisi 8. Secara runtime aman —
`ensureSheetsReady_` menambahkan kolom yang hilang di ujung kanan, dan semua pembacaan lewat
`getHeaderMap_` sehingga posisi tidak penting. Yang jadi masalah: REF adalah dokumen referensi
resmi, dan ia sekarang menggambarkan struktur yang sudah tidak berlaku sejak v114.

*Perbaikan:* segarkan REF, atau beri catatan di `EXCEL_SHEET_MAPPING.md` bahwa `MESIN` menyusul
lewat `ensureSheetsReady_` dan letaknya di ujung, bukan di posisi 8.

### Yang diperiksa dan DITOLAK sebagai cacat

- **Asimetri role di `API_ACTION_ROLES_`** — disengaja, terdokumentasi di
  `API_OPEN_READ_ACTIONS_`. Pemisahan riwayat TSP vs riwayat Mesin/Portal untuk operator benar.
- **Kredensial tersimpan di perangkat Android** — memakai `flutter_secure_storage`
  (Android Keystore), bukan SharedPreferences polos. Aman.
- **Kode anak yang dicetak client berbeda dari server** — bukan cacat: `printReprintLabel()`
  menyimpan dulu, mengganti `_reprintPendingLabels` dengan `savedLabels` dari server,
  me-render ulang, baru mencetak. Kode client cuma pratinjau.
- **`sync-graphify.ps1` melaporkan "Sync complete" padahal analyze sempat gagal** -- diperiksa,
  bukan cacat: skripnya `throw` kalau keempat percobaan gagal (baris 31), jadi pesan sukses hanya
  muncul kalau salah satu retry benar-benar berhasil. Kegagalan percobaan pertama adalah race
  identity-hash yang sudah terdokumentasi di `CLAUDE.md`.
- **`kMesinList` di `constants.dart`** — sejak F-02 hanya dipakai sebagai nilai awal sebelum
  `refreshMesinList()` mengambil dari server. Bukan lagi duplikasi sumber kebenaran.

### Urutan pengerjaan yang disarankan

1. **A-02** — ganti nama satu fungsi, menutup satu-satunya endpoint tulis terbuka.
2. **B-01** — kerusakannya menumpuk tiap shift; makin lama makin mahal dipulihkan.
3. **B-02 + B-05** — satu pola lock yang sama menutup keduanya.
4. **A-01 + A-03** — perubahan arsitektural, perlu perencanaan; keduanya sekaligus.
5. Sisanya menurut prioritas operasional.

---

## Putaran 1 — 9 September 2026

Ringkasan historis. Seluruh temuan sudah diperbaiki; dicatat di sini karena beberapa komentar di
kode merujuk nomornya.

| ID | Temuan | Status |
| --- | --- | --- |
| F-01 | Kolom sheet hilang gagal diam, bukan gagal keras | DIPERBAIKI (`d3798e0`) — `getRequiredCellValue_` |
| F-02 | Daftar mesin hardcode di app Android | DIPERBAIKI (`d249d59`) — `refreshMesinList()` |
| F-03 | Dugaan asimetri role pada action baca | DITOLAK — disengaja, didokumentasikan di `API_OPEN_READ_ACTIONS_` |
| F-04 | Alat verifikasi melaporkan hasil yang tidak jujur | DIPERBAIKI (`fb6f8b4`) |
| F-05 | Server MCP GitNexus memegang index lama | Operasional — restart server MCP |
| F-06 | Dua runner GitNexus tidak setara | DIPERBAIKI (`fb6f8b4`) — CLI kanonik |
| F-07 | `verify_column_mapping.py` memeriksa tab yang tidak ada | DIPERBAIKI (`fb6f8b4`) |

Perbaikan lanjutan pada putaran yang sama:

| Commit | Isi |
| --- | --- |
| `c11239d` | Resolusi kolom per-sheet di `getRealLastRowAndTrim_` (salah kolom berarti `deleteRows()` menghapus data asli) |
| `b1a8ce1` | `classifyBarcode_` mengenali anak bernomor >=100 (`\d{2}` → `\d{2,}`) |
| `28ba06d` | Cetak QR menggantikan Code128 di label reprint |
| `8ed338f` | Batasi area analisis kamera, `autoZoom`, resolusi lebih tinggi |
| `791d7c5` | Penanda terlihat saat cetak QR jatuh ke fallback Code128 |
| `3ee49eb` | Sembunyikan baris pancingan `-00`, urutkan numerik |
| `481d3b2` | Terima Kode Anak hasil pemecahan pada event Kirim ke Mesin |
| `a6b7cf5` | Kolom Jumlah boleh dikosongkan saat men-scan label pecahan |
