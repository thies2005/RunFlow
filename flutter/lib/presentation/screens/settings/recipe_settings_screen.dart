import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/data/services/recipe_integration_service.dart';

class RecipeSettingsScreen extends StatefulWidget {
  const RecipeSettingsScreen({super.key});

  @override
  State<RecipeSettingsScreen> createState() => _RecipeSettingsScreenState();
}

class _RecipeSettingsScreenState extends State<RecipeSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _urlController = TextEditingController();
  final _tokenController = TextEditingController();
  
  bool _enabled = false;
  String _type = 'mealie'; // mealie or tandoor
  bool _testing = false;
  bool? _testSuccess;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final settings = await RecipeIntegrationService.instance.getSettings();
    setState(() {
      _enabled = settings['enabled'] == 'true';
      _type = settings['type'] ?? 'mealie';
      _urlController.text = settings['url'] ?? '';
      _tokenController.text = settings['token'] ?? '';
    });
  }

  @override
  void dispose() {
    _urlController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _testing = true;
      _testSuccess = null;
    });

    final success = await RecipeIntegrationService.instance.testConnection(
      _type,
      _urlController.text,
      _tokenController.text,
    );

    if (mounted) {
      setState(() {
        _testing = false;
        _testSuccess = success;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? S.of(context).settingsConnectionSuccessful : S.of(context).settingsConnectionFailed,
          ),
          backgroundColor: success ? AppColors.success : AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;

    await RecipeIntegrationService.instance.saveSettings(
      enabled: _enabled,
      type: _type,
      url: _urlController.text,
      token: _tokenController.text,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(S.of(context).settingsSavedSuccessfully),
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).settingsRecipeIntegrations),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                S.of(context).settingsConnectSelfHosted,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                S.of(context).settingsRecipeIntegrationSubtitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          S.of(context).settingsEnableIntegration,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Text(
                          S.of(context).settingsRecipeIntegrationDesc,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                        value: _enabled,
                        onChanged: (val) {
                          setState(() {
                            _enabled = val;
                          });
                        },
                      ),
                      const Divider(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              S.of(context).settingsServiceType,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          SegmentedButton<String>(
                            showSelectedIcon: false,
                            segments: const [
                              ButtonSegment(
                                value: 'mealie',
                                label: Text('Mealie'),
                              ),
                              ButtonSegment(
                                value: 'tandoor',
                                label: Text('Tandoor'),
                              ),
                            ],
                            selected: {_type},
                            onSelectionChanged: (selected) {
                              setState(() {
                                _type = selected.first;
                                _testSuccess = null;
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              if (_enabled) ...[
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          S.of(context).settingsServerCredentials,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _urlController,
                          decoration: InputDecoration(
                            labelText: S.of(context).settingsServerBaseUrl,
                            hintText: S.of(context).settingsMealieExample,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            prefixIcon: const Icon(Icons.dns),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return S.of(context).settingsEnterServerUrl;
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _tokenController,
                          obscureText: true,
                          decoration: InputDecoration(
                            labelText: S.of(context).settingsApiAccessToken,
                            hintText: S.of(context).settingsEnterApiKey,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            prefixIcon: const Icon(Icons.key),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return S.of(context).settingsEnterApiToken;
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            OutlinedButton.icon(
                              onPressed: _testing ? null : _testConnection,
                              icon: _testing
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Icon(
                                      _testSuccess == true
                                          ? Icons.check_circle
                                          : _testSuccess == false
                                              ? Icons.error
                                              : Icons.bolt,
                                      color: _testSuccess == true
                                          ? AppColors.success
                                          : _testSuccess == false
                                              ? AppColors.error
                                              : null,
                                    ),
                              label: Text(_testing ? S.of(context).settingsConnecting : S.of(context).settingsTestConnection),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saveSettings,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    backgroundColor: AppColors.primary,
                  ),
                  child: Text(
                    S.of(context).actionSave,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
