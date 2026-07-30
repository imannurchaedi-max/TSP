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
## Sheet: `BARCODE INCOMING WRM`
- **Jumlah Baris**: 2845
- **Jumlah Kolom**: 23

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `Tanggal Kirim` | `datetime64[us]` | 2026-03-11 00:00:00 |
| 2 | `No. SJ / No. Kontainer` | `object` | TLLU5298300 |
| 3 | `Nomor PO` | `object` | 6530000635 |
| 4 | `No SPB` | `object` | 1800110492 |
| 5 | `No Mobil` | `object` | B 9295 UWX |
| 6 | `Supplier` | `str` | DOMTAR |
| 7 | `Mid` | `int64` | 20000046 |
| 8 | `Description` | `str` | PULP LIGHTHOUSE X 48,2CMX120CM |
| 9 | `Qty Kirim` | `float64` | 19116.0 |
| 10 | `Qty /Palet` | `int64` | 995 |
| 11 | `Uom` | `str` | KG |
| 12 | `Palet` | `int64` | 1 |
| 13 | `Kode Unik` | `object` | DTA15M2708199 |
| 14 | `Line` | `str` | LINE C-10 |
| 15 | `Lot No` | `object` | - |
| 16 | `Keterangan` | `str` | PUTAWAY COMPLETED |
| 17 | `DOI` | `int64` | 141 |
| 18 | `ZONA` | `str` | ZRM |
| 19 | `AKSI` | `str` | VERIFIED |
| 20 | `PALLET` | `float64` | 4.0 |
| 21 | `Reason hold` | `str` | - |
| 22 | `Status Claim` | `str` | - |
| 23 | `tanggal` | `float64` | - |

---
## Sheet: `BARCODE MATERIAL PRODUKSI`
- **Jumlah Baris**: 0
- **Jumlah Kolom**: 13

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `TANGGAL` | `object` | - |
| 2 | `SHIFT` | `object` | - |
| 3 | `BARCODE` | `object` | - |
| 4 | `NO RESERVASI` | `object` | - |
| 5 | `MID` | `object` | - |
| 6 | `MATERIAL DESCRIPTION` | `object` | - |
| 7 | `JUMLAH` | `object` | - |
| 8 | `DITERIMA OLEH TSP DARI WRM` | `object` | - |
| 9 | `DIKIRIM OLEH TSP KE MESIN` | `object` | - |
| 10 | `RETUR DITARIK OLEH TSP DARI MESIN` | `object` | - |
| 11 | `DITERIMA OLEH OPERATOR DARI TSP` | `object` | - |
| 12 | `DICONSUME OLEH OPERATOR` | `object` | - |
| 13 | `RETUR DIKIRIM KEMBALI OLEH TSP KE WRM` | `object` | - |

---
## Sheet: `REPRINT BARCODE`
- **Jumlah Baris**: 0
- **Jumlah Kolom**: 7

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `TANGGAL` | `object` | - |
| 2 | `SHIFT` | `object` | - |
| 3 | `BARCODE` | `object` | - |
| 4 | `MID` | `object` | - |
| 5 | `MATERIAL DESCRIPTION` | `object` | - |
| 6 | `BARCODE REPRINT` | `object` | - |
| 7 | `JUMLAH` | `object` | - |

---
## Sheet: `STOCK TSP`
- **Jumlah Baris**: 139
- **Jumlah Kolom**: 30

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `No.` | `int64` | 1 |
| 2 | `Tanggal` | `float64` | - |
| 3 | `Shift` | `float64` | - |
| 4 | `NIK TSP` | `float64` | - |
| 5 | `Nama TSP` | `float64` | - |
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
| 19 | `Return BHP 3` | `str` | - |
| 20 | `Return AHP 1` | `float64` | - |
| 21 | `Return BHP 4` | `float64` | - |
| 22 | `Return BHP 5` | `float64` | - |
| 23 | `MATCLAIM WRM` | `float64` | - |
| 24 | `Stock Akhir (RUMUS)` | `object` | 0 |
| 25 | `Stock Akhir (HITUNG AKTUAL)` | `float64` | 0.0 |
| 26 | `Check` | `object` | True |
| 27 | `Unnamed: 26` | `float64` | - |
| 28 | `Unnamed: 27` | `float64` | - |
| 29 | `Unnamed: 28` | `float64` | - |
| 30 | `Unnamed: 29` | `float64` | - |

---
## Sheet: `STOCK MESIN`
- **Jumlah Baris**: 139
- **Jumlah Kolom**: 31

### Daftar Kolom & Data Type
| No | Nama Kolom | Type Data | Sample Nilai |
|---|---|---|---|
| 1 | `No.` | `int64` | 1 |
| 2 | `Tanggal` | `float64` | - |
| 3 | `Shift` | `float64` | - |
| 4 | `Mesin` | `float64` | - |
| 5 | `NIK TSP` | `float64` | - |
| 6 | `Nama TSP` | `float64` | - |
| 7 | `MID` | `int64` | 20000000 |
| 8 | `Deskripsi` | `str` | KRAFT BLEACHED WOODPULP FR 411-48X120 |
| 9 | `UOM` | `str` | KG |
| 10 | `Stok Awal` | `float64` | 0.0 |
| 11 | `Barang Masuk` | `int64` | 6479 |
| 12 | `Kirim BHP 1` | `float64` | - |
| 13 | `Kirim BHP 2` | `float64` | - |
| 14 | `Kirim BHP 3` | `float64` | 2788.0 |
| 15 | `Kirim AHP 1` | `float64` | - |
| 16 | `Kirim BHP 4` | `float64` | 3691.0 |
| 17 | `Kirim BHP 5` | `float64` | - |
| 18 | `Return BHP 1` | `float64` | - |
| 19 | `Return BHP 2` | `float64` | - |
| 20 | `Return BHP 3` | `str` | - |
| 21 | `Return AHP 1` | `float64` | - |
| 22 | `Return BHP 4` | `float64` | - |
| 23 | `Return BHP 5` | `float64` | - |
| 24 | `MATCLAIM WRM` | `float64` | - |
| 25 | `Stock Akhir (RUMUS)` | `object` | 0 |
| 26 | `Stock Akhir (HITUNG AKTUAL)` | `float64` | 0.0 |
| 27 | `Check` | `object` | True |
| 28 | `Unnamed: 27` | `float64` | - |
| 29 | `Unnamed: 28` | `float64` | - |
| 30 | `Unnamed: 29` | `float64` | - |
| 31 | `Unnamed: 30` | `float64` | - |

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