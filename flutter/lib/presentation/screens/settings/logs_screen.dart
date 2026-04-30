import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  @override
  Widget build(BuildContext context) {
    final logs = logger.logs;
    final l10n = S.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.logsTitle),
        actions: [
          PopupMenuButton<LogLevel>(
            icon: const Icon(Icons.filter_list),
            tooltip: l10n.logsFilter,
            onSelected: (level) => logger.setMinLevel(level),
            itemBuilder: (context) => [
              PopupMenuItem(value: LogLevel.debug, child: Text(S.of(context).logsAllLogs)),
              PopupMenuItem(value: LogLevel.info, child: Text(S.of(context).logsInfoAbove)),
              PopupMenuItem(value: LogLevel.warning, child: Text(S.of(context).logsWarningAbove)),
              PopupMenuItem(value: LogLevel.error, child: Text(S.of(context).logsErrorsOnly)),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.copy),
            onPressed: () {
              final text = logs.join('\n');
              Clipboard.setData(ClipboardData(text: text));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(S.of(context).logsCopied)),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: () {
              logger.clear();
              setState(() {});
            },
          ),
        ],
      ),
      body: logs.isEmpty
          ? Center(child: Text(S.of(context).logsNoLogs))
          : ListView.builder(
              itemCount: logs.length,
              itemBuilder: (context, index) {
                final log = logs[index];
                Color textColor = AppColors.onSurface;
                if (log.contains('[ERROR]')) {
                  textColor = AppColors.error;
                } else if (log.contains('[WARN]')) {
                  textColor = Colors.orange;
                } else if (log.contains('[DEBUG]')) {
                  textColor = AppColors.onSurfaceVariant;
                }
                return Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(
                    log,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: textColor,
                    ),
                  ),
                );
              },
            ),
    );
  }
}
