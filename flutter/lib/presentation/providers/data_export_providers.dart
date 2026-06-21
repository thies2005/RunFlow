import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:share_plus/share_plus.dart';

part 'data_export_providers.g.dart';

@riverpod
class DataExport extends _$DataExport {
  @override
  DataExportState build() {
    return const DataExportState();
  }

  Future<void> exportData() async {
    state = const DataExportState(isExporting: true);
    try {
      final client = ref.read(dioClientProvider);
      final response = await client.dio.get(ApiConstants.userExportUrl);
      final data = response.data;

      final jsonString = const JsonEncoder.withIndent('  ').convert(data);
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final file = File('${directory.path}/runflow_export_$timestamp.json');
      await file.writeAsString(jsonString);

      await SharePlus.instance.share(ShareParams(
        files: [XFile(file.path)],
        subject: 'RunFlow Data Export',
      ));

      state = const DataExportState(isExporting: false, exportSuccess: true);
    } catch (e) {
      state = DataExportState(
        isExporting: false,
        error: e.toString(),
      );
    }
  }
}

class DataExportState {
  const DataExportState({
    this.isExporting = false,
    this.exportSuccess = false,
    this.error,
  });

  final bool isExporting;
  final bool exportSuccess;
  final String? error;

  DataExportState copyWith({
    bool? isExporting,
    bool? exportSuccess,
    String? error,
  }) {
    return DataExportState(
      isExporting: isExporting ?? this.isExporting,
      exportSuccess: exportSuccess ?? this.exportSuccess,
      error: error ?? this.error,
    );
  }
}
