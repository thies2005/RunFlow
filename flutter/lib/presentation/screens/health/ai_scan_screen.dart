import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';

class AiScanScreen extends ConsumerStatefulWidget {
  const AiScanScreen({super.key});

  @override
  ConsumerState<AiScanScreen> createState() => _AiScanScreenState();
}

class _AiScanScreenState extends ConsumerState<AiScanScreen> {
  final _imagePicker = ImagePicker();
  final _contextController = TextEditingController();
  String? _imagePath;
  bool _scanning = false;
  double _portionMultiplier = 1.0;
  FoodItem? _baseResult;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _showSourcePicker();
    });
  }

  @override
  void dispose() {
    _contextController.dispose();
    super.dispose();
  }

  Future<void> _showSourcePicker() async {
    final theme = Theme.of(context);
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.auto_awesome, size: 48, color: AppColors.primary),
            const SizedBox(height: 16),
            Text(S.of(context).healthAiFoodScan, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(S.of(context).aiScanChooseImage,
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 16),
            // Additional context text field
            TextField(
              controller: _contextController,
              decoration: InputDecoration(
                hintText: 'Add details (e.g. "2 eggs, side of toast")',
                hintStyle: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
                prefixIcon: const Icon(Icons.edit_note, size: 20),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                isDense: true,
              ),
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(ctx, ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Gallery'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => Navigator.pop(ctx, ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Camera'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );

    if (source != null) {
      unawaited(_pickImage(source));
    } else {
      if (mounted && _imagePath == null) {
        context.pop();
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    final file = await _imagePicker.pickImage(source: source);
    if (file != null) {
      setState(() {
        _imagePath = file.path;
        _scanning = true;
        _portionMultiplier = 1.0;
        _baseResult = null;
      });
      unawaited(_scanImage(file.path));
    } else {
      if (mounted && _imagePath == null) {
        context.pop();
      }
    }
  }

  Future<void> _scanImage(String path) async {
    try {
      final contextText = _contextController.text.trim();
      await ref.read(aiScanProvider.notifier).scanImage(
        path,
        context: contextText.isNotEmpty ? contextText : null,
      );
      if (mounted) {
        final result = ref.read(aiScanProvider).value;
        setState(() {
          _scanning = false;
          _baseResult = result;
          _portionMultiplier = 1.0;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _scanning = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).aiScanFailed)),
        );
      }
    }
  }

  FoodItem? get _scaledResult {
    if (_baseResult == null) return null;
    if (_portionMultiplier == 1.0) return _baseResult;
    return _baseResult!.copyWith(
      calories: _baseResult!.calories * _portionMultiplier,
      protein: _baseResult!.protein * _portionMultiplier,
      carbs: _baseResult!.carbs * _portionMultiplier,
      fat: _baseResult!.fat * _portionMultiplier,
      servingSize: _baseResult!.servingSize * _portionMultiplier,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final asyncState = ref.watch(aiScanProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).healthAiFoodScan),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.photo_camera),
            onPressed: _showSourcePicker,
          ),
        ],
      ),
      body: _scanning
          ? _buildLoadingState()
          : asyncState.when(
              data: (item) {
                final scaled = _scaledResult;
                if (scaled != null) return _buildResultArea(theme, scaled);
                if (_imagePath != null) return _buildNotFound(theme);
                return const SizedBox.shrink();
              },
              loading: () => _buildLoadingState(),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('${S.of(context).actionError}: $err', style: const TextStyle(color: AppColors.error)),
                ),
              ),
            ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(S.of(context).aiScanAnalyzing, style: const TextStyle(color: AppColors.onSurfaceVariant)),
          if (_contextController.text.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'With context: "${_contextController.text.trim()}"',
              style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildNotFound(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off, size: 48, color: AppColors.warning),
            const SizedBox(height: 12),
            Text(S.of(context).aiScanNotFound, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(S.of(context).aiScanNotFoundMessage,
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(onPressed: _showSourcePicker, child: Text(S.of(context).actionRetry)),
                const SizedBox(width: 12),
                FilledButton(onPressed: () => context.pop(), child: Text(S.of(context).actionCancel)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultArea(ThemeData theme, FoodItem food) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image preview
          if (_imagePath != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                height: 180,
                width: double.infinity,
                child: Image.file(
                  File(_imagePath!),
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: theme.colorScheme.surfaceContainerHighest,
                    child: const Icon(Icons.image, size: 48, color: AppColors.onSurfaceVariant),
                  ),
                ),
              ),
            ),
          if (_imagePath != null) const SizedBox(height: 16),
          Text(food.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(S.of(context).aiScanServing(food.servingSize.toStringAsFixed(0)), style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 20),

          // Portion size slider
          _PortionSlider(
            multiplier: _portionMultiplier,
            onChanged: (value) {
              setState(() {
                _portionMultiplier = value;
              });
            },
          ),

          const SizedBox(height: 20),
          Text(S.of(context).aiScanNutritionFacts, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _MacroBox(label: S.of(context).nutritionCaloriesKcal, value: food.calories, color: AppColors.primary)),
              const SizedBox(width: 8),
              Expanded(child: _MacroBox(label: S.of(context).nutritionProteinG, value: food.protein, color: AppColors.peaked)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _MacroBox(label: S.of(context).nutritionCarbs, value: food.carbs, color: AppColors.warning)),
              const SizedBox(width: 8),
              Expanded(child: _MacroBox(label: S.of(context).nutritionFatLabel, value: food.fat, color: AppColors.error)),
            ],
          ),

          // Additional context display
          if (_contextController.text.trim().isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.edit_note, size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _contextController.text.trim(),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(_scaledResult),
              child: Text(S.of(context).nutritionAddFood),
            ),
          ),
        ],
      ),
    );
  }
}

class _PortionSlider extends StatelessWidget {
  const _PortionSlider({
    required this.multiplier,
    required this.onChanged,
  });

  final double multiplier;
  final ValueChanged<double> onChanged;

  String _portionLabel(double value) {
    if (value <= 0.25) return '¼';
    if (value <= 0.5) return '½';
    if (value <= 0.75) return '¾';
    if (value <= 1.0) return '1';
    if (value <= 1.5) return '1½';
    if (value <= 2.0) return '2';
    if (value <= 2.5) return '2½';
    return '3';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.tune, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'Portion Size',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${_portionLabel(multiplier)} serving${multiplier > 1.0 ? 's' : ''}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '¼',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Expanded(
                child: SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: AppColors.primary,
                    inactiveTrackColor: AppColors.primary.withValues(alpha: 0.15),
                    thumbColor: AppColors.primary,
                    overlayColor: AppColors.primary.withValues(alpha: 0.12),
                    trackHeight: 4,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                  ),
                  child: Slider(
                    value: multiplier,
                    min: 0.25,
                    max: 3.0,
                    divisions: 11,
                    onChanged: onChanged,
                  ),
                ),
              ),
              Text(
                '3',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          // Quick-select chips
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [0.5, 1.0, 1.5, 2.0].map((v) {
              final selected = (multiplier - v).abs() < 0.01;
              return ChoiceChip(
                label: Text('${v == v.roundToDouble() ? v.toInt().toString() : v.toString()}×'),
                selected: selected,
                onSelected: (_) => onChanged(v),
                labelStyle: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : AppColors.onSurfaceVariant,
                ),
                selectedColor: AppColors.primary,
                backgroundColor: theme.colorScheme.surfaceContainerHigh,
                side: BorderSide.none,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 4),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _MacroBox extends StatelessWidget {
  const _MacroBox({required this.label, required this.value, required this.color});
  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value.toStringAsFixed(value == value.roundToDouble() ? 0 : 1),
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 4),
          Text(label, style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant)),
        ],
      ),
    );
  }
}
