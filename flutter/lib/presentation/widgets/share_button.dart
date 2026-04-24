import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/share_formatter.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:share_plus/share_plus.dart';

class ShareButton extends StatelessWidget {
  const ShareButton({required this.activity, super.key});

  final Activity activity;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.share),
      color: AppColors.primary,
      onPressed: () {
        final text = formatShareText(activity);
        SharePlus.instance.share(
          ShareParams(text: text),
        );
      },
    );
  }
}
