import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
import 'package:runflow_flutter/domain/entities/profile_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _weightController = TextEditingController();
  final _heightController = TextEditingController();
  final _hrMaxController = TextEditingController();
  final _hrRestController = TextEditingController();
  final _thresholdHrController = TextEditingController();

  Sex? _selectedSex;
  DateTime? _birthDate;
  bool _isLoading = false;
  ProviderSubscription<AsyncValue<UserProfile>>? _profileSub;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  void _loadProfile() {
    _profileSub = ref.listenManual(profileProvider, (previous, next) {
      next.whenData((profile) {
        if (mounted) {
          setState(() {
            _nameController.text = profile.name ?? '';
            _weightController.text = profile.weight?.toStringAsFixed(1) ?? '';
            _heightController.text = profile.height?.toStringAsFixed(1) ?? '';
            _hrMaxController.text = profile.hrMax?.toString() ?? '';
            _hrRestController.text = profile.hrRest?.toString() ?? '';
            _thresholdHrController.text = profile.thresholdHeartRate?.toString() ?? '';
            _selectedSex = profile.sex;
            _birthDate = profile.birthDate;
          });
        }
      });
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _profileSub?.close();
    _nameController.dispose();
    _weightController.dispose();
    _heightController.dispose();
    _hrMaxController.dispose();
    _hrRestController.dispose();
    _thresholdHrController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final request = UpdateProfileRequest(
        name: _nameController.text.trim().isNotEmpty
            ? _nameController.text.trim()
            : null,
        sex: _selectedSex,
        birthDate: _birthDate,
        weight: _weightController.text.isNotEmpty
            ? double.tryParse(_weightController.text)
            : null,
        height: _heightController.text.isNotEmpty
            ? double.tryParse(_heightController.text)
            : null,
        hrMax: _hrMaxController.text.isNotEmpty
            ? int.tryParse(_hrMaxController.text)
            : null,
        hrRest: _hrRestController.text.isNotEmpty
            ? int.tryParse(_hrRestController.text)
            : null,
        thresholdHeartRate: _thresholdHrController.text.isNotEmpty
            ? int.tryParse(_thresholdHrController.text)
            : null,
      );

      await ref.read(profileProvider.notifier).updateProfile(request);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).editProfileUpdated)),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).editProfileFailed(e.toString()))),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickBirthDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(1990),
      firstDate: DateTime(1920),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _birthDate = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).athleteEditProfile),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton(
              onPressed: _isLoading ? null : _save,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.onPrimary,
                      ),
                    )
                  : Text(S.of(context).actionSave),
            ),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: S.of(context).editProfileName,
                prefixIcon: const Icon(Icons.person_outline),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return S.of(context).editProfileNameRequired;
                if (v.trim().length < 2) return S.of(context).editProfileNameMinChars;
                return null;
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<Sex>(
              key: ValueKey(_selectedSex),
              initialValue: _selectedSex,
              decoration: InputDecoration(
                labelText: S.of(context).editProfileSex,
                prefixIcon: const Icon(Icons.wc),
              ),
              items: Sex.values.map((sex) {
                return DropdownMenuItem(
                  value: sex,
                  child: Text(sex.name[0].toUpperCase() + sex.name.substring(1)),
                );
              }).toList(),
              onChanged: (value) {
                setState(() => _selectedSex = value);
              },
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.cake_outlined),
              title: Text(
                _birthDate != null
                    ? '${_birthDate!.day}/${_birthDate!.month}/${_birthDate!.year}'
                    : S.of(context).editProfileSelectBirthDate,
                style: theme.textTheme.bodyMedium,
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: _pickBirthDate,
            ),
            const Divider(),
            const SizedBox(height: 8),
            Text(
              S.of(context).editProfileBodyMetrics,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _weightController,
              decoration: InputDecoration(
                labelText: S.of(context).editProfileWeightKg,
                prefixIcon: const Icon(Icons.monitor_weight_outlined),
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                if (v == null || v.isEmpty) return null;
                final val = double.tryParse(v);
                if (val == null) return S.of(context).editProfileEnterValidNumber;
                if (val <= 0 || val > 500) return S.of(context).editProfileEnterValidWeight;
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _heightController,
              decoration: InputDecoration(
                labelText: S.of(context).editProfileHeightCm,
                prefixIcon: const Icon(Icons.height),
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                if (v == null || v.isEmpty) return null;
                final val = double.tryParse(v);
                if (val == null) return S.of(context).editProfileEnterValidNumber;
                if (val < 50 || val > 300) return S.of(context).editProfileEnterValidHeight;
                return null;
              },
            ),
            const SizedBox(height: 24),
            Text(
              S.of(context).editProfileHeartRate,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _hrMaxController,
              decoration: InputDecoration(
                labelText: S.of(context).editProfileMaxHr,
                prefixIcon: const Icon(Icons.favorite_outline),
              ),
              keyboardType: TextInputType.number,
              validator: (v) {
                if (v == null || v.isEmpty) return null;
                final val = int.tryParse(v);
                if (val == null) return S.of(context).editProfileEnterValidNumber;
                if (val < 30 || val > 250) return S.of(context).editProfileEnterValidHr(30, 250);
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _hrRestController,
              decoration: InputDecoration(
                labelText: S.of(context).editProfileRestingHr,
                prefixIcon: const Icon(Icons.favorite_border),
              ),
              keyboardType: TextInputType.number,
              validator: (v) {
                if (v == null || v.isEmpty) return null;
                final val = int.tryParse(v);
                if (val == null) return S.of(context).editProfileEnterValidNumber;
                if (val < 20 || val > 150) return S.of(context).editProfileEnterValidHr(20, 150);
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _thresholdHrController,
              decoration: InputDecoration(
                labelText: S.of(context).editProfileThresholdHr,
                prefixIcon: const Icon(Icons.monitor_heart_outlined),
              ),
              keyboardType: TextInputType.number,
              validator: (v) {
                if (v == null || v.isEmpty) return null;
                final val = int.tryParse(v);
                if (val == null) return S.of(context).editProfileEnterValidNumber;
                if (val < 30 || val > 250) return S.of(context).editProfileEnterValidHr(30, 250);
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }
}
