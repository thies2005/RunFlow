import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/screens/health/nutrition_tab.dart';
import 'package:runflow_flutter/presentation/screens/health/supplements_tab.dart';
import 'package:runflow_flutter/presentation/screens/health/fasting_tab.dart';
import 'package:runflow_flutter/presentation/screens/health/body_tab.dart';

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Health'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.onSurfaceVariant,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(icon: Icon(Icons.restaurant_outlined), text: 'Nutrition'),
            Tab(icon: Icon(Icons.medication_outlined), text: 'Supplements'),
            Tab(icon: Icon(Icons.timer_outlined), text: 'Fasting'),
            Tab(icon: Icon(Icons.monitor_weight_outlined), text: 'Body'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          NutritionTab(),
          SupplementsTab(),
          FastingTab(),
          BodyTab(),
        ],
      ),
    );
  }
}
