import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  @override
  Widget build(BuildContext context) {
    final logs = logger.logs;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Debug Logs'),
        actions: [
          PopupMenuButton<LogLevel>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter logs',
            onSelected: (level) => logger.setMinLevel(level),
            itemBuilder: (context) => [
              const PopupMenuItem(value: LogLevel.debug, child: Text('All logs')),
              const PopupMenuItem(value: LogLevel.info, child: Text('Info & above')),
              const PopupMenuItem(value: LogLevel.warning, child: Text('Warning & above')),
              const PopupMenuItem(value: LogLevel.error, child: Text('Errors only')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.copy),
            onPressed: () {
              final text = logs.join('\n');
              Clipboard.setData(ClipboardData(text: text));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Logs copied to clipboard')),
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
          ? const Center(child: Text('No logs available'))
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
