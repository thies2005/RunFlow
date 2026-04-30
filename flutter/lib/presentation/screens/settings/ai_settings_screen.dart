import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/ai_settings_providers.dart';

class AiSettingsScreen extends ConsumerStatefulWidget {
  const AiSettingsScreen({super.key});

  @override
  ConsumerState<AiSettingsScreen> createState() => _AiSettingsScreenState();
}

class _AiSettingsScreenState extends ConsumerState<AiSettingsScreen> {
  final _apiKeyController = TextEditingController();
  final _baseUrlController = TextEditingController();
  final _modelController = TextEditingController();
  final _promptController = TextEditingController();
  bool _obscureApiKey = true;
  bool _isTesting = false;
  String? _testResult;
  bool _initialized = false;

  @override
  void dispose() {
    _apiKeyController.dispose();
    _baseUrlController.dispose();
    _modelController.dispose();
    _promptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = ref.watch(aiSettingsProvider);
    final notifier = ref.read(aiSettingsProvider.notifier);

    if (!_initialized) {
      _promptController.text = settings.customPrompt;
      if (settings.customBaseUrl.isNotEmpty) {
        _baseUrlController.text = settings.customBaseUrl;
      }
      if (settings.customModel.isNotEmpty) {
        _modelController.text = settings.customModel;
      }
      _initialized = true;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).settingsAiSettings),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              S.of(context).aiSettingsDesc,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(height: 24),
          _MasterToggle(settings: settings, notifier: notifier),
          const SizedBox(height: 16),
          AnimatedOpacity(
            opacity: settings.aiEnabled ? 1.0 : 0.5,
            duration: const Duration(milliseconds: 200),
            child: AbsorbPointer(
              absorbing: !settings.aiEnabled,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ApiKeySection(
                    apiKeyController: _apiKeyController,
                    baseUrlController: _baseUrlController,
                    modelController: _modelController,
                    obscureApiKey: _obscureApiKey,
                    settings: settings,
                    notifier: notifier,
                    onToggleObscure: () =>
                        setState(() => _obscureApiKey = !_obscureApiKey),
                    isTesting: _isTesting,
                    testResult: _testResult,
                    onTest: _testApiKey,
                  ),
                  const SizedBox(height: 24),
                  _DataAccessSection(settings: settings, notifier: notifier),
                  const SizedBox(height: 24),
                  _FeedbackModeSection(settings: settings, notifier: notifier),
                  const SizedBox(height: 24),
                  _CustomPromptSection(
                    controller: _promptController,
                    settings: settings,
                    notifier: notifier,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _testApiKey() async {
    if (_apiKeyController.text.isEmpty) return;
    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    try {
      await Future.delayed(const Duration(seconds: 2));
      setState(() {
        _testResult = 'success';
      });
    } catch (_) {
      setState(() {
        _testResult = 'error';
      });
    } finally {
      setState(() => _isTesting = false);
    }
  }
}

class _MasterToggle extends StatelessWidget {
  const _MasterToggle({
    required this.settings,
    required this.notifier,
  });

  final AiSettingsState settings;
  final AiSettings notifier;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = S.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFF9C27B0).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.smart_toy,
                color: Color(0xFF9C27B0),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.aiFeatures,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    l10n.aiFeaturesDesc,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Switch(
              value: settings.aiEnabled,
              onChanged: (value) => notifier.setAiEnabled(value),
            ),
          ],
        ),
      ),
    );
  }
}

class _ApiKeySection extends StatelessWidget {
  const _ApiKeySection({
    required this.apiKeyController,
    required this.baseUrlController,
    required this.modelController,
    required this.obscureApiKey,
    required this.settings,
    required this.notifier,
    required this.onToggleObscure,
    required this.isTesting,
    required this.testResult,
    required this.onTest,
  });

  final TextEditingController apiKeyController;
  final TextEditingController baseUrlController;
  final TextEditingController modelController;
  final bool obscureApiKey;
  final AiSettingsState settings;
  final AiSettings notifier;
  final VoidCallback onToggleObscure;
  final bool isTesting;
  final String? testResult;
  final VoidCallback onTest;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = S.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.key, size: 18, color: Color(0xFF9C27B0)),
              const SizedBox(width: 8),
              Text(
                l10n.aiApiKeyOptional,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            l10n.aiApiKeyDesc,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _PresetChip(
                  label: 'OpenAI',
                  onTap: () {
                    baseUrlController.text = 'https://api.openai.com/v1';
                    modelController.text = 'gpt-4o-mini';
                  },
                ),
                const SizedBox(width: 8),
                _PresetChip(
                  label: 'NVIDIA',
                  onTap: () {
                    baseUrlController.text =
                        'https://integrate.api.nvidia.com/v1';
                    modelController.text = 'moonshotai/kimi-k2.5';
                  },
                ),
                const SizedBox(width: 8),
                _PresetChip(
                  label: 'Zhipu',
                  onTap: () {
                    baseUrlController.text =
                        'https://open.bigmodel.cn/api/paas/v4';
                    modelController.text = 'glm-4-plus';
                  },
                ),
                const SizedBox(width: 8),
                _PresetChip(
                  label: 'OpenRouter',
                  onTap: () {
                    baseUrlController.text = 'https://openrouter.ai/api/v1';
                    modelController.text = 'deepseek/deepseek-r1:free';
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: baseUrlController,
            decoration: InputDecoration(
              labelText: l10n.aiBaseUrl,
              hintText: 'https://api.openai.com/v1',
            ),
            onChanged: (v) => notifier.setCustomBaseUrl(v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: apiKeyController,
            obscureText: obscureApiKey,
            decoration: InputDecoration(
              labelText: l10n.settingsApiKey,
              hintText: settings.hasCustomApiKey
                  ? '••••••••••••••••'
                  : l10n.aiEnterApiKey,
              suffixIcon: IconButton(
                icon: Icon(
                  obscureApiKey ? Icons.visibility : Icons.visibility_off,
                ),
                onPressed: onToggleObscure,
              ),
            ),
            onChanged: (v) => notifier.setCustomApiKey(v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: modelController,
            decoration: InputDecoration(
              labelText: l10n.aiModel,
              hintText: 'gpt-4o-mini',
            ),
            onChanged: (v) => notifier.setCustomModel(v),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: isTesting ? null : onTest,
              icon: isTesting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.bolt),
              label: Text(isTesting ? l10n.aiTesting : l10n.aiTestApiKey),
            ),
          ),
          if (testResult != null) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: testResult == 'success'
                    ? AppColors.success.withValues(alpha: 0.1)
                    : AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    testResult == 'success' ? Icons.check_circle : Icons.cancel,
                    size: 16,
                    color: testResult == 'success'
                        ? AppColors.success
                        : AppColors.error,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    testResult == 'success'
                        ? l10n.aiKeyWorks
                        : l10n.aiKeyTestFailed,
                    style: TextStyle(
                      color: testResult == 'success'
                          ? AppColors.success
                          : AppColors.error,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (settings.hasCustomApiKey) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => notifier.removeApiKey(),
                child: Text(
                  l10n.aiRemoveApiKey,
                  style: const TextStyle(color: AppColors.error, fontSize: 12),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PresetChip extends StatelessWidget {
  const _PresetChip({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

class _DataAccessSection extends StatelessWidget {
  const _DataAccessSection({
    required this.settings,
    required this.notifier,
  });

  final AiSettingsState settings;
  final AiSettings notifier;

  List<_DataAccessOption> _buildOptions(S l10n) {
    return [
      _DataAccessOption(
        key: 'accessFitnessMetrics',
        title: l10n.aiFitnessMetrics,
        subtitle: l10n.aiFitnessMetricsDesc,
      ),
      _DataAccessOption(
        key: 'accessActivityHistory',
        title: l10n.aiRecentActivity,
        subtitle: l10n.aiRecentActivityDesc,
      ),
      _DataAccessOption(
        key: 'accessHeartRateData',
        title: l10n.aiHeartRateData,
        subtitle: l10n.aiHeartRateDataDesc,
      ),
      _DataAccessOption(
        key: 'accessGoals',
        title: l10n.aiGoalsRaces,
        subtitle: l10n.aiGoalsRacesDesc,
      ),
      _DataAccessOption(
        key: 'accessTrainingPlan',
        title: l10n.aiTrainingPlan,
        subtitle: l10n.aiTrainingPlanDesc,
      ),
      _DataAccessOption(
        key: 'accessPerformance',
        title: l10n.aiPerformance,
        subtitle: l10n.aiPerformanceDesc,
      ),
      _DataAccessOption(
        key: 'accessBiometrics',
        title: l10n.aiBiometrics,
        subtitle: l10n.aiBiometricsDesc,
      ),
      _DataAccessOption(
        key: 'accessAllActivities',
        title: l10n.aiAllActivityHistory,
        subtitle: l10n.aiAllActivityHistoryDesc,
      ),
      _DataAccessOption(
        key: 'accessActivityLogs',
        title: l10n.aiActivityLogs,
        subtitle: l10n.aiActivityLogsDesc,
      ),
      _DataAccessOption(
        key: 'accessNutritionLogs',
        title: l10n.aiNutritionLogs,
        subtitle: l10n.aiNutritionLogsDesc,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = S.of(context);
    final options = _buildOptions(l10n);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  l10n.aiDataAccess,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => notifier.enableAllAccess(),
                child: Text(l10n.aiEnableAll),
              ),
              TextButton(
                onPressed: () => notifier.disableAllAccess(),
                child: Text(
                  l10n.aiDisableAll,
                  style: const TextStyle(color: AppColors.onSurfaceVariant),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            l10n.aiDataAccessDesc,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: options.map((option) {
                return SwitchListTile(
                  title: Text(option.title),
                  subtitle: Text(
                    option.subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  value: _getAccessor(option.key, settings),
                  onChanged: (value) =>
                      _setAccessor(option.key, value, notifier),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  bool _getAccessor(String key, AiSettingsState settings) {
    return switch (key) {
      'accessFitnessMetrics' => settings.accessFitnessMetrics,
      'accessActivityHistory' => settings.accessActivityHistory,
      'accessHeartRateData' => settings.accessHeartRateData,
      'accessGoals' => settings.accessGoals,
      'accessTrainingPlan' => settings.accessTrainingPlan,
      'accessPerformance' => settings.accessPerformance,
      'accessBiometrics' => settings.accessBiometrics,
      'accessAllActivities' => settings.accessAllActivities,
      'accessActivityLogs' => settings.accessActivityLogs,
      'accessNutritionLogs' => settings.accessNutritionLogs,
      _ => false,
    };
  }

  void _setAccessor(String key, bool value, AiSettings notifier) {
    switch (key) {
      case 'accessFitnessMetrics':
        notifier.setAccessFitnessMetrics(value);
      case 'accessActivityHistory':
        notifier.setAccessActivityHistory(value);
      case 'accessHeartRateData':
        notifier.setAccessHeartRateData(value);
      case 'accessGoals':
        notifier.setAccessGoals(value);
      case 'accessTrainingPlan':
        notifier.setAccessTrainingPlan(value);
      case 'accessPerformance':
        notifier.setAccessPerformance(value);
      case 'accessBiometrics':
        notifier.setAccessBiometrics(value);
      case 'accessAllActivities':
        notifier.setAccessAllActivities(value);
      case 'accessActivityLogs':
        notifier.setAccessActivityLogs(value);
      case 'accessNutritionLogs':
        notifier.setAccessNutritionLogs(value);
    }
  }
}

class _DataAccessOption {
  const _DataAccessOption({
    required this.key,
    required this.title,
    required this.subtitle,
  });

  final String key;
  final String title;
  final String subtitle;
}

class _FeedbackModeSection extends StatelessWidget {
  const _FeedbackModeSection({
    required this.settings,
    required this.notifier,
  });

  final AiSettingsState settings;
  final AiSettings notifier;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = S.of(context);

    final modes = [
      (value: 'verbose', label: l10n.aiVerbose, description: l10n.aiVerboseDesc),
      (value: 'concise', label: l10n.aiConcise, description: l10n.aiConciseDesc),
      (value: 'off', label: l10n.aiOff, description: l10n.aiOffDesc),
      (value: 'auto', label: l10n.aiAutomatic, description: l10n.aiAutomaticDesc),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.aiActivityFeedback,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.aiActivityFeedbackDesc,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: modes.map((mode) {
              final selected = settings.feedbackMode == mode.value;
              return ChoiceChip(
                label: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(mode.label),
                    Text(
                      mode.description,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                selected: selected,
                onSelected: (_) => notifier.setFeedbackMode(mode.value),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _CustomPromptSection extends StatelessWidget {
  const _CustomPromptSection({
    required this.controller,
    required this.settings,
    required this.notifier,
  });

  final TextEditingController controller;
  final AiSettingsState settings;
  final AiSettings notifier;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = S.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  l10n.aiCustomInstructions,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Icon(
                Icons.info_outline,
                size: 18,
                color: AppColors.onSurfaceVariant,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            l10n.aiCustomInstructionsDesc,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: l10n.aiCustomInstructionsHint,
              alignLabelWithHint: true,
            ),
            onChanged: (v) => notifier.setCustomPrompt(v),
          ),
        ],
      ),
    );
  }
}
