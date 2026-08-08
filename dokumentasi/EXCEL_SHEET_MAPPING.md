# Excel Column Mapping & Sheet Structure (`REF/TSP MODUL.xlsx`)

> Dokumentasi otomatis peta kolom dan struktur sheet kerja dalam file `REF/TSP MODUL.xlsx`.
> **Tab yang dikecualikan (non-kerja)**: `Workflow`, `Panduan MB51`.

## Sheet: `MASTER DDMMYY`
- **Jumlah Baris**: 84
- **Jumlah Kolom**: 28

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `STOCK KELUAR MASUK RM PM MESIN PANTS` | `object` | - |
| 2 | `Unnamed: 1` | `object` | - |
| 3 | `Unnamed: 2` | `str` | - |
| 4 | `Unnamed: 3` | `str` | - |
| 5 | `Unnamed: 4` | `str` | - |
| 6 | `Unnamed: 5` | `str` | - |
| 7 | `Unnamed: 6` | `str` | - |
| 8 | `Unnamed: 7` | `str` | - |
| 9 | `Unnamed: 8` | `str` | - |
| 10 | `Unnamed: 9` | `str` | - |
| 11 | `Unnamed: 10` | `str` | - |
| 12 | `Unnamed: 11` | `object` | - |
| 13 | `Unnamed: 12` | `str` | - |
| 14 | `Unnamed: 13` | `str` | - |
| 15 | `Unnamed: 14` | `str` | - |
| 16 | `Unnamed: 15` | `str` | - |
| 17 | `Unnamed: 16` | `str` | - |
| 18 | `Unnamed: 17` | `str` | - |
| 19 | `Unnamed: 18` | `str` | - |
| 20 | `Unnamed: 19` | `object` | - |
| 21 | `Unnamed: 20` | `str` | - |
| 22 | `Unnamed: 21` | `str` | - |
| 23 | `Unnamed: 22` | `str` | - |
| 24 | `Unnamed: 23` | `str` | - |
| 25 | `No.Dokumen` | `str` | Revisi |
| 26 | `Unnamed: 25` | `str` | - |
| 27 | `: DAM/FRM/PRD-09` | `str` | : 00 |
| 28 | `Unnamed: 27` | `object` | - |

---
## Sheet: `MIN MAX STOCK`
- **Jumlah Baris**: 9
- **Jumlah Kolom**: 7

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `MID` | `int64` | 20000046 |
| 2 | `MATERIAL DESCRIPTION` | `str` | PULP LIGHTHOUSE X 48,2CMX120CM |
| 3 | `LOKASI` | `str` | TSP |
| 4 | `MIN_STOCK` | `int64` | 800 |
| 5 | `MAX_STOCK` | `int64` | 1600 |
| 6 | `UPDATED_AT` | `datetime64[us]` | 2026-08-05 05:35:13 |
| 7 | `UPDATED_BY` | `int64` | 128000012 |

---
## Sheet: `Log Aktivitas Barcode`
- **Jumlah Baris**: 24
- **Jumlah Kolom**: 8

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `Timestamp` | `datetime64[us]` | 2026-08-03 21:18:55.935000 |
| 2 | `Barcode` | `str` | DUMMY-1 |
| 3 | `Event` | `str` | terima_wrm |
| 4 | `Actor` | `str` | 328000067 - Alip Rangga Alpajrin |
| 5 | `Role` | `str` | tsp |
| 6 | `Mesin` | `str` | - |
| 7 | `Hasil` | `str` | SUKSES |
| 8 | `Pesan` | `str` | Berhasil Menerima Material dari WRM: ... |

---
## Sheet: `MB51 `
- **Jumlah Baris**: 41
- **Jumlah Kolom**: 14

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `Material` | `int64` | 20000000 |
| 2 | `Qty in Un. of Entry` | `int64` | 6479 |
| 3 | `EUn (SATUAN)` | `str` | KG |
| 4 | `Quantity` | `int64` | 6479 |
| 5 | `Material Description` | `str` | KRAFT BLEACHED WOODPULP FR 411-48X120 |
| 6 | `Plant` | `int64` | 1004 |
| 7 | `SLoc` | `str` | E001 |
| 8 | `MvT` | `int64` | 915 |
| 9 | `Unnamed: 8` | `float64` | - |
| 10 | `Material Doc.` | `int64` | 4900640869 |
| 11 | `Item` | `int64` | 1 |
| 12 | `Posting Date` | `str` | 25.07.2026 |
| 13 | `Time` | `object` | 11:28:35 |
| 14 | `Kategori R1/R2` | `str` | R2 |

---
## Sheet: `BARCODE OUTBOUND WRM`
- **Jumlah Baris**: 3692
- **Jumlah Kolom**: 24

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `Tanggal Outbound` | `datetime64[us]` | 2026-03-25 00:00:00 |
| 2 | `Shift` | `str` | Shift 2 |
| 3 | `MID` | `int64` | 20000387 |
| 4 | `DESC` | `str` | ELASTIC WHITE 940DTEX  |
| 5 | `UOM` | `str` | ROL |
| 6 | `QTY` | `int64` | 128 |
| 7 | `TANGGAL DATANG` | `object` | 2026-03-01 00:00:00 |
| 8 | `Supplier` | `str` | HYOSUNG |
| 9 | `Nomor PO` | `object` | 6530000664 |
| 10 | `NO SPB` | `object` | 1800110872 |
| 11 | `Kode Unik` | `str` | 1800110872-20000387-P5 |
| 12 | `Lot No` | `object` | - |
| 13 | `TANGGAL AWAL DATANG DIKURANGI AWAL OUTBOUND` | `object` | 24 |
| 14 | `KONFIRMASI TSP` | `str` | - |
| 15 | `REQUEST` | `str` | PRODUKSI |
| 16 | `LINE` | `str` | ST-F7-6 |
| 17 | `Unnamed: 16` | `object` | - |
| 18 | `MATDOC RESERVASI` | `float64` | - |
| 19 | `KONFIRMASI WRM` | `str` | - |
| 20 | `KETERANGAN TIDAK SESUAI` | `float64` | - |
| 21 | `WAKTU KONFIRMASI` | `datetime64[us]` | - |
| 22 | `KONFIRMASI ADMIN TEAM SUPPLY` | `str` | - |
| 23 | `KETERANGAN TIDAK SESUAI.1` | `str` | - |
| 24 | `WAKTU KONFIRMASI.1` | `datetime64[us]` | - |

---
## Sheet: `BARCODE MATERIAL PRODUKSI`
- **Jumlah Baris**: 9
- **Jumlah Kolom**: 13

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `TANGGAL` | `datetime64[us]` | 2026-04-08 11:37:00 |
| 2 | `SHIFT` | `int64` | 1 |
| 3 | `BARCODE` | `str` | DUMMY-1 |
| 4 | `NO RESERVASI` | `object` | 4787879 |
| 5 | `MID` | `int64` | 20000387 |
| 6 | `MATERIAL DESCRIPTION` | `str` | ELASTIC WHITE 940 DTEX |
| 7 | `JUMLAH` | `int64` | 32 |
| 8 | `DITERIMA OLEH TSP DARI WRM` | `datetime64[us]` | 2026-04-08 11:37:00 |
| 9 | `DIKIRIM OLEH TSP KE MESIN` | `datetime64[us]` | - |
| 10 | `RETUR DITARIK OLEH TSP DARI MESIN` | `float64` | - |
| 11 | `DITERIMA OLEH OPERATOR DARI TSP` | `float64` | - |
| 12 | `DICONSUME OLEH OPERATOR` | `float64` | - |
| 13 | `RETUR DIKIRIM KEMBALI OLEH TSP KE WRM` | `float64` | - |

---
## Sheet: `REPRINT BARCODE`
- **Jumlah Baris**: 6
- **Jumlah Kolom**: 7

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `TANGGAL` | `datetime64[us]` | 2026-04-08 11:22:00 |
| 2 | `SHIFT` | `int64` | 1 |
| 3 | `BARCODE` | `str` | DUMMY-1 |
| 4 | `MID` | `int64` | 20000387 |
| 5 | `MATERIAL DESCRIPTION` | `str` | ELASTIC WHITE 940 DTEX |
| 6 | `BARCODE REPRINT` | `str` | DUMMY-1-01 |
| 7 | `JUMLAH` | `int64` | 16 |

---
## Sheet: `STOCK TSP`
- **Jumlah Baris**: 462
- **Jumlah Kolom**: 30

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `No.` | `int64` | 1 |
| 2 | `Tanggal` | `datetime64[us]` | 2026-08-03 00:00:00 |
| 3 | `Shift` | `int64` | 2 |
| 4 | `NIK TSP` | `int64` | 328000067 |
| 5 | `Nama TSP` | `str` | Alip Rangga Alpajrin |
| 6 | `MID` | `int64` | 20000000 |
| 7 | `Deskripsi` | `str` | KRAFT BLEACHED WOODPULP FR 411-48X120 |
| 8 | `UOM` | `str` | KG |
| 9 | `Stok Awal` | `float64` | 0.0 |
| 10 | `Barang Masuk` | `int64` | 6479 |
| 11 | `Kirim BHP 1` | `float64` | - |
| 12 | `Kirim BHP 2` | `float64` | - |
| 13 | `Kirim BHP 3` | `float64` | 2788.0 |
| 14 | `Kirim AHP 1` | `float64` | - |
| 15 | `Kirim BHP 4` | `float64` | 3691.0 |
| 16 | `Kirim BHP 5` | `float64` | - |
| 17 | `Return BHP 1` | `float64` | - |
| 18 | `Return BHP 2` | `float64` | - |
| 19 | `Return BHP 3` | `float64` | - |
| 20 | `Return AHP 1` | `float64` | - |
| 21 | `Return BHP 4` | `float64` | - |
| 22 | `Return BHP 5` | `float64` | - |
| 23 | `MATCLAIM WRM` | `float64` | - |
| 24 | `Stock Akhir (RUMUS)` | `float64` | 0.0 |
| 25 | `Stock Akhir (HITUNG AKTUAL)` | `float64` | 0.0 |
| 26 | `Check` | `object` | True |
| 27 | `Unnamed: 26` | `float64` | - |
| 28 | `Unnamed: 27` | `float64` | - |
| 29 | `Unnamed: 28` | `float64` | - |
| 30 | `Unnamed: 29` | `float64` | - |

---
## Sheet: `STOCK MESIN`
- **Jumlah Baris**: 277
- **Jumlah Kolom**: 39

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `No.` | `int64` | 1 |
| 2 | `Tanggal` | `datetime64[us]` | 2026-08-03 00:00:00 |
| 3 | `Shift` | `int64` | 2 |
| 4 | `Mesin` | `str` | BHP 1 |
| 5 | `NIK OP` | `float64` | 328000023.0 |
| 6 | `NAMA OP` | `str` | Kepin Nugraha |
| 7 | `MID` | `int64` | 20000000 |
| 8 | `Deskripsi` | `str` | KRAFT BLEACHED WOODPULP FR 411-48X120 |
| 9 | `UOM` | `str` | KG |
| 10 | `Stock Awal BHP 1` | `float64` | - |
| 11 | `Stock Awal BHP 2` | `float64` | - |
| 12 | `Stock Awal BHP 3` | `float64` | - |
| 13 | `Stock Awal AHP 1` | `float64` | - |
| 14 | `Stock Awal BHP 4` | `float64` | - |
| 15 | `Stock Awal BHP 5` | `float64` | - |
| 16 | `Terima BHP 1` | `float64` | - |
| 17 | `Terima BHP 2` | `float64` | - |
| 18 | `Terima BHP 3` | `float64` | 2788.0 |
| 19 | `Terima AHP 1` | `float64` | - |
| 20 | `Terima BHP 4` | `float64` | 3691.0 |
| 21 | `Terima BHP 5` | `float64` | - |
| 22 | `Consume BHP 1` | `float64` | - |
| 23 | `Consume BHP 2` | `float64` | - |
| 24 | `Consume BHP 3` | `float64` | - |
| 25 | `Consume AHP 1` | `float64` | - |
| 26 | `Consume BHP 4` | `float64` | - |
| 27 | `Consume BHP 5` | `float64` | - |
| 28 | `Return BHP 1` | `float64` | - |
| 29 | `Return BHP 2` | `float64` | - |
| 30 | `Return BHP 3` | `object` | - |
| 31 | `Return AHP 1` | `float64` | - |
| 32 | `Return BHP 4` | `float64` | - |
| 33 | `Return BHP 5` | `float64` | - |
| 34 | `Stock Akhir BHP 1` | `int64` | 0 |
| 35 | `Stock Akhir BHP 2` | `int64` | 0 |
| 36 | `Stock Akhir BHP 3` | `object` | 2788 |
| 37 | `Stock Akhir AHP 1` | `float64` | 0.0 |
| 38 | `Stock Akhir BHP 4` | `int64` | 3691 |
| 39 | `Stock Akhir BHP 5` | `int64` | 0 |

---
## Sheet: `Daily TSP`
- **Jumlah Baris**: 21
- **Jumlah Kolom**: 7

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `Unnamed: 0` | `float64` | - |
| 2 | `` | `object` | NO |
| 3 | `Unnamed: 2` | `str` | JOB DESK TSP (Team Supply Production) |
| 4 | `Unnamed: 3` | `object` | SHIFT 1 |
| 5 | `Unnamed: 4` | `object` | SHIFT 2 |
| 6 | `Unnamed: 5` | `object` | SHIFT 3 |
| 7 | `Unnamed: 6` | `float64` | - |

---
## Sheet: `Master`
- **Jumlah Baris**: 62
- **Jumlah Kolom**: 17

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `Unnamed: 0` | `object` | - |
| 2 | `Unnamed: 1` | `object` | - |
| 3 | `STOCK KELUAR MASUK RM PM MESIN PANTS` | `str` | - |
| 4 | `Unnamed: 3` | `str` | - |
| 5 | `Unnamed: 4` | `str` | - |
| 6 | `Unnamed: 5` | `str` | - |
| 7 | `Unnamed: 6` | `str` | - |
| 8 | `Unnamed: 7` | `str` | - |
| 9 | `Unnamed: 8` | `str` | - |
| 10 | `Unnamed: 9` | `str` | - |
| 11 | `Unnamed: 10` | `str` | - |
| 12 | `No.Dokumen` | `str` | Revisi |
| 13 | `Unnamed: 12` | `str` | - |
| 14 | `: DAM/FRM/PRD-07` | `str` | : 01 |
| 15 | `Unnamed: 14` | `object` | - |
| 16 | `Unnamed: 15` | `float64` | - |
| 17 | `Unnamed: 16` | `str` | - |

---
## Sheet: `MID EXISTING`
- **Jumlah Baris**: 48
- **Jumlah Kolom**: 3

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `MID` | `float64` | - |
| 2 | `Deskripsi` | `str` | - |
| 3 | `UOM` | `str` | - |

---