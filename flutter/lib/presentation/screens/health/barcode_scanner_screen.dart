import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() =>
      _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  bool _hasScanned = false;
  bool _permissionDenied = false;

  @override
  void initState() {
    super.initState();
    _checkPermission();
  }

  Future<void> _checkPermission() async {
    try {
      await _scannerController.start();
    } on MobileScannerException catch (e) {
      if (e.errorCode == MobileScannerErrorCode.permissionDenied) {
        setState(() {
          _permissionDenied = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_hasScanned) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    setState(() {
      _hasScanned = true;
    });
    _scannerController.stop();

    ref
        .read(barcodeScanProvider.notifier)
        .scan(barcode.rawValue!);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scanState = ref.watch(barcodeScanProvider);

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) {
          _scannerController.stop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Scan Barcode'),
          leading: IconButton(
            tooltip: 'Close',
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: _permissionDenied
            ? _buildPermissionDenied(theme)
            : Column(
                children: [
                  Expanded(
                    flex: 3,
                    child: Stack(
                      children: [
                        MobileScanner(
                          controller: _scannerController,
                          onDetect: _onBarcodeDetected,
                        ),
                        _buildScanOverlay(),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: _buildResultArea(theme, scanState),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildScanOverlay() {
    return Container(
      decoration: ShapeDecoration(
        shape: ScannerOverlayShape(),
      ),
    );
  }

  Widget _buildPermissionDenied(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.videocam_off,
              size: 64,
              color: AppColors.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'Camera Permission Required',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Please grant camera permission to scan barcodes.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {
                _scannerController.start();
              },
              icon: const Icon(Icons.settings),
              label: const Text('Open Settings'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultArea(ThemeData theme, AsyncValue<FoodItem?> scanState) {
    return scanState.when(
      data: (food) {
        if (!_hasScanned) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.qr_code_scanner,
                  size: 48,
                  color: AppColors.onSurfaceVariant,
                ),
                const SizedBox(height: 12),
                Text(
                  'Point camera at a barcode',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          );
        }
        if (food == null) {
          return _buildNotFound(theme);
        }
        return _buildFoodResult(theme, food);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => _buildError(theme, e),
    );
  }

  Widget _buildNotFound(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.search_off,
              size: 48,
              color: AppColors.warning,
            ),
            const SizedBox(height: 12),
            Text(
              'Barcode Not Found',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This barcode is not in our database. Try adding the food manually.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  onPressed: _resetScanner,
                  child: const Text('Scan Again'),
                ),
                const SizedBox(width: 12),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Add Manually'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFoodResult(ThemeData theme, FoodItem food) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            food.name,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          if (food.barcode != null) ...[
            const SizedBox(height: 4),
            Text(
              'Barcode: ${food.barcode}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
          const SizedBox(height: 4),
          Text(
            'Serving: ${food.servingSize.toStringAsFixed(0)}g',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NutrientChip(label: 'Cal', value: food.calories, color: AppColors.primary),
              _NutrientChip(label: 'Protein', value: food.protein, color: AppColors.success),
              _NutrientChip(label: 'Carbs', value: food.carbs, color: AppColors.warning),
              _NutrientChip(label: 'Fat', value: food.fat, color: AppColors.fatigued),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _resetScanner,
                  child: const Text('Scan Again'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _addToNutritionLog(food),
                  icon: const Icon(Icons.add),
                  label: const Text('Add to Log'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildError(ThemeData theme, Object error) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.wifi_off,
            size: 48,
            color: AppColors.error,
          ),
          const SizedBox(height: 12),
          Text(
            'Network Error',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Could not look up this barcode. Check your connection and try again.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _resetScanner,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  void _resetScanner() {
    setState(() {
      _hasScanned = false;
    });
    ref.read(barcodeScanProvider.notifier).reset();
    _scannerController.start();
  }

  void _addToNutritionLog(FoodItem food) {
    final today = DateTime.now();
    final asyncLog = ref.read(nutritionProvider(today));
    NutritionLog? currentLog;
    asyncLog.whenData((log) => currentLog = log);
    if (currentLog == null) return;
    final log = currentLog!;

    final updated = log.copyWith(
      calories: log.calories + food.calories,
      protein: log.protein + food.protein,
      carbs: log.carbs + food.carbs,
      fat: log.fat + food.fat,
    );
    ref.read(nutritionProvider(today).notifier).save(updated);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added ${food.name} to nutrition log'),
        behavior: SnackBarBehavior.floating,
      ),
    );
    Navigator.of(context).pop();
  }
}

class _NutrientChip extends StatelessWidget {
  const _NutrientChip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            value.toStringAsFixed(value == value.roundToDouble() ? 0 : 1),
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class ScannerOverlayShape extends ShapeBorder {
  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()..addRect(rect);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    final cutOutSize = rect.shortestSide * 0.7;
    final cx = rect.center.dx;
    final cy = rect.center.dy;
    return Path()
      ..addRect(rect)
      ..addRRect(RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, cy), width: cutOutSize, height: cutOutSize * 0.5),
        const Radius.circular(12),
      ))
      ..fillType = PathFillType.evenOdd;
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final cutOutSize = rect.shortestSide * 0.7;
    final cx = rect.center.dx;
    final cy = rect.center.dy;
    final cutOutRect = Rect.fromCenter(
      center: Offset(cx, cy),
      width: cutOutSize,
      height: cutOutSize * 0.5,
    );

    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.6)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..addRect(rect)
      ..addRRect(RRect.fromRectAndRadius(cutOutRect, const Radius.circular(12)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);

    final borderPaint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    canvas.drawRRect(
      RRect.fromRectAndRadius(cutOutRect, const Radius.circular(12)),
      borderPaint,
    );
  }

  @override
  ShapeBorder scale(double t) => this;
}
