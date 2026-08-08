/**
 * Perhitungan stock real-time dari sheet "BARCODE MATERIAL PRODUKSI" (ledger on-the-fly)
 * + Validator vs MB51.
 *
 * Alur Perhitungan Dual Level:
 * 1. Stock TSP: Mutasi stok area TSP (Terima WRM, Kirim Mesin, Retur dari Mesin, Retur ke WRM).
 * 2. Stock Mesin: Mutasi stok 6 area Mesin (BHP 1..5, AHP 1) per Operator & Consume.
 */

function toDateOrNull_(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

/** Baca seluruh sheet BARCODE MATERIAL PRODUKSI. */
function readAllBarcodeRows_() {
  var sheet = getSheet_(SHEET_NAMES.BARCODE);
  var headerMap = getHeaderMap_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var col = headerMap;

  return data.map(function (row) {
    return {
      barcode: row[(col['BARCODE'] || col['Barcode']) - 1],
      parentBarcode: row[(col['NO RESERVASI'] || col['Parent Barcode']) - 1],
      mid: String(row[(col['MID'] || col['mid']) - 1] || '').trim(),
      deskripsi: row[(col['MATERIAL DESCRIPTION'] || col['Material Description']) - 1],
      jumlah: Number(row[(col['JUMLAH'] || col['Jumlah']) - 1]) || 0,
      mesin: row[(col['MESIN'] || col['Mesin']) - 1],
      tsTerimaWrm: toDateOrNull_(row[(col['DITERIMA OLEH TSP DARI WRM'] || col['Diterima Oleh TSP dari WRM']) - 1]),
      tsKirimMesin: toDateOrNull_(row[(col['DIKIRIM OLEH TSP KE MESIN'] || col['Dikirim Oleh TSP ke Mesin']) - 1]),
      tsRetDariMesin: toDateOrNull_(row[(col['RETUR DITARIK OLEH TSP DARI MESIN'] || col['Retur Ditarik Oleh TSP dari Mesin']) - 1]),
      tsTerimaOperator: toDateOrNull_(row[(col['DITERIMA OLEH OPERATOR DARI TSP'] || col['Diterima Oleh Operator dari TSP']) - 1]),
      tsConsume: toDateOrNull_(row[(col['DICONSUME OLEH OPERATOR'] || col['Diconsume Oleh Operator']) - 1]),
      tsRetKeWrm: toDateOrNull_(row[(col['RETUR DIKIRIM KEMBALI OLEH TSP KE WRM'] || col['Retur Dikirim Kembali Oleh TSP ke WRM']) - 1])
    };
  }).filter(function (r) { return r.mid; });
}

function getNormalizedDateStr_(dateCell) {
  if (!dateCell && dateCell !== 0) return '';
  if (dateCell instanceof Date && !isNaN(dateCell.getTime())) {
    var y = dateCell.getFullYear();
    var m = ('0' + (dateCell.getMonth() + 1)).slice(-2);
    var d = ('0' + dateCell.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  var str = String(dateCell).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  var dmMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmMatch) {
    var num1 = Number(dmMatch[1]);
    var num2 = Number(dmMatch[2]);
    var yr = dmMatch[3];
    var dVal = num1 > 12 ? num1 : (num2 > 12 ? num2 : num1);
    var mVal = num1 > 12 ? num2 : (num2 > 12 ? num1 : num2);
    return yr + '-' + ('0' + mVal).slice(-2) + '-' + ('0' + dVal).slice(-2);
  }
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    var y2 = parsed.getFullYear();
    var m2 = ('0' + (parsed.getMonth() + 1)).slice(-2);
    var d2 = ('0' + parsed.getDate()).slice(-2);
    return y2 + '-' + m2 + '-' + d2;
  }
  return str;
}

function getNormalizedShiftNum_(shiftCell) {
  var s = String(shiftCell || '').trim();
  var num = s.replace(/[^0-9]/g, '');
  return num || s;
}

function normalizeMid_(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number' && !isNaN(val)) {
    return String(Math.floor(val));
  }
  return String(val).trim();
}

/**
 * Mendapatkan baris terakhir yang benar-benar terisi data fisik dan memotong baris kosong/rumus hantu di bawahnya
 * agar blok shift baru selalu dicetak tepat di bawah baris terakhir yang terlihat di Google Sheets.
 */
function getRealLastRowAndTrim_(sheet) {
  if (!sheet) return 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return lastRow;
  var realLast = 1;
  try {
    var data = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 8)).getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      var dStr = String(data[i][1] || '').trim();
      var sStr = String(data[i][2] || '').trim();
      var mStr = String(data[i][5] || '').trim();
      
      var isMidValid = (mStr !== '' && mStr !== '0' && mStr.indexOf('#') === -1);
      var isDateValid = (dStr !== '' && dStr.indexOf('#') === -1);
      var isShiftValid = (sStr !== '' && sStr.indexOf('#') === -1);
      
      if (isMidValid && (isDateValid || isShiftValid)) {
        realLast = i + 2;
        break;
      }
    }
  } catch(e) {
    realLast = lastRow;
  }
  if (realLast < lastRow && (lastRow - realLast) > 0) {
    try {
      sheet.deleteRows(realLast + 1, lastRow - realLast);
    } catch(err) {
      // Abaikan jika proteksi/timeout
    }
  }
  return realLast;
}

/** Stock yang sedang dipegang TSP, dibayar langsung dari tabel STOCK TSP di Google Sheets agar 100% sinkron. */
function computeTspStock_(now) {
  var bounds = getShiftBounds_(now || new Date());
  var dateLabel = formatDateLabel_(bounds.start);
  var result = [];
  var supplierMap = getSupplierMap_();

  try {
    var sheet = getSheet_(SHEET_NAMES.STOCK_TSP);
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var headerMap = getHeaderMap_(sheet);
      var cNo = (headerMap['no.'] || headerMap['no'] || 1) - 1;
      var cDate = (headerMap['tanggal'] || 2) - 1;
      var cShift = (headerMap['shift'] || 3) - 1;
      var cActorNama = (headerMap['nama tsp'] || 5) - 1;
      var cMid = (headerMap['mid'] || 6) - 1;
      var cDesc = (headerMap['deskripsi'] || 7) - 1;
      var cUom = (headerMap['uom'] || 8) - 1;
      var cSA = (headerMap['stok awal'] || headerMap['stock awal'] || 9) - 1;
      var cMasuk = (headerMap['barang masuk'] || 10) - 1;
      var cKB1 = (headerMap['kirim bhp 1'] || 11) - 1;
      var cKB2 = (headerMap['kirim bhp 2'] || 12) - 1;
      var cKB3 = (headerMap['kirim bhp 3'] || 13) - 1;
      var cKA1 = (headerMap['kirim ahp 1'] || 14) - 1;
      var cKB4 = (headerMap['kirim bhp 4'] || 15) - 1;
      var cKB5 = (headerMap['kirim bhp 5'] || 16) - 1;
      var cRB1 = (headerMap['return bhp 1'] || 17) - 1;
      var cRB2 = (headerMap['return bhp 2'] || 18) - 1;
      var cRB3 = (headerMap['return bhp 3'] || 19) - 1;
      var cRA1 = (headerMap['return ahp 1'] || 20) - 1;
      var cRB4 = (headerMap['return bhp 4'] || 21) - 1;
      var cRB5 = (headerMap['return bhp 5'] || 22) - 1;
      var cMatclaim = (headerMap['matclaim wrm'] || 23) - 1;
      var cRumus = (headerMap['stock akhir (rumus)'] || 24) - 1;
      var cAktual = (headerMap['stock akhir (hitung aktual)'] || headerMap['stock akhir'] || 25) - 1;
      var cStatus = (headerMap['check'] || headerMap['status'] || 26) - 1;
      
      var maxCol = sheet.getLastColumn();
      var data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();
      if (data.length > 0) {
        var blocks = {};
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var mid = normalizeMid_(row[cMid]);
          var deskripsi = String(row[cDesc] || '').trim();
          if (!mid && !deskripsi) continue;
          var dateStr = getNormalizedDateStr_(row[cDate]);
          var shiftNum = getNormalizedShiftNum_(row[cShift]);
          if (!dateStr && !shiftNum) continue;
          var key = dateStr + '_Shift_' + shiftNum;
          if (!blocks[key]) {
            var label = (row[cDate] instanceof Date) ? formatDateLabel_(row[cDate]) : String(row[cDate] || dateStr);
            blocks[key] = { dateLabel: label, shiftLabel: "Shift " + shiftNum, actorNama: String(row[cActorNama] || '').trim(), statusCell: String(row[cStatus] || '').trim(), rows: [] };
          }
          blocks[key].rows.push(row);
        }

        var keys = Object.keys(blocks);
        var statusNeraca = 'BELUM_DITARIK';
        var validatorNama = '-';
        if (keys.length > 0) {
          var targetKey = getNormalizedDateStr_(bounds.start) + '_Shift_' + getNormalizedShiftNum_(bounds.shift);
          var selectedBlock = blocks[targetKey];
          if (!selectedBlock) {
            keys.sort(function(a, b) { return b.localeCompare(a); });
            selectedBlock = blocks[keys[0]];
            statusNeraca = 'BELUM_DITARIK';
          } else {
            validatorNama = selectedBlock.actorNama || '-';
            var stCell = String(selectedBlock.statusCell || '').trim().toUpperCase();
            if (stCell.indexOf('VALID') !== -1 || (stCell.indexOf('DIKONFIRMASI') !== -1 && stCell.indexOf('BELUM') === -1) || stCell.indexOf('OK - ') !== -1 || stCell.indexOf('SELISIH - ') !== -1) {
              statusNeraca = 'VALID';
              validatorNama = selectedBlock.statusCell || selectedBlock.actorNama || '-';
            } else {
              statusNeraca = 'BELUM_DIKONFIRMASI';
            }
          }

          if (selectedBlock && selectedBlock.rows.length > 0) {
            for (var j = 0; j < selectedBlock.rows.length; j++) {
              var r = selectedBlock.rows[j];
              var m = normalizeMid_(r[cMid]);
              var d = String(r[cDesc] || '').trim();
              if (!m && !d) continue;

              var stockAwal = Number(r[cSA]) || 0;
              var masuk = Number(r[cMasuk]) || 0;
              var keluar = (Number(r[cKB1])||0)+(Number(r[cKB2])||0)+(Number(r[cKB3])||0)+(Number(r[cKA1])||0)+(Number(r[cKB4])||0)+(Number(r[cKB5])||0);
              var returIn = (Number(r[cRB1])||0)+(Number(r[cRB2])||0)+(Number(r[cRB3])||0)+(Number(r[cRA1])||0)+(Number(r[cRB4])||0)+(Number(r[cRB5])||0);
              var returOut = Number(r[cMatclaim]) || 0;
              var rumus = Number(r[cRumus]) || 0;
              var aktual = r[cAktual];
              var stockAkhir = (aktual !== '' && aktual !== null && !isNaN(Number(aktual))) ? Number(aktual) : rumus;

              result.push({
                mid: m,
                deskripsi: d,
                supplier: supplierMap[m] || '-',
                uom: String(r[cUom] || 'KG').trim(),
                stockAwal: stockAwal,
                stokAwal: stockAwal,
                masuk: masuk,
                terimaWrm: masuk,
                keluar: keluar,
                kirimMesin: keluar,
                keluarBHP1: Number(r[cKB1]) || 0,
                keluarBHP2: Number(r[cKB2]) || 0,
                keluarBHP3: Number(r[cKB3]) || 0,
                keluarAHP1: Number(r[cKA1]) || 0,
                keluarBHP4: Number(r[cKB4]) || 0,
                keluarBHP5: Number(r[cKB5]) || 0,
                returIn: returIn,
                retDariMesin: returIn,
                returBHP1: Number(r[cRB1]) || 0,
                returBHP2: Number(r[cRB2]) || 0,
                returBHP3: Number(r[cRB3]) || 0,
                returAHP1: Number(r[cRA1]) || 0,
                returBHP4: Number(r[cRB4]) || 0,
                returBHP5: Number(r[cRB5]) || 0,
                returOut: returOut,
                retKeWrm: returOut,
                rumus: rumus,
                aktual: (aktual !== '' && aktual !== null) ? aktual : '',
                statusItem: String(r[cStatus] || '').trim(),
                stockAkhir: stockAkhir,
                stokAkhir: stockAkhir
              });
            }
          }
        }
      }
    }
  } catch (err) {
    Logger.log('Error reading STOCK TSP sheet: ' + err.message);
  }

  if (result.length === 0) {
    var materialMap = getMaterialMap_();
    Object.keys(materialMap).forEach(function (mid) {
      var e = materialMap[mid];
      result.push({
        mid: mid, deskripsi: e.deskripsi, supplier: supplierMap[mid] || '-', uom: e.uom || 'KG',
        stockAwal: 0, stokAwal: 0, masuk: 0, terimaWrm: 0, keluar: 0, kirimMesin: 0,
        keluarBHP1: 0, keluarBHP2: 0, keluarBHP3: 0, keluarAHP1: 0, keluarBHP4: 0, keluarBHP5: 0,
        returIn: 0, retDariMesin: 0,
        returBHP1: 0, returBHP2: 0, returBHP3: 0, returAHP1: 0, returBHP4: 0, returBHP5: 0,
        returOut: 0, retKeWrm: 0, rumus: 0, aktual: '', statusItem: '', stockAkhir: 0, stokAkhir: 0
      });
    });
  }

  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  return { shift: getNormalizedShiftNum_(bounds.shift), date: dateLabel, statusNeraca: typeof statusNeraca !== 'undefined' ? statusNeraca : 'BELUM_DITARIK', validatorNama: typeof validatorNama !== 'undefined' ? validatorNama : '-', rows: result };
}

/** Stock yang sedang ada di 1 mesin (dipilih Operator), dibayar langsung dari tabel STOCK MESIN di Google Sheets. */
function computeMesinStock_(mesinCode, now) {
  var bounds = getShiftBounds_(now || new Date());
  var dateLabel = formatDateLabel_(bounds.start);
  var result = [];
  var supplierMap = getSupplierMap_();
  var idx = MESIN_LIST.indexOf(mesinCode);
  if (idx === -1) idx = 0;

  try {
    var sheet = getSheet_(SHEET_NAMES.STOCK_MESIN);
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var mhm = getHeaderMap_(sheet);
      var cDate = (mhm['tanggal'] || 2) - 1;
      var cShift = (mhm['shift'] || 3) - 1;
      var cMid = (mhm['mid'] || 7) - 1;
      var cDesc = (mhm['deskripsi'] || 8) - 1;
      var cUom = (mhm['uom'] || 9) - 1;
      
      var mesinSuffix = MESIN_LIST[idx].toLowerCase();
      var cAwal = (mhm['stock awal ' + mesinSuffix] || (10 + idx)) - 1;
      var cMasuk = (mhm['terima ' + mesinSuffix] || (16 + idx)) - 1;
      var cConsume = (mhm['consume ' + mesinSuffix] || (22 + idx)) - 1;
      var cRetur = (mhm['return ' + mesinSuffix] || (28 + idx)) - 1;
      var cAkhir = (mhm['stock akhir ' + mesinSuffix] || (34 + idx)) - 1;

      var maxCol = sheet.getLastColumn();
      var data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();
      if (data.length > 0) {
        var blocks = {};
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var mid = normalizeMid_(row[cMid]);
          var deskripsi = String(row[cDesc] || '').trim();
          if (!mid && !deskripsi) continue;
          var dateStr = getNormalizedDateStr_(row[cDate]);
          var shiftNum = getNormalizedShiftNum_(row[cShift]);
          if (!dateStr && !shiftNum) continue;
          var key = dateStr + '_Shift_' + shiftNum;
          if (!blocks[key]) {
            var label = (row[cDate] instanceof Date) ? formatDateLabel_(row[cDate]) : String(row[cDate] || dateStr);
            blocks[key] = { dateLabel: label, shiftLabel: "Shift " + shiftNum, rows: [] };
          }
          blocks[key].rows.push(row);
        }

        var keys = Object.keys(blocks);
        if (keys.length > 0) {
          var targetKey = getNormalizedDateStr_(bounds.start) + '_Shift_' + getNormalizedShiftNum_(bounds.shift);
          var selectedBlock = blocks[targetKey];
          if (!selectedBlock) {
            keys.sort(function(a, b) { return b.localeCompare(a); });
            selectedBlock = blocks[keys[0]];
          }

          if (selectedBlock && selectedBlock.rows.length > 0) {
            for (var j = 0; j < selectedBlock.rows.length; j++) {
              var r = selectedBlock.rows[j];
              var m = normalizeMid_(r[cMid]);
              var d = String(r[cDesc] || '').trim();
              if (!m && !d) continue;

              var stockAwal = Number(r[cAwal]) || 0;
              var masuk = Number(r[cMasuk]) || 0;
              var consume = Number(r[cConsume]) || 0;
              var retur = Number(r[cRetur]) || 0;
              var keluar = consume + retur;
              var stockAkhir = Number(r[cAkhir]) || 0;

              result.push({
                mid: m,
                deskripsi: d,
                supplier: supplierMap[m] || '-',
                uom: String(r[cUom] || 'KG').trim(),
                stockAwal: stockAwal,
                stokAwal: stockAwal,
                masuk: masuk,
                keluar: keluar,
                stockAkhir: stockAkhir,
                stokAkhir: stockAkhir
              });
            }
          }
        }
      }
    }
  } catch (err) {
    Logger.log('Error reading STOCK MESIN sheet: ' + err.message);
  }

  if (result.length === 0) {
    var materialMap = getMaterialMap_();
    Object.keys(materialMap).forEach(function (mid) {
      var e = materialMap[mid];
      result.push({
        mid: mid, deskripsi: e.deskripsi, supplier: supplierMap[mid] || '-', uom: e.uom || 'KG',
        stockAwal: 0, stokAwal: 0, masuk: 0, keluar: 0, stockAkhir: 0, stokAkhir: 0
      });
    });
  }

  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  return { shift: bounds.shift, date: dateLabel, rows: result };
}

/**
 * Monitoring Stok Seluruh Mesin (6 Mesin) untuk Operator TSP.
 * Memberikan ringkasan saldo per mesin serta notifikasi otomatis (Low Stock Alert)
 * bila mesin membutuhkan suplai tambahan.
 */
function computeTspMesinMonitoring_(now) {
  var bounds = getShiftBounds_(now || new Date());
  var dateLabel = formatDateLabel_(now || new Date());
  var machines = [];
  var allAlerts = [];

  var machineDataMap = {};
  for (var m = 0; m < MESIN_LIST.length; m++) {
    machineDataMap[MESIN_LIST[m]] = {
      name: MESIN_LIST[m],
      totalActive: 0,
      lowCount: 0,
      criticalCount: 0,
      items: []
    };
  }

  try {
    var sheet = getSheet_(SHEET_NAMES.STOCK_MESIN);
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var mhm = getHeaderMap_(sheet);
      var cDate = (mhm['tanggal'] || 2) - 1;
      var cShift = (mhm['shift'] || 3) - 1;
      var cMid = (mhm['mid'] || 7) - 1;
      var cDesc = (mhm['deskripsi'] || 8) - 1;
      var cUom = (mhm['uom'] || 9) - 1;

      var maxCol = sheet.getLastColumn();
      var data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();
      if (data.length > 0) {
        var blocks = {};
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var mid = normalizeMid_(row[cMid]);
          var deskripsi = String(row[cDesc] || '').trim();
          if (!mid && !deskripsi) continue;
          var dateStr = getNormalizedDateStr_(row[cDate]);
          var shiftNum = getNormalizedShiftNum_(row[cShift]);
          if (!dateStr && !shiftNum) continue;
          var key = dateStr + '_Shift_' + shiftNum;
          if (!blocks[key]) {
            var label = (row[cDate] instanceof Date) ? formatDateLabel_(row[cDate]) : String(row[cDate] || dateStr);
            blocks[key] = { dateLabel: label, rows: [] };
          }
          blocks[key].rows.push(row);
        }

        var keys = Object.keys(blocks);
        if (keys.length > 0) {
          var targetKey = getNormalizedDateStr_(bounds.start) + '_Shift_' + getNormalizedShiftNum_(bounds.shift);
          var selectedBlock = blocks[targetKey];
          if (!selectedBlock) {
            keys.sort(function(a, b) { return b.localeCompare(a); });
            selectedBlock = blocks[keys[0]];
          }

          if (selectedBlock && selectedBlock.rows.length > 0) {
            dateLabel = selectedBlock.dateLabel;
            for (var j = 0; j < selectedBlock.rows.length; j++) {
              var r = selectedBlock.rows[j];
              var mId = normalizeMid_(r[cMid]);
              var dStr = String(r[cDesc] || '').trim();
              if (!mId && !dStr) continue;
              var uom = String(r[cUom] || 'KG').trim();

              for (var idx = 0; idx < MESIN_LIST.length; idx++) {
                var mesName = MESIN_LIST[idx];
                var mesinSuffix = mesName.toLowerCase();
                var cAwal = (mhm['stock awal ' + mesinSuffix] || (10 + idx)) - 1;
                var cMasuk = (mhm['terima ' + mesinSuffix] || (16 + idx)) - 1;
                var cConsume = (mhm['consume ' + mesinSuffix] || (22 + idx)) - 1;
                var cRetur = (mhm['return ' + mesinSuffix] || (28 + idx)) - 1;
                var cAkhir = (mhm['stock akhir ' + mesinSuffix] || (34 + idx)) - 1;

                var stockAwal = Number(r[cAwal]) || 0;
                var masuk = Number(r[cMasuk]) || 0;
                var consume = Number(r[cConsume]) || 0;
                var retur = Number(r[cRetur]) || 0;
                var stockAkhir = Number(r[cAkhir]) || 0;

                if (stockAwal > 0 || masuk > 0 || consume > 0 || stockAkhir > 0 || retur > 0) {
                  var status = 'NORMAL';
                  var statusText = 'Stok Aman';
                  var priority = 3;
                  var uomUpper = (uom || '').toUpperCase();

                  if (uomUpper.indexOf('ROLL') !== -1 || uomUpper.indexOf('ROL') !== -1 || uomUpper.indexOf('BAL') !== -1 || uomUpper.indexOf('PAL') !== -1) {
                    if (stockAkhir <= 0) {
                      status = 'CRITICAL';
                      statusText = 'Kritis (0 Roll)';
                      priority = 1;
                      machineDataMap[mesName].criticalCount++;
                    } else if (stockAkhir <= 1) {
                      status = 'LOW';
                      statusText = 'Butuh Suplai (≤ 1 Roll)';
                      priority = 2;
                      machineDataMap[mesName].lowCount++;
                    }
                  } else if (uomUpper.indexOf('KG') !== -1 || uomUpper.indexOf('GR') !== -1 || uomUpper.indexOf('LITER') !== -1) {
                    if (stockAkhir <= 0) {
                      status = 'CRITICAL';
                      statusText = 'Kritis (0 KG)';
                      priority = 1;
                      machineDataMap[mesName].criticalCount++;
                    } else if (stockAkhir <= 20) {
                      status = 'LOW';
                      statusText = 'Butuh Suplai (≤ 20 KG)';
                      priority = 2;
                      machineDataMap[mesName].lowCount++;
                    }
                  } else {
                    if (stockAkhir <= 0) {
                      status = 'CRITICAL';
                      statusText = 'Kritis (≤ 0)';
                      priority = 1;
                      machineDataMap[mesName].criticalCount++;
                    } else if (stockAkhir <= 50) {
                      status = 'LOW';
                      statusText = 'Butuh Suplai (≤ 50)';
                      priority = 2;
                      machineDataMap[mesName].lowCount++;
                    }
                  }

                  var itemObj = {
                    mid: mId,
                    deskripsi: dStr,
                    uom: uom,
                    stockAwal: stockAwal,
                    masuk: masuk,
                    consume: consume,
                    stockAkhir: stockAkhir,
                    status: status,
                    statusText: statusText,
                    priority: priority
                  };

                  machineDataMap[mesName].items.push(itemObj);
                  machineDataMap[mesName].totalActive++;

                  if (status === 'CRITICAL' || status === 'LOW') {
                    allAlerts.push({
                      mesin: mesName,
                      mid: mId,
                      deskripsi: dStr,
                      uom: uom,
                      stockAkhir: stockAkhir,
                      status: status,
                      statusText: statusText
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    Logger.log('Error reading STOCK MESIN for monitoring: ' + err.message);
  }

  // Urutkan item per mesin: dari kritis/rendah teratas, lalu nama
  for (var k = 0; k < MESIN_LIST.length; k++) {
    var mData = machineDataMap[MESIN_LIST[k]];
    mData.items.sort(function(a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.stockAkhir - b.stockAkhir;
    });
    machines.push(mData);
  }

  // Urutkan allAlerts dari yang terendah saldonya
  allAlerts.sort(function(a, b) { return a.stockAkhir - b.stockAkhir; });

  return {
    shift: bounds.shift,
    date: dateLabel,
    totalAlerts: allAlerts.length,
    alerts: allAlerts,
    machines: machines
  };
}

function formatDateLabel_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/**
 * Daftar transaksi Penerimaan dari WRM pada SHIFT AKTIF saat ini.
 */
function computeShiftReceipts_(now) {
  var bounds = getShiftBounds_(now);
  var tz = Session.getScriptTimeZone();
  var supplierMap = getSupplierMap_();
  var rows = readAllBarcodeRows_()
    .filter(function (r) {
      return r.tsTerimaWrm && r.tsTerimaWrm >= bounds.start && r.tsTerimaWrm < bounds.end;
    })
    .sort(function (a, b) { return b.tsTerimaWrm - a.tsTerimaWrm; })
    .map(function (r) {
      return {
        waktu: Utilities.formatDate(r.tsTerimaWrm, tz, 'HH:mm'),
        barcode: r.barcode,
        mid: r.mid,
        supplier: supplierMap[r.mid] || '-',
        deskripsi: r.deskripsi,
        jumlah: r.jumlah
      };
    });
  return rows;
}

/**
 * Daftar transaksi Pengiriman ke Mesin (Reprint) pada SHIFT AKTIF saat ini.
 */
function computeShiftDispatches_(now) {
  var bounds = getShiftBounds_(now);
  var tz = Session.getScriptTimeZone();
  var supplierMap = getSupplierMap_();
  var rows = readAllBarcodeRows_()
    .filter(function (r) {
      return r.tsKirimMesin && r.tsKirimMesin >= bounds.start && r.tsKirimMesin < bounds.end;
    })
    .sort(function (a, b) { return b.tsKirimMesin - a.tsKirimMesin; })
    .map(function (r) {
      return {
        waktu: Utilities.formatDate(r.tsKirimMesin, tz, 'HH:mm'),
        barcode: r.barcode,
        mesin: r.mesin || '-',
        mid: r.mid,
        supplier: supplierMap[r.mid] || '-',
        deskripsi: r.deskripsi,
        jumlah: r.jumlah
      };
    });
  return rows;
}

/**
 * Daftar transaksi Penerimaan oleh Operator dari TSP pada SHIFT AKTIF saat ini untuk mesin tertentu.
 */
function computeOperatorReceipts_(now, mesin) {
  var bounds = getShiftBounds_(now);
  var tz = Session.getScriptTimeZone();
  var supplierMap = getSupplierMap_();
  var rows = readAllBarcodeRows_()
    .filter(function (r) {
      return r.mesin === mesin && r.tsTerimaOperator && r.tsTerimaOperator >= bounds.start && r.tsTerimaOperator < bounds.end;
    })
    .sort(function (a, b) { return b.tsTerimaOperator - a.tsTerimaOperator; })
    .map(function (r) {
      return {
        waktu: Utilities.formatDate(r.tsTerimaOperator, tz, 'HH:mm'),
        barcode: r.barcode,
        mid: r.mid,
        supplier: supplierMap[r.mid] || '-',
        deskripsi: r.deskripsi,
        jumlah: r.jumlah
      };
    });
  return rows;
}

/**
 * Daftar transaksi Konsumsi oleh Operator pada SHIFT AKTIF saat ini untuk mesin tertentu.
 */
function computeOperatorConsumption_(now, mesin) {
  var bounds = getShiftBounds_(now);
  var tz = Session.getScriptTimeZone();
  var supplierMap = getSupplierMap_();
  var rows = readAllBarcodeRows_()
    .filter(function (r) {
      return r.mesin === mesin && r.tsConsume && r.tsConsume >= bounds.start && r.tsConsume < bounds.end;
    })
    .sort(function (a, b) { return b.tsConsume - a.tsConsume; })
    .map(function (r) {
      return {
        waktu: Utilities.formatDate(r.tsConsume, tz, 'HH:mm'),
        barcode: r.barcode,
        mid: r.mid,
        supplier: supplierMap[r.mid] || '-',
        deskripsi: r.deskripsi,
        jumlah: r.jumlah
      };
    });
  return rows;
}


/** Bandingkan Penerimaan TSP vs MB51 SAP. */
function computeValidator_(now) {
  var bounds = getShiftBounds_(now);
  var tz = Session.getScriptTimeZone();

  var stockRowByMid = {};
  computeTspStock_(now).rows.forEach(function (r) { stockRowByMid[r.mid] = r; });

  var mb51Sheet = getSheet_(SHEET_NAMES.MB51);
  var lastRow = mb51Sheet.getLastRow();
  var mb51ByMid = {};
  if (lastRow >= 3) {
    var data = mb51Sheet.getRange(3, 1, lastRow - 2, 13).getValues();
    data.forEach(function (row) {
      var mid = row[0];
      if (mid === '' || mid === null) return;
      var qty = Number(row[3]) || 0;
      var ts = parseMb51Timestamp_(row[11], row[12], tz);
      if (!ts || ts < bounds.start || ts >= bounds.end) return;
      var midKey = String(mid).trim();
      mb51ByMid[midKey] = (mb51ByMid[midKey] || 0) + qty;
    });
  }

  var allMids = {};
  Object.keys(stockRowByMid).forEach(function (m) { allMids[m] = true; });
  Object.keys(mb51ByMid).forEach(function (m) { allMids[m] = true; });

  var materialMap = getMaterialMap_();
  var supplierMap = getSupplierMap_();
  var result = [];
  Object.keys(allMids).forEach(function (mid) {
    var stockRow = stockRowByMid[mid] || {};
    var masukScan = stockRow.masuk || 0;
    var masukMb51 = mb51ByMid[mid] || 0;
    var selisih = masukScan - masukMb51;
    var material = materialMap[mid];
    result.push({
      mid: mid,
      supplier: supplierMap[mid] || '-',
      deskripsi: material ? material.deskripsi : '(MID tidak dikenal)',
      masukScan: masukScan,
      masukMb51: masukMb51,
      selisih: selisih,
      keluarBHP1: stockRow.keluarBHP1 || 0,
      keluarBHP2: stockRow.keluarBHP2 || 0,
      keluarBHP3: stockRow.keluarBHP3 || 0,
      keluarAHP1: stockRow.keluarAHP1 || 0,
      keluarBHP4: stockRow.keluarBHP4 || 0,
      keluarBHP5: stockRow.keluarBHP5 || 0,
      returBHP1: stockRow.returBHP1 || 0,
      returBHP2: stockRow.returBHP2 || 0,
      returBHP3: stockRow.returBHP3 || 0,
      returAHP1: stockRow.returAHP1 || 0,
      returBHP4: stockRow.returBHP4 || 0,
      returBHP5: stockRow.returBHP5 || 0,
      status: selisih === 0 ? 'OK' : 'SELISIH'
    });
  });
  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  return { shift: bounds.shift, rows: result };
}

function parseMb51Timestamp_(dateCell, timeCell, tz) {
  if (!dateCell || !timeCell) return null;
  var y, mo, d;
  if (dateCell instanceof Date) {
    y = parseInt(Utilities.formatDate(dateCell, tz, 'yyyy'), 10);
    mo = parseInt(Utilities.formatDate(dateCell, tz, 'M'), 10) - 1;
    d = parseInt(Utilities.formatDate(dateCell, tz, 'd'), 10);
  } else {
    var parts = String(dateCell).trim().split('.');
    if (parts.length !== 3) return null;
    d = parseInt(parts[0], 10);
    mo = parseInt(parts[1], 10) - 1;
    y = parseInt(parts[2], 10);
  }
  var timeStr = timeCell instanceof Date ? Utilities.formatDate(timeCell, tz, 'HH:mm:ss') : String(timeCell);
  var timeParts = timeStr.split(':');
  var h = parseInt(timeParts[0], 10) || 0;
  var mi = parseInt(timeParts[1], 10) || 0;
  var s = parseInt(timeParts[2], 10) || 0;
  return new Date(y, mo, d, h, mi, s);
}

/**
 * ============================================================================
 * MEKANISME AUTOMATIC ROLLING & REAL-TIME LEDGER SYNC (STOCK TSP & STOCK MESIN)
 * ============================================================================
 */

/**
 * Fungsi cleanupJunkStockRows_ telah dihapus secara permanen untuk mematuhi Aturan No. 1:
 * "Jangan Pernah menghapus data catatan yang telah ada"
 */

/**
 * Mengeksekusi penarikan Stock Akhir dari shift sebelumnya menjadi Stock Awal pada shift baru:
 * PERTAMA dari STOCK TSP (karena produksi dimulai dari TSP), KEMUDIAN dilanjutkan ke STOCK MESIN.
 * Dan mencetaknya secara bersih di STOCK TSP (30 Kolom) & STOCK MESIN (39 Kolom).
 */
function executeShiftRollover_(tspSheet, mesinSheet, activeDateStr, shiftName, actorNik, actorNama) {
  var materialList = getMaterialList_();
  var tspLastRow = getRealLastRowAndTrim_(tspSheet);
  var prevTspStock = {};

  // 1. LANGKAH PERTAMA: Ambil Stock Akhir Shift Sebelumnya dari STOCK TSP (karena aliran produksi bermula di TSP)
  var hmTsp = getHeaderMap_(tspSheet);
  var cTspDate = (hmTsp['tanggal'] || 2) - 1;
  var cTspShift = (hmTsp['shift'] || 3) - 1;
  var cTspMid = (hmTsp['mid'] || 6) - 1;
  var cTspAktual = (hmTsp['stock akhir (hitung aktual)'] || hmTsp['stock akhir'] || 25) - 1;
  var cTspRumus = (hmTsp['stock akhir (rumus)'] || 24) - 1;
  
  if (tspLastRow >= 2) {
    var maxColTspRead = tspSheet.getLastColumn();
    var numRowsToRead = Math.min(tspLastRow - 1, 500);
    var readStartRow = tspLastRow - numRowsToRead + 1;
    var dataTsp = tspSheet.getRange(readStartRow, 1, numRowsToRead, maxColTspRead).getValues();
    
    // Cari tanggal & shift dari baris terakhir yang terisi nyata (menghindari baris kosong/rumus)
    var refDate = '';
    var refShift = '';
    for (var idxT = dataTsp.length - 1; idxT >= 0; idxT--) {
      var cDate = getNormalizedDateStr_(dataTsp[idxT][cTspDate]);
      var cShift = getNormalizedShiftNum_(dataTsp[idxT][cTspShift]);
      var cMid = normalizeMid_(dataTsp[idxT][cTspMid]); 
      if (cDate !== '' && cShift !== '' && cMid !== '') {
        refDate = cDate;
        refShift = cShift;
        break;
      }
    }

    if (refDate && refShift) {
      for (var i = dataTsp.length - 1; i >= 0; i--) {
        var row = dataTsp[i];
        if (getNormalizedDateStr_(row[cTspDate]) === refDate && getNormalizedShiftNum_(row[cTspShift]) === refShift) {
          var mid = normalizeMid_(row[cTspMid]); 
          var aktual = row[cTspAktual]; 
          var rumus = row[cTspRumus];  
          var val = (aktual !== '' && aktual !== null && !isNaN(Number(aktual))) ? Number(aktual) : (Number(rumus) || 0);
          if (mid && !(mid in prevTspStock)) {
            prevTspStock[mid] = val;
          }
        }
      }
    }
  }

  // 2. LANGKAH KEDUA: Ambil Stock Akhir Shift Sebelumnya dari STOCK MESIN (Kolom 34-39: BHP 1..5, AHP 1)
  var mesinLastRow = getRealLastRowAndTrim_(mesinSheet);
  var prevMesinStock = {};
  var hmMesin = getHeaderMap_(mesinSheet);
  var cMesinDate = (hmMesin['tanggal'] || 2) - 1;
  var cMesinShift = (hmMesin['shift'] || 3) - 1;
  var cMesinMid = (hmMesin['mid'] || 7) - 1;
  
  if (mesinLastRow >= 2) {
    var maxColMesinRead = mesinSheet.getLastColumn();
    var numRowsMesin = Math.min(mesinLastRow - 1, 500);
    var readStartMesin = mesinLastRow - numRowsMesin + 1;
    var dataMesin = mesinSheet.getRange(readStartMesin, 1, numRowsMesin, maxColMesinRead).getValues();
    
    var refDateM = '';
    var refShiftM = '';
    for (var idxM = dataMesin.length - 1; idxM >= 0; idxM--) {
      var cDateM = getNormalizedDateStr_(dataMesin[idxM][cMesinDate]);
      var cShiftM = getNormalizedShiftNum_(dataMesin[idxM][cMesinShift]);
      var cMidM = normalizeMid_(dataMesin[idxM][cMesinMid]); 
      if (cDateM !== '' && cShiftM !== '' && cMidM !== '') {
        refDateM = cDateM;
        refShiftM = cShiftM;
        break;
      }
    }

    if (refDateM && refShiftM) {
      for (var j = dataMesin.length - 1; j >= 0; j--) {
        var r = dataMesin[j];
        if (getNormalizedDateStr_(r[cMesinDate]) === refDateM && getNormalizedShiftNum_(r[cMesinShift]) === refShiftM) {
          var midM = normalizeMid_(r[cMesinMid]); 
          if (midM && !(midM in prevMesinStock)) {
            var mStockArr = [];
            for (var mIdx = 0; mIdx < MESIN_LIST.length; mIdx++) {
              var colAkhir = (hmMesin['stock akhir ' + MESIN_LIST[mIdx].toLowerCase()] || (34 + mIdx)) - 1;
              mStockArr.push(Number(r[colAkhir]) || 0);
            }
            prevMesinStock[midM] = mStockArr;
          }
        }
      }
    }
  }

  // 3. Cetak Blok Baru untuk STOCK TSP
  var maxColTsp = Math.max(tspSheet.getLastColumn(), 30);
  var newStartTsp = tspLastRow < 2 ? 2 : tspLastRow + 1;
  var tspNewRows = materialList.map(function(item, index) {
    var mid = item.mid;
    var rowNum = newStartTsp + index;
    var stokAwal = prevTspStock[mid] !== undefined ? prevTspStock[mid] : 0;
    var statusAwal = 'BELUM DIKONFIRMASI (DRAFT)';

    var newRow = new Array(maxColTsp);
    for (var p = 0; p < maxColTsp; p++) newRow[p] = (p >= 9 && p <= 23) ? 0 : '';
    
    var setColVal = function(colName, val) {
      var cIdx = hmTsp[colName];
      if (cIdx !== undefined) newRow[cIdx - 1] = val;
    };
    
    setColVal('no.', index + 1);
    setColVal('no', index + 1);
    setColVal('tanggal', activeDateStr);
    setColVal('shift', Number(shiftName) || getNormalizedShiftNum_(shiftName));
    setColVal('nik tsp', actorNik || '-');
    setColVal('nama tsp', actorNama || 'Admin TSP');
    setColVal('mid', mid);
    setColVal('deskripsi', item.deskripsi);
    setColVal('uom', item.uom);
    setColVal('stock awal', stokAwal);
    setColVal('stok awal', stokAwal);
    
    // Barang Masuk & Kirim BHP 1..5, AHP 1 dll diset 0
    var zeroCols = ['barang masuk', 'kirim bhp 1', 'kirim bhp 2', 'kirim bhp 3', 'kirim ahp 1', 'kirim bhp 4', 'kirim bhp 5',
                    'return bhp 1', 'return bhp 2', 'return bhp 3', 'return ahp 1', 'return bhp 4', 'return bhp 5', 'matclaim wrm'];
    for (var z = 0; z < zeroCols.length; z++) {
      setColVal(zeroCols[z], 0);
    }
    
    setColVal('stock akhir (rumus)', stokAwal);
    setColVal('stock akhir (hitung aktual)', '');
    setColVal('stock akhir', '');
    setColVal('status', statusAwal);
    setColVal('check', statusAwal);
    
    return newRow;
  });
  tspSheet.getRange(newStartTsp, 1, tspNewRows.length, maxColTsp).setValues(tspNewRows);

  // 4. Cetak Blok Baru untuk STOCK MESIN
  var maxColMesin = Math.max(mesinSheet.getLastColumn(), 40);
  var newStartMesin = mesinLastRow < 2 ? 2 : mesinLastRow + 1;
  var mesinNewRows = materialList.map(function(item, idx) {
    var mid = item.mid;
    var rNum = newStartMesin + idx;
    var mStok = prevMesinStock[mid] || [0, 0, 0, 0, 0, 0];
    
    var newRow = new Array(maxColMesin);
    for (var p = 0; p < maxColMesin; p++) newRow[p] = '';
    
    var setMVal = function(colName, val) {
      var cIdx = hmMesin[colName];
      if (cIdx !== undefined) newRow[cIdx - 1] = val;
    };
    
    setMVal('no.', idx + 1);
    setMVal('no', idx + 1);
    setMVal('tanggal', activeDateStr);
    setMVal('shift', Number(shiftName) || getNormalizedShiftNum_(shiftName));
    setMVal('nik operator', actorNik || '-');
    setMVal('nama operator', actorNama || 'Admin TSP');
    setMVal('mid', mid);
    setMVal('deskripsi', item.deskripsi);
    setMVal('uom', item.uom);
    
    for (var m = 0; m < MESIN_LIST.length; m++) {
      var mesinName = MESIN_LIST[m].toLowerCase();
      var mSt = mStok[m] || 0;
      setMVal('stock awal ' + mesinName, mSt);
      setMVal('terima ' + mesinName, 0);
      setMVal('consume ' + mesinName, 0);
      setMVal('return ' + mesinName, 0);
      setMVal('stock akhir ' + mesinName, mSt);
    }
    
    return newRow;
  });
  mesinSheet.getRange(newStartMesin, 1, mesinNewRows.length, maxColMesin).setValues(mesinNewRows);
}

/**
 * Fungsi incrementStockCell_ untuk melakukan UPDATE in-place pada satu sel transaksi,
 * sesuai dengan Aturan No. 4 (menambahkan mutasi secara real-time ke sel terkait
 * tanpa melakukan kalkulasi ulang dari awal atau menghapus data).
 */
// Return value: true = sel berhasil di-update, false = gagal/tidak ada baris cocok
// (mis. "Tarik Stok Awal Shift" belum dilakukan untuk shift aktif) -> caller HARUS
// mengecek ini dan memberi tahu operator, karena kegagalan di sini tidak melempar error.
function incrementStockCell_(sheetName, mid, colName, amountToAdd, dateOverride) {
  if (!amountToAdd || isNaN(Number(amountToAdd))) return true;
  var amt = Number(amountToAdd);

  var now = dateOverride || new Date();
  var bounds = getShiftBounds_(now);
  var activeDateStr = getNormalizedDateStr_(bounds.start);
  var activeShiftNum = getNormalizedShiftNum_(bounds.shift);

  var sheet = getSheet_(sheetName);
  var lastRow = getRealLastRowAndTrim_(sheet);
  if (lastRow < 2) return false;

  var headerMap = getHeaderMap_(sheet);
  var colNum = headerMap[colName] || headerMap[String(colName).toLowerCase()];
  if (!colNum) return false;
  
  var colDate = (headerMap['tanggal'] || 2);
  var colShift = (headerMap['shift'] || 3);
  var colMid = (sheetName === SHEET_NAMES.STOCK_TSP)
    ? (headerMap['mid'] || 6)
    : (headerMap['mid'] || 7);
  
  var maxMetaCol = Math.max(colDate, colShift, colMid);
  var checkRows = Math.min(lastRow - 1, 500);
  var startCheck = lastRow - checkRows + 1;
  var meta = sheet.getRange(startCheck, 1, checkRows, maxMetaCol).getValues();
  
  var targetMid = normalizeMid_(mid);
  var targetRowIdx = -1;
  
  for (var k = meta.length - 1; k >= 0; k--) {
    var dStr = getNormalizedDateStr_(meta[k][colDate - 1]);
    var sNum = getNormalizedShiftNum_(meta[k][colShift - 1]);
    var rowMid = normalizeMid_(meta[k][colMid - 1]);
    
    if (dStr === activeDateStr && sNum === activeShiftNum && rowMid === targetMid) {
      targetRowIdx = startCheck + k;
      break;
    }
  }
  
  if (targetRowIdx !== -1) {
    var cell = sheet.getRange(targetRowIdx, colNum);
    var currentVal = Number(cell.getValue()) || 0;
    cell.setValue(currentVal + amt);
    
    // Update Stock Akhir (RUMUS) yang kini statis, dan Stock Akhir (HITUNG AKTUAL)
    if (sheetName === SHEET_NAMES.STOCK_TSP) {
      var colsToUpdate = ['Stock Akhir (RUMUS)', 'Stock Akhir (HITUNG AKTUAL)'];
      for (var p = 0; p < colsToUpdate.length; p++) {
        var cName = colsToUpdate[p];
        var colStatic = headerMap[cName] || headerMap[String(cName).toLowerCase()];
        if (colStatic) {
          var cellStatic = sheet.getRange(targetRowIdx, colStatic);
          var curStatic = Number(cellStatic.getValue()) || 0;
          // Untuk Hitung Aktual, kita hanya hitung jika sudah ada isinya atau jika mutasi terjadi
          if (cName === 'Stock Akhir (HITUNG AKTUAL)' && curStatic === 0 && currentVal === 0) continue; 
          
          var multiplier = 1;
          if (String(colName).toUpperCase().indexOf('KIRIM') !== -1 || String(colName).toUpperCase().indexOf('MATCLAIM') !== -1) {
            multiplier = -1;
          }
          cellStatic.setValue(curStatic + (amt * multiplier));
        }
      }
    }
    
    // Update Stock Akhir statis di STOCK MESIN
    if (sheetName === SHEET_NAMES.STOCK_MESIN) {
      // colName misalnya 'Terima BHP 1', 'Consume BHP 1', 'Return BHP 1'
      var parts = String(colName).split(' ');
      if (parts.length >= 3) {
         var machineName = parts[1] + ' ' + parts[2]; // ex: "BHP 1"
         var colAkhirMesin = headerMap['Stock Akhir ' + machineName] || headerMap['stock akhir ' + machineName.toLowerCase()];
         if (colAkhirMesin) {
            var cellAkhirMesin = sheet.getRange(targetRowIdx, colAkhirMesin);
            var curAkhirMesin = Number(cellAkhirMesin.getValue()) || 0;
            var multiplierM = 1;
            if (String(colName).toUpperCase().indexOf('CONSUME') !== -1 || String(colName).toUpperCase().indexOf('RETURN') !== -1) {
              multiplierM = -1;
            }
            cellAkhirMesin.setValue(curAkhirMesin + (amt * multiplierM));
         }
      }
    }
    return true;
  }
  return false;
}

/**
 * Fungsi baru untuk Aksi Tarik Stok Awal secara eksplisit oleh Admin TSP.
 * Mengecek apakah data shift saat ini sudah ada di STOCK TSP.
 * Jika ada, langsung di-load (direturn success).
 * Jika belum, ambil dari stok akhir shift sebelumnya dan cetak baris baru.
 */
function tarikStokAwalShift_(actorNik, actorNama) {
  var now = new Date();
  var bounds = getShiftBounds_(now);
  var activeDateStr = getNormalizedDateStr_(bounds.start);
  var activeShiftNum = getNormalizedShiftNum_(bounds.shift);

  var tspSheet = getSheet_(SHEET_NAMES.STOCK_TSP);
  var mesinSheet = getSheet_(SHEET_NAMES.STOCK_MESIN);

  // Cek apakah data untuk shift dan tanggal ini sudah ada di STOCK TSP
  var tspLastRow = getRealLastRowAndTrim_(tspSheet);
  var isDataExist = false;
  var foundRow = -1;
  
  if (tspLastRow >= 2) {
    var hm = getHeaderMap_(tspSheet);
    var colDate = hm['tanggal'] || 2;
    var colShift = hm['shift'] || 3;
    
    var maxColToRead = Math.max(colDate, colShift);
    var data = tspSheet.getRange(2, 1, tspLastRow - 1, maxColToRead).getValues();
    
    for (var i = data.length - 1; i >= 0; i--) {
      var dStr = getNormalizedDateStr_(data[i][colDate - 1]);
      var sNum = getNormalizedShiftNum_(data[i][colShift - 1]);
      if (dStr === activeDateStr && sNum === activeShiftNum) {
        isDataExist = true;
        foundRow = i + 2;
        break;
      }
    }
  }

  if (isDataExist) {
    return { 
      success: true, 
      message: 'Data stok untuk Shift ' + activeShiftNum + ' tanggal ' + activeDateStr + ' sudah tersedia di database (ditemukan pada baris ' + foundRow + ') dan berhasil dimuat.' 
    };
  }

  // Jika belum ada, eksekusi penarikan murni: dari STOCK TSP dahulu lalu ke STOCK MESIN
  executeShiftRollover_(tspSheet, mesinSheet, activeDateStr, bounds.shift, actorNik, actorNama);
  
  // Tidak lagi memanggil syncActiveShiftStockToSheets_()
  
  return { 
    success: true, 
    message: 'Stok awal untuk Shift ' + activeShiftNum + ' tanggal ' + activeDateStr + ' berhasil ditarik bersih murni dari neraca akhir shift sebelumnya dan siap untuk keliling verifikasi.' 
  };
}

/**
 * Fungsi baru untuk Aksi Konfirmasi Neraca Stok dan Validasi Pengecekan Fisik oleh Admin TSP.
 */
function konfirmasiStokShift_(actorNik, actorNama, aktualData) {
  var now = new Date();
  var bounds = getShiftBounds_(now);
  var activeDateStr = getNormalizedDateStr_(bounds.start);
  var activeShiftNum = getNormalizedShiftNum_(bounds.shift);

  var tspSheet = getSheet_(SHEET_NAMES.STOCK_TSP);
  var lastRow = getRealLastRowAndTrim_(tspSheet);
  if (lastRow < 2) {
    return { success: false, message: 'Belum ada data stok di tab STOCK TSP.' };
  }

  var checkRows = Math.min(lastRow - 1, 500);
  var startCheck = lastRow - checkRows + 1;
  var maxCol = tspSheet.getLastColumn();
  var fullRange = tspSheet.getRange(startCheck, 1, checkRows, maxCol);
  var vals = fullRange.getValues();
  var updated = false;

  var hmTsp = getHeaderMap_(tspSheet);
  var cDate = (hmTsp['tanggal'] || 2) - 1;
  var cShift = (hmTsp['shift'] || 3) - 1;
  var cNik = (hmTsp['nik tsp'] || 4) - 1;
  var cNama = (hmTsp['nama tsp'] || 5) - 1;
  var cMid = (hmTsp['mid'] || 6) - 1;
  var cRumus = (hmTsp['stock akhir (rumus)'] || 24) - 1;
  var cAktual = (hmTsp['stock akhir (hitung aktual)'] || hmTsp['stock akhir'] || 25) - 1;
  var cStatus = (hmTsp['check'] || hmTsp['status'] || 26) - 1;

  var mapAktual = {};
  if (aktualData && typeof aktualData === 'object') {
    if (Array.isArray(aktualData)) {
      aktualData.forEach(function(item) {
        if (item && item.mid !== undefined) mapAktual[normalizeMid_(item.mid)] = item.aktual;
      });
    } else {
      Object.keys(aktualData).forEach(function(k) {
        mapAktual[normalizeMid_(k)] = aktualData[k];
      });
    }
  }

  for (var i = vals.length - 1; i >= 0; i--) {
    var row = vals[i];
    var dStr = getNormalizedDateStr_(row[cDate]);
    var sNum = getNormalizedShiftNum_(row[cShift]);

    if (dStr === activeDateStr && sNum === activeShiftNum) {
      var mid = normalizeMid_(row[cMid]);
      vals[i][cNik] = actorNik || '-';
      vals[i][cNama] = actorNama || 'Admin TSP';

      var rumusVal = Number(row[cRumus]) || 0;
      if (mid in mapAktual && mapAktual[mid] !== '' && mapAktual[mid] !== null && !isNaN(Number(mapAktual[mid]))) {
        vals[i][cAktual] = Number(mapAktual[mid]);
      } else if (vals[i][cAktual] === '' || vals[i][cAktual] === null) {
        vals[i][cAktual] = rumusVal;
      }

      var aktualAkhir = Number(vals[i][cAktual]);
      if (aktualAkhir === rumusVal) {
        vals[i][cStatus] = 'VALID (OK - ' + (actorNama || 'TSP') + ')';
      } else {
        vals[i][cStatus] = 'VALID (SELISIH - ' + (actorNama || 'TSP') + ')';
      }
      updated = true;
    } else if (i < vals.length - 150) {
      break;
    }
  }

  if (!updated) {
    return { success: false, message: 'Data stok awal untuk shift ini belum ditarik. Silakan Tarik Stok terlebih dahulu.' };
  }

  fullRange.setValues(vals);
  return { success: true, message: 'Neraca stok untuk shift aktif telah resmi dikonfirmasi dan divalidasi oleh ' + (actorNama || 'Admin TSP') + '.' };
}

/**
 * Fungsi baru untuk Aksi Konfirmasi atau Revisi Aktual per Item Material saat keliling pengecekan lapangan.
 */
function konfirmasiItemStokShift_(actorNik, actorNama, targetMid, aktualValue, statusType) {
  var now = new Date();
  var bounds = getShiftBounds_(now);
  var activeDateStr = getNormalizedDateStr_(bounds.start);
  var activeShiftNum = getNormalizedShiftNum_(bounds.shift);

  var tspSheet = getSheet_(SHEET_NAMES.STOCK_TSP);
  var lastRow = getRealLastRowAndTrim_(tspSheet);
  if (lastRow < 2) {
    return { success: false, message: 'Belum ada data stok di tab STOCK TSP.' };
  }

  var checkRows = Math.min(lastRow - 1, 500);
  var startCheck = lastRow - checkRows + 1;
  var maxCol = tspSheet.getLastColumn();
  var fullRange = tspSheet.getRange(startCheck, 1, checkRows, maxCol);
  var vals = fullRange.getValues();
  var updated = false;
  var normTargetMid = normalizeMid_(targetMid);

  var hmTsp = getHeaderMap_(tspSheet);
  var cDate = (hmTsp['tanggal'] || 2) - 1;
  var cShift = (hmTsp['shift'] || 3) - 1;
  var cNik = (hmTsp['nik tsp'] || 4) - 1;
  var cNama = (hmTsp['nama tsp'] || 5) - 1;
  var cMid = (hmTsp['mid'] || 6) - 1;
  var cAktual = (hmTsp['stock akhir (hitung aktual)'] || hmTsp['stock akhir'] || 25) - 1;
  var cStatus = (hmTsp['check'] || hmTsp['status'] || 26) - 1;

  for (var i = vals.length - 1; i >= 0; i--) {
    var row = vals[i];
    var dStr = getNormalizedDateStr_(row[cDate]);
    var sNum = getNormalizedShiftNum_(row[cShift]);
    if (dStr === activeDateStr && sNum === activeShiftNum) {
      var mid = normalizeMid_(row[cMid]);
      if (mid === normTargetMid) {
        vals[i][cNik] = actorNik || '-';
        vals[i][cNama] = actorNama || 'Admin TSP';
        vals[i][cAktual] = Number(aktualValue) || 0; 
        if (statusType === 'BENAR') {
          vals[i][cStatus] = 'ITEM OK (' + (actorNama || 'TSP') + ')';
        } else {
          vals[i][cStatus] = 'ITEM REVISI (' + (actorNama || 'TSP') + ')';
        }
        updated = true;
        break;
      }
    } else if (i < vals.length - 150) {
      break;
    }
  }

  if (!updated) {
    return { success: false, message: 'Material dengan MID tersebut belum ditarik pada shift aktif saat ini.' };
  }

  fullRange.setValues(vals);
  return { success: true, message: 'Status verifikasi material berhasil dicatat di Google Sheets.' };
}

function computeHistoricalTspStock_(dateStr, shiftNum) {
  var result = [];
  var statusNeraca = 'BELUM_DITARIK';
  var validatorNama = '-';
  var targetDateStr = getNormalizedDateStr_(dateStr);
  var supplierMap = getSupplierMap_();
  try {
    var sheet = getSheet_(SHEET_NAMES.STOCK_TSP);
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var hm = getHeaderMap_(sheet);
      var cDate   = (hm['tanggal'] || 2) - 1;
      var cShift  = (hm['shift'] || 3) - 1;
      var cNama   = (hm['nama tsp'] || 5) - 1;
      var cMid    = (hm['mid'] || 6) - 1;
      var cDesc   = (hm['deskripsi'] || 7) - 1;
      var cUom    = (hm['uom'] || 8) - 1;
      var cSA     = (hm['stok awal'] || hm['stock awal'] || 9) - 1;
      var cMasuk  = (hm['barang masuk'] || 10) - 1;
      var cKB1    = (hm['kirim bhp 1'] || 11) - 1;
      var cKB2    = (hm['kirim bhp 2'] || 12) - 1;
      var cKB3    = (hm['kirim bhp 3'] || 13) - 1;
      var cKA1    = (hm['kirim ahp 1'] || 14) - 1;
      var cKB4    = (hm['kirim bhp 4'] || 15) - 1;
      var cKB5    = (hm['kirim bhp 5'] || 16) - 1;
      var cRB1    = (hm['return bhp 1'] || 17) - 1;
      var cRB2    = (hm['return bhp 2'] || 18) - 1;
      var cRB3    = (hm['return bhp 3'] || 19) - 1;
      var cRA1    = (hm['return ahp 1'] || 20) - 1;
      var cRB4    = (hm['return bhp 4'] || 21) - 1;
      var cRB5    = (hm['return bhp 5'] || 22) - 1;
      var cMat    = (hm['matclaim wrm'] || 23) - 1;
      var cRumus  = (hm['stock akhir (rumus)'] || 24) - 1;
      var cAktual = (hm['stock akhir (hitung aktual)'] || hm['stock akhir'] || 25) - 1;
      var cStatus = (hm['check'] || hm['status'] || 26) - 1;
      
      var maxCol = sheet.getLastColumn();
      var data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();
      var selectedRows = [];
      var actorNameFound = '';
      var statusCellFound = '';
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var mid = normalizeMid_(row[cMid]);
        if (!mid) continue;
        var rDate = getNormalizedDateStr_(row[cDate]);
        var rShift = getNormalizedShiftNum_(row[cShift]);
        if (rDate === targetDateStr && String(rShift) === String(shiftNum)) {
          selectedRows.push(row);
          if (row[cNama]) actorNameFound = String(row[cNama]).trim();
          if (row[cStatus]) statusCellFound = String(row[cStatus]).trim();
        }
      }
      
      if (selectedRows.length > 0) {
        validatorNama = actorNameFound || '-';
        var stCell = statusCellFound.toUpperCase();
        if (stCell.indexOf('VALID') !== -1 || (stCell.indexOf('DIKONFIRMASI') !== -1 && stCell.indexOf('BELUM') === -1) || stCell.indexOf('OK - ') !== -1 || stCell.indexOf('SELISIH - ') !== -1) {
          statusNeraca = 'VALID';
          validatorNama = statusCellFound || actorNameFound || '-';
        } else {
          statusNeraca = 'BELUM_DIKONFIRMASI';
        }
        
        for (var j = 0; j < selectedRows.length; j++) {
          var r = selectedRows[j];
          var m = normalizeMid_(r[cMid]);
          var d = String(r[cDesc] || '').trim();
          var stockAwal = Number(r[cSA]) || 0;
          var masuk = Number(r[cMasuk]) || 0;
          var keluar = (Number(r[cKB1])||0)+(Number(r[cKB2])||0)+(Number(r[cKB3])||0)+(Number(r[cKA1])||0)+(Number(r[cKB4])||0)+(Number(r[cKB5])||0);
          var returIn = (Number(r[cRB1])||0)+(Number(r[cRB2])||0)+(Number(r[cRB3])||0)+(Number(r[cRA1])||0)+(Number(r[cRB4])||0)+(Number(r[cRB5])||0);
          var returOut = Number(r[cMat]) || 0;
          var rumus = Number(r[cRumus]) || 0;
          var aktual = r[cAktual];
          var stockAkhir = (aktual !== '' && aktual !== null && !isNaN(Number(aktual))) ? Number(aktual) : rumus;
          
          result.push({
            mid: m, deskripsi: d, supplier: supplierMap[m] || '-', uom: String(r[cUom] || 'KG').trim(),
            stockAwal: stockAwal, stokAwal: stockAwal, masuk: masuk, terimaWrm: masuk,
            keluar: keluar, kirimMesin: keluar, returIn: returIn, retDariMesin: returIn,
            returOut: returOut, retKeWrm: returOut, rumus: rumus,
            aktual: (aktual !== '' && aktual !== null) ? aktual : '',
            statusItem: String(r[cStatus] || '').trim(), stockAkhir: stockAkhir, stokAkhir: stockAkhir
          });
        }
      }
    }
  } catch (err) {
    Logger.log('Error reading STOCK TSP history: ' + err.message);
  }
  
  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  
  var dateParts = targetDateStr.split('-');
  var formattedDate = targetDateStr;
  if (dateParts.length === 3) formattedDate = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
  
  return { shift: shiftNum, date: formattedDate, statusNeraca: statusNeraca, validatorNama: validatorNama, rows: result };
}

function computeHistoricalMesinStock_(mesinCode, dateStr, shiftNum) {
  var result = [];
  var idx = MESIN_LIST.indexOf(mesinCode);
  if (idx === -1) return { shift: shiftNum, date: dateStr, data: {} };
  
  var validatorNama = '-';
  var statusNeraca = 'BELUM_DITARIK';
  var targetDateStr = getNormalizedDateStr_(dateStr);
  var supplierMap = getSupplierMap_();
  try {
    var sheet = getSheet_(SHEET_NAMES.STOCK_MESIN);
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var hmM = getHeaderMap_(sheet);
      var cDate   = (hmM['tanggal'] || 2) - 1;
      var cShift  = (hmM['shift'] || 3) - 1;
      var cMesin  = (hmM['mesin'] || 4) - 1;
      var cNamaOp = (hmM['nama op'] || hmM['nama operator'] || 6) - 1;
      var cMid    = (hmM['mid'] || 7) - 1;
      var cDesc   = (hmM['deskripsi'] || 8) - 1;
      var cUom    = (hmM['uom'] || 9) - 1;
      var mesinSuffix = MESIN_LIST[idx].toLowerCase();
      var cAwal   = (hmM['stock awal ' + mesinSuffix] || (10 + idx)) - 1;
      var cTerima = (hmM['terima ' + mesinSuffix] || (16 + idx)) - 1;
      var cKons   = (hmM['consume ' + mesinSuffix] || (22 + idx)) - 1;
      var cRet    = (hmM['return ' + mesinSuffix] || (28 + idx)) - 1;
      var cAkhir  = (hmM['stock akhir ' + mesinSuffix] || (34 + idx)) - 1;

      var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      var selectedRows = [];
      var actorFound = '';
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (String(row[cMesin]).trim() !== mesinCode) continue;
        var rDate = getNormalizedDateStr_(row[cDate]);
        var rShift = getNormalizedShiftNum_(row[cShift]);
        if (rDate === targetDateStr && String(rShift) === String(shiftNum)) {
          selectedRows.push(row);
          if (row[cNamaOp]) actorFound = String(row[cNamaOp]).trim();
        }
      }
      
      if (selectedRows.length > 0) {
        statusNeraca = 'BELUM_DIKONFIRMASI';
        validatorNama = actorFound || '-';
        
        for (var j = 0; j < selectedRows.length; j++) {
          var r = selectedRows[j];
          var mid = normalizeMid_(r[cMid]);
          var awal   = Number(r[cAwal]) || 0;
          var terima = Number(r[cTerima]) || 0;
          var kons   = Number(r[cKons]) || 0;
          var ret    = Number(r[cRet]) || 0;
          var akhir  = Number(r[cAkhir]) || 0;
          result.push({
            mid: mid, deskripsi: String(r[cDesc] || '').trim(), supplier: supplierMap[mid] || '-', uom: String(r[cUom] || 'KG').trim(),
            stockAwal: awal, stokAwal: awal,
            terima: terima, ditarik: terima,
            consume: kons, pakai: kons,
            retur: ret,
            stockAkhir: akhir, stokAkhir: akhir
          });
        }
      }
    }
  } catch (err) {
    Logger.log('Error reading STOCK MESIN history: ' + err.message);
  }
  result.sort(function (a, b) { return String(a.deskripsi).localeCompare(String(b.deskripsi)); });
  
  var dateParts = dateStr.split('-');
  var formattedDate = dateStr;
  if (dateParts.length === 3) formattedDate = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
  
  return { shift: shiftNum, date: formattedDate, statusNeraca: statusNeraca, validatorNama: validatorNama, data: result };
}

/**
 * Endpoint API Riwayat Format Portal per Jam untuk Operator Mesin
 * Menghasilkan data agregrasi per jam (07, 08, 09, dsb.)
 */
function computePortalHistory_(mesinCode, dateStr, shiftNum) {
  var baseHistory = computeHistoricalMesinStock_(mesinCode, dateStr, shiftNum);
  var baseData = baseHistory.data || [];
  
  // Setup Hourly Buckets depending on shift
  var hours = [];
  var sNum = String(shiftNum).trim();
  if (sNum === '1') {
    hours = [7, 8, 9, 10, 11, 12, 13, 14];
  } else if (sNum === '2') {
    hours = [15, 16, 17, 18, 19, 20, 21, 22];
  } else {
    hours = [23, 0, 1, 2, 3, 4, 5, 6];
  }
  
  // Convert dateStr (yyyy-mm-dd) to Date object to get Shift bounds
  var dParts = dateStr.split('-');
  var y = parseInt(dParts[0], 10);
  var m = parseInt(dParts[1], 10) - 1;
  var d = parseInt(dParts[2], 10);
  var targetDate = new Date(y, m, d, 12, 0, 0); // Noon to safely get the date
  
  var bounds = getShiftBounds_(targetDate);
  // Override shift bounds based on exact shift requested (if the user requests a specific shift for that date)
  if (sNum === '1') { bounds = { start: new Date(y, m, d, 6, 0, 0), end: new Date(y, m, d, 14, 0, 0) }; }
  else if (sNum === '2') { bounds = { start: new Date(y, m, d, 14, 0, 0), end: new Date(y, m, d, 22, 0, 0) }; }
  else if (sNum === '3') { bounds = { start: new Date(y, m, d, 22, 0, 0), end: new Date(y, m, d + 1, 6, 0, 0) }; }
  
  // Read raw barcode data for granular consumption timestamps
  var allRows = readAllBarcodeRows_();
  var hourlyConsumption = {}; // mid -> { '7': 0, '8': 0, ... }
  
  for (var i = 0; i < allRows.length; i++) {
    var r = allRows[i];
    if (r.mesin === mesinCode && r.tsConsume && r.tsConsume >= bounds.start && r.tsConsume < bounds.end) {
      var h = r.tsConsume.getHours();
      // Snap 06:xx to 07 hour bucket for Shift 1, etc.
      // In Portal, Shift 1 usually spans 06:00-14:00, with buckets 07..14.
      // So 06:01 -> bucket 07. 07:01 -> bucket 08.
      var bucketHour = h + 1;
      if (bucketHour === 24) bucketHour = 0;
      if (bucketHour === 7 && sNum === '3') bucketHour = 6; // snap bounds
      
      var hStr = String(bucketHour);
      if (!hourlyConsumption[r.mid]) hourlyConsumption[r.mid] = {};
      hourlyConsumption[r.mid][hStr] = (hourlyConsumption[r.mid][hStr] || 0) + (Number(r.jumlah) || 0);
    }
  }
  
  // Merge into output
  var portalData = [];
  for (var j = 0; j < baseData.length; j++) {
    var item = baseData[j];
    var pRow = {
      materialName: item.deskripsi,
      supplier: item.supplier,
      stkAwal: item.stockAwal,
      masuk: item.terima,
      retur: item.retur,
      reject: 0, // system currently does not track reject explicitly in UI
      hourly: {},
      totProd: item.consume, // total flat consume
      grandTotal: item.stockAwal + item.terima - item.retur - 0 - item.consume,
      sisa: item.stockAkhir
    };
    
    // Fill hourly buckets
    var sumHourly = 0;
    for (var k = 0; k < hours.length; k++) {
      var hKey = String(hours[k]);
      var val = (hourlyConsumption[item.mid] && hourlyConsumption[item.mid][hKey]) ? hourlyConsumption[item.mid][hKey] : 0;
      pRow.hourly[hKey] = val;
      sumHourly += val;
    }
    
    // Override totProd with precise sum if there are mismatches, though they should match
    pRow.totProd = sumHourly > 0 ? sumHourly : item.consume; 
    
    portalData.push(pRow);
  }
  
  return {
    shift: shiftNum,
    date: baseHistory.date,
    hoursHeader: hours, // for UI rendering
    data: portalData
  };
}

/**
 * Mendapatkan sheet "MIN MAX STOCK", membuat jika belum ada.
 */
function getMinMaxSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAMES.MIN_MAX);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.MIN_MAX);
    sheet.appendRow(['MID', 'MATERIAL DESCRIPTION', 'LOKASI', 'MIN_STOCK', 'MAX_STOCK', 'UPDATED_AT', 'UPDATED_BY']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f1f5f9');
  }
  return sheet;
}

/**
 * Mendapatkan dictionary min/max threshold per MID_LOKASI.
 */
function getMinMaxMap_() {
  var map = {};
  try {
    var sheet = getMinMaxSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var mid = normalizeMid_(row[0]);
        var loc = String(row[2] || '').trim().toUpperCase();
        if (!mid || !loc) continue;
        var key = mid + '_' + loc;
        map[key] = {
          minStock: (row[3] !== '' && row[3] !== null && !isNaN(Number(row[3]))) ? Number(row[3]) : null,
          maxStock: (row[4] !== '' && row[4] !== null && !isNaN(Number(row[4]))) ? Number(row[4]) : null
        };
      }
    }
  } catch (err) {
    Logger.log('Error reading MIN MAX STOCK sheet: ' + err.message);
  }
  return map;
}

/**
 * Mengambil daftar seluruh pengaturan Min/Max Stock untuk tampilan SPV.
 * Menggabungkan seluruh MID dari master MID EXISTING sehingga material yang belum diatur
 * otomatis muncul dengan Min=0, Max=0 (by default).
 */
function getMinMaxSettings() {
  try {
    var sheet = getMinMaxSheet_();
    var materialMap = getMaterialMap_();
    var supplierMap = getSupplierMap_();
    var lastRow = sheet.getLastRow();
    var existingMap = {};
    var rows = [];

    // Baca data yang sudah pernah di-set di sheet MIN MAX STOCK
    if (lastRow >= 2) {
      var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        var mid = normalizeMid_(r[0]);
        var lokasi = String(r[2] || 'TSP').trim().toUpperCase();
        if (!mid || !lokasi) continue;
        var key = mid + '_' + lokasi;
        var deskripsi = String(r[1] || (materialMap[mid] ? materialMap[mid].deskripsi : '') || '').trim();
        var supplier = supplierMap[mid] || '-';
        existingMap[key] = {
          mid: mid,
          supplier: supplier,
          deskripsi: deskripsi,
          uom: (materialMap[mid] && materialMap[mid].uom) || 'KG',
          lokasi: lokasi,
          minStock: (r[3] !== '' && r[3] !== null && !isNaN(Number(r[3]))) ? Number(r[3]) : 0,
          maxStock: (r[4] !== '' && r[4] !== null && !isNaN(Number(r[4]))) ? Number(r[4]) : 0,
          updatedAt: r[5] ? String(r[5]) : '-',
          updatedBy: r[6] ? String(r[6]) : '-',
          isConfigured: true
        };
      }
    }

    var ALL_LOCATIONS = ['TSP', 'BHP 1', 'BHP 2', 'BHP 3', 'AHP 1', 'BHP 4', 'BHP 5'];

    // Gabungkan dengan seluruh MID dari master MID EXISTING untuk seluruh lokasi (TSP & 6 Mesin)
    // agar saat SPV memilih filter lokasi mana pun (misal Mesin BHP 1), seluruh material dari master langsung muncul
    Object.keys(materialMap).forEach(function(mid) {
      ALL_LOCATIONS.forEach(function(loc) {
        var key = mid + '_' + loc;
        if (!existingMap[key]) {
          existingMap[key] = {
            mid: mid,
            supplier: getSupplierMap_()[mid] || '-',
            deskripsi: String(materialMap[mid].deskripsi || '').trim(),
            uom: materialMap[mid].uom || 'KG',
            lokasi: loc,
            minStock: 0,
            maxStock: 0,
            updatedAt: 'Belum Diatur',
            updatedBy: '-',
            isConfigured: false
          };
        }
      });
    });

    // Masukkan ke array rows
    Object.keys(existingMap).forEach(function(k) {
      rows.push(existingMap[k]);
    });

    rows.sort(function(a, b) { 
      return a.mid.localeCompare(b.mid) || a.lokasi.localeCompare(b.lokasi); 
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, message: 'Gagal memuat data Min/Max Stock: ' + err.message };
  }
}

/**
 * Menyimpan / meng-update pengaturan Min/Max Stock per MID dan Lokasi.
 */
function saveMinMaxSetting(nik, mid, deskripsi, lokasi, minStock, maxStock, uom, supplier) {
  try {
    if (!mid || !lokasi) {
      return { success: false, message: 'MID dan Lokasi wajib diisi.' };
    }
    var sheet = getMinMaxSheet_();
    var lastRow = sheet.getLastRow();
    var targetMid = normalizeMid_(mid);
    var targetLoc = String(lokasi).trim().toUpperCase();
    var minVal = (minStock !== '' && minStock !== null && !isNaN(Number(minStock))) ? Number(minStock) : 0;
    var maxVal = (maxStock !== '' && maxStock !== null && !isNaN(Number(maxStock))) ? Number(maxStock) : 0;

    var materialMap = getMaterialMap_();
    var matDesc = String(deskripsi || (materialMap[targetMid] ? materialMap[targetMid].deskripsi : '') || '').trim();

    // MID baru (belum ada di Material Master "MID EXISTING") otomatis didaftarkan di situ juga,
    // supaya langsung muncul di tabel Stock, bisa ditarik Stok Awal Shift, dan dapat Supplier.
    upsertMaterialMaster_(targetMid, matDesc, uom, supplier);

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var updatedBy = String(nik || 'SPV').trim();

    var data = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 7).getValues() : [];
    var foundIndex = -1;

    for (var i = 0; i < data.length; i++) {
      if (normalizeMid_(data[i][0]) === targetMid && String(data[i][2]).trim().toUpperCase() === targetLoc) {
        foundIndex = i + 2;
        break;
      }
    }

    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 1, 1, 7).setValues([[targetMid, matDesc, targetLoc, minVal, maxVal, timestamp, updatedBy]]);
    } else {
      sheet.appendRow([targetMid, matDesc, targetLoc, minVal, maxVal, timestamp, updatedBy]);
    }

    return { success: true, message: 'Pengaturan Min/Max Stock berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan pengaturan Min/Max: ' + err.message };
  }
}

/**
 * Bulk save / update list threshold Min/Max Stock dari CSV Upload / batch input.
 */
function saveMinMaxBatch_(nik, items) {
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, message: 'Data import CSV kosong atau tidak valid.' };
    }

    var sheet = getMinMaxSheet_();
    var materialMap = getMaterialMap_();
    var lastRow = sheet.getLastRow();
    var existingData = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 7).getValues() : [];
    
    // Index data lama per MID_LOKASI -> row index di sheet
    var rowMap = {};
    for (var i = 0; i < existingData.length; i++) {
      var rMid = normalizeMid_(existingData[i][0]);
      var rLoc = String(existingData[i][2] || '').trim().toUpperCase();
      if (rMid && rLoc) {
        rowMap[rMid + '_' + rLoc] = i + 2;
      }
    }

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var updatedBy = String(nik || 'SPV').trim();
    var importedCount = 0;

    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      var mid = normalizeMid_(item.mid);
      var lokasi = String(item.lokasi || 'TSP').trim().toUpperCase();
      if (!mid) continue;

      var matDesc = String(item.deskripsi || (materialMap[mid] ? materialMap[mid].deskripsi : '') || '').trim();
      var minVal = (item.minStock !== '' && item.minStock !== null && !isNaN(Number(item.minStock))) ? Number(item.minStock) : 0;
      var maxVal = (item.maxStock !== '' && item.maxStock !== null && !isNaN(Number(item.maxStock))) ? Number(item.maxStock) : 0;

      var key = mid + '_' + lokasi;
      if (rowMap[key]) {
        var rIdx = rowMap[key];
        sheet.getRange(rIdx, 1, 1, 7).setValues([[mid, matDesc, lokasi, minVal, maxVal, timestamp, updatedBy]]);
      } else {
        sheet.appendRow([mid, matDesc, lokasi, minVal, maxVal, timestamp, updatedBy]);
        rowMap[key] = sheet.getLastRow();
      }
      importedCount++;
    }

    return { success: true, message: 'Berhasil mengimpor / memperbarui ' + importedCount + ' item Min/Max Stock.' };
  } catch (err) {
    return { success: false, message: 'Gagal mengimpor batch Min/Max: ' + err.message };
  }
}
