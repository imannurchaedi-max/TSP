// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'database.dart';

// ignore_for_file: type=lint
class $PendingScansTable extends PendingScans
    with TableInfo<$PendingScansTable, PendingScan> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingScansTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localIdMeta = const VerificationMeta(
    'localId',
  );
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
    'local_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _barcodeTextMeta = const VerificationMeta(
    'barcodeText',
  );
  @override
  late final GeneratedColumn<String> barcodeText = GeneratedColumn<String>(
    'barcode_text',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _eventCodeMeta = const VerificationMeta(
    'eventCode',
  );
  @override
  late final GeneratedColumn<String> eventCode = GeneratedColumn<String>(
    'event_code',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _mesinCodeMeta = const VerificationMeta(
    'mesinCode',
  );
  @override
  late final GeneratedColumn<String> mesinCode = GeneratedColumn<String>(
    'mesin_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _jumlahMeta = const VerificationMeta('jumlah');
  @override
  late final GeneratedColumn<String> jumlah = GeneratedColumn<String>(
    'jumlah',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _noReservasiMeta = const VerificationMeta(
    'noReservasi',
  );
  @override
  late final GeneratedColumn<String> noReservasi = GeneratedColumn<String>(
    'no_reservasi',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _nikMeta = const VerificationMeta('nik');
  @override
  late final GeneratedColumn<String> nik = GeneratedColumn<String>(
    'nik',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _syncStatusMeta = const VerificationMeta(
    'syncStatus',
  );
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
    'sync_status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _serverMessageMeta = const VerificationMeta(
    'serverMessage',
  );
  @override
  late final GeneratedColumn<String> serverMessage = GeneratedColumn<String>(
    'server_message',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _retryCountMeta = const VerificationMeta(
    'retryCount',
  );
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
    'retry_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    localId,
    barcodeText,
    eventCode,
    mesinCode,
    jumlah,
    noReservasi,
    nik,
    createdAt,
    syncStatus,
    serverMessage,
    retryCount,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_scans';
  @override
  VerificationContext validateIntegrity(
    Insertable<PendingScan> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_id')) {
      context.handle(
        _localIdMeta,
        localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta),
      );
    } else if (isInserting) {
      context.missing(_localIdMeta);
    }
    if (data.containsKey('barcode_text')) {
      context.handle(
        _barcodeTextMeta,
        barcodeText.isAcceptableOrUnknown(
          data['barcode_text']!,
          _barcodeTextMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_barcodeTextMeta);
    }
    if (data.containsKey('event_code')) {
      context.handle(
        _eventCodeMeta,
        eventCode.isAcceptableOrUnknown(data['event_code']!, _eventCodeMeta),
      );
    } else if (isInserting) {
      context.missing(_eventCodeMeta);
    }
    if (data.containsKey('mesin_code')) {
      context.handle(
        _mesinCodeMeta,
        mesinCode.isAcceptableOrUnknown(data['mesin_code']!, _mesinCodeMeta),
      );
    }
    if (data.containsKey('jumlah')) {
      context.handle(
        _jumlahMeta,
        jumlah.isAcceptableOrUnknown(data['jumlah']!, _jumlahMeta),
      );
    }
    if (data.containsKey('no_reservasi')) {
      context.handle(
        _noReservasiMeta,
        noReservasi.isAcceptableOrUnknown(
          data['no_reservasi']!,
          _noReservasiMeta,
        ),
      );
    }
    if (data.containsKey('nik')) {
      context.handle(
        _nikMeta,
        nik.isAcceptableOrUnknown(data['nik']!, _nikMeta),
      );
    } else if (isInserting) {
      context.missing(_nikMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('sync_status')) {
      context.handle(
        _syncStatusMeta,
        syncStatus.isAcceptableOrUnknown(data['sync_status']!, _syncStatusMeta),
      );
    }
    if (data.containsKey('server_message')) {
      context.handle(
        _serverMessageMeta,
        serverMessage.isAcceptableOrUnknown(
          data['server_message']!,
          _serverMessageMeta,
        ),
      );
    }
    if (data.containsKey('retry_count')) {
      context.handle(
        _retryCountMeta,
        retryCount.isAcceptableOrUnknown(data['retry_count']!, _retryCountMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localId};
  @override
  PendingScan map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingScan(
      localId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}local_id'],
      )!,
      barcodeText: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}barcode_text'],
      )!,
      eventCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}event_code'],
      )!,
      mesinCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}mesin_code'],
      ),
      jumlah: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}jumlah'],
      ),
      noReservasi: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}no_reservasi'],
      ),
      nik: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nik'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      syncStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_status'],
      )!,
      serverMessage: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}server_message'],
      ),
      retryCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}retry_count'],
      )!,
    );
  }

  @override
  $PendingScansTable createAlias(String alias) {
    return $PendingScansTable(attachedDatabase, alias);
  }
}

class PendingScan extends DataClass implements Insertable<PendingScan> {
  final String localId;
  final String barcodeText;
  final String eventCode;
  final String? mesinCode;
  final String? jumlah;
  final String? noReservasi;
  final String nik;
  final DateTime createdAt;

  /// pending | syncing | synced | failed
  final String syncStatus;
  final String? serverMessage;
  final int retryCount;
  const PendingScan({
    required this.localId,
    required this.barcodeText,
    required this.eventCode,
    this.mesinCode,
    this.jumlah,
    this.noReservasi,
    required this.nik,
    required this.createdAt,
    required this.syncStatus,
    this.serverMessage,
    required this.retryCount,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_id'] = Variable<String>(localId);
    map['barcode_text'] = Variable<String>(barcodeText);
    map['event_code'] = Variable<String>(eventCode);
    if (!nullToAbsent || mesinCode != null) {
      map['mesin_code'] = Variable<String>(mesinCode);
    }
    if (!nullToAbsent || jumlah != null) {
      map['jumlah'] = Variable<String>(jumlah);
    }
    if (!nullToAbsent || noReservasi != null) {
      map['no_reservasi'] = Variable<String>(noReservasi);
    }
    map['nik'] = Variable<String>(nik);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['sync_status'] = Variable<String>(syncStatus);
    if (!nullToAbsent || serverMessage != null) {
      map['server_message'] = Variable<String>(serverMessage);
    }
    map['retry_count'] = Variable<int>(retryCount);
    return map;
  }

  PendingScansCompanion toCompanion(bool nullToAbsent) {
    return PendingScansCompanion(
      localId: Value(localId),
      barcodeText: Value(barcodeText),
      eventCode: Value(eventCode),
      mesinCode: mesinCode == null && nullToAbsent
          ? const Value.absent()
          : Value(mesinCode),
      jumlah: jumlah == null && nullToAbsent
          ? const Value.absent()
          : Value(jumlah),
      noReservasi: noReservasi == null && nullToAbsent
          ? const Value.absent()
          : Value(noReservasi),
      nik: Value(nik),
      createdAt: Value(createdAt),
      syncStatus: Value(syncStatus),
      serverMessage: serverMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(serverMessage),
      retryCount: Value(retryCount),
    );
  }

  factory PendingScan.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingScan(
      localId: serializer.fromJson<String>(json['localId']),
      barcodeText: serializer.fromJson<String>(json['barcodeText']),
      eventCode: serializer.fromJson<String>(json['eventCode']),
      mesinCode: serializer.fromJson<String?>(json['mesinCode']),
      jumlah: serializer.fromJson<String?>(json['jumlah']),
      noReservasi: serializer.fromJson<String?>(json['noReservasi']),
      nik: serializer.fromJson<String>(json['nik']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      serverMessage: serializer.fromJson<String?>(json['serverMessage']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localId': serializer.toJson<String>(localId),
      'barcodeText': serializer.toJson<String>(barcodeText),
      'eventCode': serializer.toJson<String>(eventCode),
      'mesinCode': serializer.toJson<String?>(mesinCode),
      'jumlah': serializer.toJson<String?>(jumlah),
      'noReservasi': serializer.toJson<String?>(noReservasi),
      'nik': serializer.toJson<String>(nik),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'serverMessage': serializer.toJson<String?>(serverMessage),
      'retryCount': serializer.toJson<int>(retryCount),
    };
  }

  PendingScan copyWith({
    String? localId,
    String? barcodeText,
    String? eventCode,
    Value<String?> mesinCode = const Value.absent(),
    Value<String?> jumlah = const Value.absent(),
    Value<String?> noReservasi = const Value.absent(),
    String? nik,
    DateTime? createdAt,
    String? syncStatus,
    Value<String?> serverMessage = const Value.absent(),
    int? retryCount,
  }) => PendingScan(
    localId: localId ?? this.localId,
    barcodeText: barcodeText ?? this.barcodeText,
    eventCode: eventCode ?? this.eventCode,
    mesinCode: mesinCode.present ? mesinCode.value : this.mesinCode,
    jumlah: jumlah.present ? jumlah.value : this.jumlah,
    noReservasi: noReservasi.present ? noReservasi.value : this.noReservasi,
    nik: nik ?? this.nik,
    createdAt: createdAt ?? this.createdAt,
    syncStatus: syncStatus ?? this.syncStatus,
    serverMessage: serverMessage.present
        ? serverMessage.value
        : this.serverMessage,
    retryCount: retryCount ?? this.retryCount,
  );
  PendingScan copyWithCompanion(PendingScansCompanion data) {
    return PendingScan(
      localId: data.localId.present ? data.localId.value : this.localId,
      barcodeText: data.barcodeText.present
          ? data.barcodeText.value
          : this.barcodeText,
      eventCode: data.eventCode.present ? data.eventCode.value : this.eventCode,
      mesinCode: data.mesinCode.present ? data.mesinCode.value : this.mesinCode,
      jumlah: data.jumlah.present ? data.jumlah.value : this.jumlah,
      noReservasi: data.noReservasi.present
          ? data.noReservasi.value
          : this.noReservasi,
      nik: data.nik.present ? data.nik.value : this.nik,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      syncStatus: data.syncStatus.present
          ? data.syncStatus.value
          : this.syncStatus,
      serverMessage: data.serverMessage.present
          ? data.serverMessage.value
          : this.serverMessage,
      retryCount: data.retryCount.present
          ? data.retryCount.value
          : this.retryCount,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingScan(')
          ..write('localId: $localId, ')
          ..write('barcodeText: $barcodeText, ')
          ..write('eventCode: $eventCode, ')
          ..write('mesinCode: $mesinCode, ')
          ..write('jumlah: $jumlah, ')
          ..write('noReservasi: $noReservasi, ')
          ..write('nik: $nik, ')
          ..write('createdAt: $createdAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('serverMessage: $serverMessage, ')
          ..write('retryCount: $retryCount')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    localId,
    barcodeText,
    eventCode,
    mesinCode,
    jumlah,
    noReservasi,
    nik,
    createdAt,
    syncStatus,
    serverMessage,
    retryCount,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingScan &&
          other.localId == this.localId &&
          other.barcodeText == this.barcodeText &&
          other.eventCode == this.eventCode &&
          other.mesinCode == this.mesinCode &&
          other.jumlah == this.jumlah &&
          other.noReservasi == this.noReservasi &&
          other.nik == this.nik &&
          other.createdAt == this.createdAt &&
          other.syncStatus == this.syncStatus &&
          other.serverMessage == this.serverMessage &&
          other.retryCount == this.retryCount);
}

class PendingScansCompanion extends UpdateCompanion<PendingScan> {
  final Value<String> localId;
  final Value<String> barcodeText;
  final Value<String> eventCode;
  final Value<String?> mesinCode;
  final Value<String?> jumlah;
  final Value<String?> noReservasi;
  final Value<String> nik;
  final Value<DateTime> createdAt;
  final Value<String> syncStatus;
  final Value<String?> serverMessage;
  final Value<int> retryCount;
  final Value<int> rowid;
  const PendingScansCompanion({
    this.localId = const Value.absent(),
    this.barcodeText = const Value.absent(),
    this.eventCode = const Value.absent(),
    this.mesinCode = const Value.absent(),
    this.jumlah = const Value.absent(),
    this.noReservasi = const Value.absent(),
    this.nik = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.serverMessage = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PendingScansCompanion.insert({
    required String localId,
    required String barcodeText,
    required String eventCode,
    this.mesinCode = const Value.absent(),
    this.jumlah = const Value.absent(),
    this.noReservasi = const Value.absent(),
    required String nik,
    required DateTime createdAt,
    this.syncStatus = const Value.absent(),
    this.serverMessage = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : localId = Value(localId),
       barcodeText = Value(barcodeText),
       eventCode = Value(eventCode),
       nik = Value(nik),
       createdAt = Value(createdAt);
  static Insertable<PendingScan> custom({
    Expression<String>? localId,
    Expression<String>? barcodeText,
    Expression<String>? eventCode,
    Expression<String>? mesinCode,
    Expression<String>? jumlah,
    Expression<String>? noReservasi,
    Expression<String>? nik,
    Expression<DateTime>? createdAt,
    Expression<String>? syncStatus,
    Expression<String>? serverMessage,
    Expression<int>? retryCount,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localId != null) 'local_id': localId,
      if (barcodeText != null) 'barcode_text': barcodeText,
      if (eventCode != null) 'event_code': eventCode,
      if (mesinCode != null) 'mesin_code': mesinCode,
      if (jumlah != null) 'jumlah': jumlah,
      if (noReservasi != null) 'no_reservasi': noReservasi,
      if (nik != null) 'nik': nik,
      if (createdAt != null) 'created_at': createdAt,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (serverMessage != null) 'server_message': serverMessage,
      if (retryCount != null) 'retry_count': retryCount,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PendingScansCompanion copyWith({
    Value<String>? localId,
    Value<String>? barcodeText,
    Value<String>? eventCode,
    Value<String?>? mesinCode,
    Value<String?>? jumlah,
    Value<String?>? noReservasi,
    Value<String>? nik,
    Value<DateTime>? createdAt,
    Value<String>? syncStatus,
    Value<String?>? serverMessage,
    Value<int>? retryCount,
    Value<int>? rowid,
  }) {
    return PendingScansCompanion(
      localId: localId ?? this.localId,
      barcodeText: barcodeText ?? this.barcodeText,
      eventCode: eventCode ?? this.eventCode,
      mesinCode: mesinCode ?? this.mesinCode,
      jumlah: jumlah ?? this.jumlah,
      noReservasi: noReservasi ?? this.noReservasi,
      nik: nik ?? this.nik,
      createdAt: createdAt ?? this.createdAt,
      syncStatus: syncStatus ?? this.syncStatus,
      serverMessage: serverMessage ?? this.serverMessage,
      retryCount: retryCount ?? this.retryCount,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (barcodeText.present) {
      map['barcode_text'] = Variable<String>(barcodeText.value);
    }
    if (eventCode.present) {
      map['event_code'] = Variable<String>(eventCode.value);
    }
    if (mesinCode.present) {
      map['mesin_code'] = Variable<String>(mesinCode.value);
    }
    if (jumlah.present) {
      map['jumlah'] = Variable<String>(jumlah.value);
    }
    if (noReservasi.present) {
      map['no_reservasi'] = Variable<String>(noReservasi.value);
    }
    if (nik.present) {
      map['nik'] = Variable<String>(nik.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (serverMessage.present) {
      map['server_message'] = Variable<String>(serverMessage.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingScansCompanion(')
          ..write('localId: $localId, ')
          ..write('barcodeText: $barcodeText, ')
          ..write('eventCode: $eventCode, ')
          ..write('mesinCode: $mesinCode, ')
          ..write('jumlah: $jumlah, ')
          ..write('noReservasi: $noReservasi, ')
          ..write('nik: $nik, ')
          ..write('createdAt: $createdAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('serverMessage: $serverMessage, ')
          ..write('retryCount: $retryCount, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $PendingScansTable pendingScans = $PendingScansTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [pendingScans];
}

typedef $$PendingScansTableCreateCompanionBuilder =
    PendingScansCompanion Function({
      required String localId,
      required String barcodeText,
      required String eventCode,
      Value<String?> mesinCode,
      Value<String?> jumlah,
      Value<String?> noReservasi,
      required String nik,
      required DateTime createdAt,
      Value<String> syncStatus,
      Value<String?> serverMessage,
      Value<int> retryCount,
      Value<int> rowid,
    });
typedef $$PendingScansTableUpdateCompanionBuilder =
    PendingScansCompanion Function({
      Value<String> localId,
      Value<String> barcodeText,
      Value<String> eventCode,
      Value<String?> mesinCode,
      Value<String?> jumlah,
      Value<String?> noReservasi,
      Value<String> nik,
      Value<DateTime> createdAt,
      Value<String> syncStatus,
      Value<String?> serverMessage,
      Value<int> retryCount,
      Value<int> rowid,
    });

class $$PendingScansTableFilterComposer
    extends Composer<_$AppDatabase, $PendingScansTable> {
  $$PendingScansTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localId => $composableBuilder(
    column: $table.localId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get barcodeText => $composableBuilder(
    column: $table.barcodeText,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get eventCode => $composableBuilder(
    column: $table.eventCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get mesinCode => $composableBuilder(
    column: $table.mesinCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get jumlah => $composableBuilder(
    column: $table.jumlah,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get noReservasi => $composableBuilder(
    column: $table.noReservasi,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nik => $composableBuilder(
    column: $table.nik,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get serverMessage => $composableBuilder(
    column: $table.serverMessage,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PendingScansTableOrderingComposer
    extends Composer<_$AppDatabase, $PendingScansTable> {
  $$PendingScansTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localId => $composableBuilder(
    column: $table.localId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get barcodeText => $composableBuilder(
    column: $table.barcodeText,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get eventCode => $composableBuilder(
    column: $table.eventCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get mesinCode => $composableBuilder(
    column: $table.mesinCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get jumlah => $composableBuilder(
    column: $table.jumlah,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get noReservasi => $composableBuilder(
    column: $table.noReservasi,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nik => $composableBuilder(
    column: $table.nik,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get serverMessage => $composableBuilder(
    column: $table.serverMessage,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PendingScansTableAnnotationComposer
    extends Composer<_$AppDatabase, $PendingScansTable> {
  $$PendingScansTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<String> get barcodeText => $composableBuilder(
    column: $table.barcodeText,
    builder: (column) => column,
  );

  GeneratedColumn<String> get eventCode =>
      $composableBuilder(column: $table.eventCode, builder: (column) => column);

  GeneratedColumn<String> get mesinCode =>
      $composableBuilder(column: $table.mesinCode, builder: (column) => column);

  GeneratedColumn<String> get jumlah =>
      $composableBuilder(column: $table.jumlah, builder: (column) => column);

  GeneratedColumn<String> get noReservasi => $composableBuilder(
    column: $table.noReservasi,
    builder: (column) => column,
  );

  GeneratedColumn<String> get nik =>
      $composableBuilder(column: $table.nik, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => column,
  );

  GeneratedColumn<String> get serverMessage => $composableBuilder(
    column: $table.serverMessage,
    builder: (column) => column,
  );

  GeneratedColumn<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => column,
  );
}

class $$PendingScansTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PendingScansTable,
          PendingScan,
          $$PendingScansTableFilterComposer,
          $$PendingScansTableOrderingComposer,
          $$PendingScansTableAnnotationComposer,
          $$PendingScansTableCreateCompanionBuilder,
          $$PendingScansTableUpdateCompanionBuilder,
          (
            PendingScan,
            BaseReferences<_$AppDatabase, $PendingScansTable, PendingScan>,
          ),
          PendingScan,
          PrefetchHooks Function()
        > {
  $$PendingScansTableTableManager(_$AppDatabase db, $PendingScansTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingScansTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingScansTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingScansTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> localId = const Value.absent(),
                Value<String> barcodeText = const Value.absent(),
                Value<String> eventCode = const Value.absent(),
                Value<String?> mesinCode = const Value.absent(),
                Value<String?> jumlah = const Value.absent(),
                Value<String?> noReservasi = const Value.absent(),
                Value<String> nik = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<String> syncStatus = const Value.absent(),
                Value<String?> serverMessage = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PendingScansCompanion(
                localId: localId,
                barcodeText: barcodeText,
                eventCode: eventCode,
                mesinCode: mesinCode,
                jumlah: jumlah,
                noReservasi: noReservasi,
                nik: nik,
                createdAt: createdAt,
                syncStatus: syncStatus,
                serverMessage: serverMessage,
                retryCount: retryCount,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String localId,
                required String barcodeText,
                required String eventCode,
                Value<String?> mesinCode = const Value.absent(),
                Value<String?> jumlah = const Value.absent(),
                Value<String?> noReservasi = const Value.absent(),
                required String nik,
                required DateTime createdAt,
                Value<String> syncStatus = const Value.absent(),
                Value<String?> serverMessage = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PendingScansCompanion.insert(
                localId: localId,
                barcodeText: barcodeText,
                eventCode: eventCode,
                mesinCode: mesinCode,
                jumlah: jumlah,
                noReservasi: noReservasi,
                nik: nik,
                createdAt: createdAt,
                syncStatus: syncStatus,
                serverMessage: serverMessage,
                retryCount: retryCount,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PendingScansTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PendingScansTable,
      PendingScan,
      $$PendingScansTableFilterComposer,
      $$PendingScansTableOrderingComposer,
      $$PendingScansTableAnnotationComposer,
      $$PendingScansTableCreateCompanionBuilder,
      $$PendingScansTableUpdateCompanionBuilder,
      (
        PendingScan,
        BaseReferences<_$AppDatabase, $PendingScansTable, PendingScan>,
      ),
      PendingScan,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$PendingScansTableTableManager get pendingScans =>
      $$PendingScansTableTableManager(_db, _db.pendingScans);
}
