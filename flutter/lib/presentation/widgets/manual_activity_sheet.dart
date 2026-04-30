import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

class ManualActivitySheet extends ConsumerStatefulWidget {
  const ManualActivitySheet({super.key});

  @override
  ConsumerState<ManualActivitySheet> createState() =>
      _ManualActivitySheetState();
}

class _ManualActivitySheetState extends ConsumerState<ManualActivitySheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _distanceController = TextEditingController();
  final _durationController = TextEditingController();
  final _hrController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  ActivityType _selectedType = ActivityType.run;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _distanceController.dispose();
    _durationController.dispose();
    _hrController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null && mounted) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_selectedDate),
      );
      if (time != null) {
        setState(() {
          _selectedDate = DateTime(
            picked.year,
            picked.month,
            picked.day,
            time.hour,
            time.minute,
          );
        });
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await ref.read(activitiesProvider.notifier).addManualActivity(
            name: _nameController.text.trim(),
            date: _selectedDate,
            type: _selectedType.name.toUpperCase(),
            distance: double.parse(_distanceController.text),
            duration: int.parse(_durationController.text),
            hr: _hrController.text.isNotEmpty
                ? double.tryParse(_hrController.text)
                : null,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Activity saved')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = 'Failed to create activity. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Text(
                    'Manual Entry',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppColors.error.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.error,
                    ),
                  ),
                ),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Morning Run',
                ),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _pickDate,
                      borderRadius: BorderRadius.circular(12),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Date & Time',
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 16),
                            const SizedBox(width: 8),
                            Text(
                              '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year} ${_selectedDate.hour}:${_selectedDate.minute.toString().padLeft(2, '0')}',
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<ActivityType>(
                      initialValue: _selectedType,
                      decoration: const InputDecoration(labelText: 'Type'),
                      items: ActivityType.values
                          .map(
                            (t) => DropdownMenuItem(
                              value: t,
                              child: Row(
                                children: [
                                  Icon(activityTypeIcon(t), size: 16),
                                  const SizedBox(width: 8),
                                  Text(activityTypeLabel(t)),
                                ],
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _selectedType = v);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _distanceController,
                      decoration: const InputDecoration(
                        labelText: 'Distance (km)',
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Required';
                        if (double.tryParse(v) == null) return 'Invalid';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _durationController,
                      decoration: const InputDecoration(
                        labelText: 'Duration (min)',
                      ),
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Required';
                        if (int.tryParse(v) == null) return 'Invalid';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _hrController,
                      decoration: const InputDecoration(
                        labelText: 'HR (avg)',
                        hintText: 'Optional',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _isSubmitting ? null : _submit,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Save Activity'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
