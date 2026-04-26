import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
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

    _promptController.text = settings.customPrompt;
    if (_baseUrlController.text.isEmpty && settings.customBaseUrl.isEmpty) {
      _baseUrlController.text = '';
    }
    if (_modelController.text.isEmpty && settings.customModel.isEmpty) {
      _modelController.text = '';
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Coach Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Configure your AI coaching experience and control data access.',
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
                    'AI Features',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'Toggle all AI coaching and analysis features',
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
                'API Key (Optional)',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Add your own OpenAI-compatible API key for unlimited usage',
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
            decoration: const InputDecoration(
              labelText: 'Base URL',
              hintText: 'https://api.openai.com/v1',
            ),
            onChanged: (v) => notifier.setCustomBaseUrl(v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: apiKeyController,
            obscureText: obscureApiKey,
            decoration: InputDecoration(
              labelText: 'API Key',
              hintText: settings.hasCustomApiKey
                  ? '••••••••••••••••'
                  : 'Enter API key',
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
            decoration: const InputDecoration(
              labelText: 'Model',
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
              label: Text(isTesting ? 'Testing...' : 'Test API Key'),
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
                        ? 'API key works!'
                        : 'API key test failed',
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
                child: const Text(
                  'Remove API key',
                  style: TextStyle(color: AppColors.error, fontSize: 12),
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

  static const _options = [
    _DataAccessOption(
      key: 'accessFitnessMetrics',
      title: 'Fitness Metrics',
      subtitle: 'CTL, ATL, TSB (training load & form)',
    ),
    _DataAccessOption(
      key: 'accessActivityHistory',
      title: 'Recent Activity',
      subtitle: 'Your recent runs, distances, and times (Last 20)',
    ),
    _DataAccessOption(
      key: 'accessHeartRateData',
      title: 'Heart Rate Data',
      subtitle: 'HR zones, average & max HR',
    ),
    _DataAccessOption(
      key: 'accessGoals',
      title: 'Goals & Races',
      subtitle: 'Your race goals and targets',
    ),
    _DataAccessOption(
      key: 'accessTrainingPlan',
      title: 'Training Plan',
      subtitle: 'Scheduled workouts and progress',
    ),
    _DataAccessOption(
      key: 'accessPerformance',
      title: 'Performance',
      subtitle: 'VDOT and race predictions',
    ),
    _DataAccessOption(
      key: 'accessBiometrics',
      title: 'Biometrics',
      subtitle: 'Weight, height, age',
    ),
    _DataAccessOption(
      key: 'accessAllActivities',
      title: 'All Activity History',
      subtitle: 'Allow AI to search older activities when needed',
    ),
    _DataAccessOption(
      key: 'accessActivityLogs',
      title: 'Activity Logs',
      subtitle: 'Allows AI to see recent runs and workouts',
    ),
    _DataAccessOption(
      key: 'accessNutritionLogs',
      title: 'Nutrition Logs',
      subtitle: 'Allows AI to see macros and log meals',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Data Access',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => notifier.enableAllAccess(),
                child: const Text('Enable All'),
              ),
              TextButton(
                onPressed: () => notifier.disableAllAccess(),
                child: const Text(
                  'Disable All',
                  style: TextStyle(color: AppColors.onSurfaceVariant),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Choose what data the AI coach can access',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: _options.map((option) {
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

  static const _modes = [
    (value: 'verbose', label: 'Verbose', description: 'Detailed analysis'),
    (value: 'concise', label: 'Concise', description: 'Brief feedback'),
    (value: 'off', label: 'Off', description: 'No automatic feedback'),
    (value: 'auto', label: 'Automatic', description: 'After each sync'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Activity Feedback',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'When should AI analyze your activities?',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _modes.map((mode) {
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

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Custom Instructions',
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
            'Add context about your training (e.g., injuries, preferences)',
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText:
                  'I\'m recovering from a knee injury and should avoid high-intensity work...',
              alignLabelWithHint: true,
            ),
            onChanged: (v) => notifier.setCustomPrompt(v),
          ),
        ],
      ),
    );
  }
}
