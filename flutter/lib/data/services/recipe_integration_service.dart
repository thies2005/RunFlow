import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/core/utils/logger.dart';

class RecipeIntegrationService {
  RecipeIntegrationService._();

  static final RecipeIntegrationService instance = RecipeIntegrationService._();

  Future<Map<String, String>> getSettings() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'enabled': (prefs.getBool('recipe_integration_enabled') ?? false).toString(),
      'type': prefs.getString('recipe_integration_type') ?? 'mealie',
      'url': prefs.getString('recipe_integration_url') ?? '',
      'token': prefs.getString('recipe_integration_token') ?? '',
    };
  }

  Future<void> saveSettings({
    required bool enabled,
    required String type,
    required String url,
    required String token,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('recipe_integration_enabled', enabled);
    await prefs.setString('recipe_integration_type', type);
    await prefs.setString('recipe_integration_url', url);
    await prefs.setString('recipe_integration_token', token);
  }

  Future<bool> testConnection(String type, String baseUrl, String token) async {
    if (baseUrl.isEmpty) return false;
    
    // Normalize URL
    var url = baseUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }

    try {
      if (type == 'mealie') {
        final uri = Uri.parse('$url/api/recipes?perPage=1');
        final response = await http.get(
          uri,
          headers: {
            'Authorization': 'Bearer ${token.trim()}',
            'Content-Type': 'application/json',
          },
        ).timeout(const Duration(seconds: 8));
        return response.statusCode == 200;
      } else {
        // Tandoor connection test
        final uri = Uri.parse('$url/api/recipe?page_size=1');
        final response = await http.get(
          uri,
          headers: {
            'Authorization': 'Token ${token.trim()}',
            'Content-Type': 'application/json',
          },
        ).timeout(const Duration(seconds: 8));
        return response.statusCode == 200;
      }
    } catch (e) {
      logger.debug('[Recipe Integration] Connection test failed: $e');
      return false;
    }
  }

  Future<List<FoodItem>> searchRecipes(String query) async {
    final settings = await getSettings();
    if (settings['enabled'] != 'true') return [];

    var url = settings['url']!.trim();
    if (url.isEmpty) return [];

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }

    final type = settings['type']!;
    final token = settings['token']!.trim();

    try {
      if (type == 'mealie') {
        final uri = Uri.parse('$url/api/recipes?perPage=15&query=${Uri.encodeComponent(query)}');
        final response = await http.get(
          uri,
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ).timeout(const Duration(seconds: 10));

        if (response.statusCode != 200) return [];

        final data = jsonDecode(response.body);
        List<dynamic> recipesList = [];
        if (data is Map && data.containsKey('data')) {
          recipesList = data['data'] as List<dynamic>? ?? [];
        } else if (data is List) {
          recipesList = data;
        }

        final List<FoodItem> items = [];
        for (final dynamic recVal in recipesList) {
          if (recVal is! Map<String, dynamic>) continue;
          final rec = recVal;
          final name = rec['name'] as String? ?? 'Mealie Recipe';
          final slug = rec['slug'] as String? ?? '';
          
          double calories = 0.0;
          double protein = 0.0;
          double carbs = 0.0;
          double fat = 0.0;

          // Check if nutrition is in the list response
          if (rec.containsKey('nutrition') && rec['nutrition'] != null) {
            final nut = rec['nutrition'] as Map<String, dynamic>;
            calories = double.tryParse(nut['calories']?.toString() ?? '') ?? 0.0;
            protein = double.tryParse(nut['protein']?.toString() ?? '') ?? 0.0;
            carbs = double.tryParse(nut['carbohydrate']?.toString() ?? '') ?? 0.0;
            fat = double.tryParse(nut['fat']?.toString() ?? '') ?? 0.0;
          }

          // If calories are zero and we have a slug, we can optionally fetch detailed recipe in background if needed,
          // but Mealie usually returns nutrition inline. If not, let's look up or provide defaults.
          items.add(FoodItem(
            id: 0,
            name: name,
            brand: 'Mealie Recipe',
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat,
            servingSize: 100, // standard default
            barcode: slug.isNotEmpty ? 'mealie-$slug' : null,
          ));
        }
        return items;
      } else {
        // Tandoor Integration
        final uri = Uri.parse('$url/api/recipe?search=${Uri.encodeComponent(query)}&page_size=15');
        final response = await http.get(
          uri,
          headers: {
            'Authorization': 'Token $token',
            'Content-Type': 'application/json',
          },
        ).timeout(const Duration(seconds: 10));

        if (response.statusCode != 200) return [];

        final data = jsonDecode(response.body);
        List<dynamic> recipesList = [];
        if (data is Map && data.containsKey('results')) {
          recipesList = data['results'] as List<dynamic>? ?? [];
        } else if (data is List) {
          recipesList = data;
        }

        final List<FoodItem> items = [];
        for (final dynamic recVal in recipesList) {
          if (recVal is! Map<String, dynamic>) continue;
          final rec = recVal;
          final name = rec['name'] as String? ?? 'Tandoor Recipe';
          final id = rec['id']?.toString() ?? '';
          
          double calories = 0.0;
          double protein = 0.0;
          double carbs = 0.0;
          double fat = 0.0;

          // Tandoor nutrition might reside in a nested nutrition object
          if (rec.containsKey('nutrition') && rec['nutrition'] != null) {
            final nut = rec['nutrition'] as Map<String, dynamic>;
            calories = double.tryParse(nut['calories']?.toString() ?? '') ?? 0.0;
            protein = double.tryParse(nut['protein']?.toString() ?? '') ?? 0.0;
            carbs = double.tryParse(nut['carbohydrate']?.toString() ?? '') ?? 0.0;
            fat = double.tryParse(nut['fat']?.toString() ?? '') ?? 0.0;
          } else {
            // Tandoor can have direct nutrition fields on the root
            calories = double.tryParse(rec['calories']?.toString() ?? '') ?? 0.0;
            protein = double.tryParse(rec['protein']?.toString() ?? '') ?? 0.0;
            carbs = double.tryParse(rec['carbs']?.toString() ?? '') ?? 0.0;
            fat = double.tryParse(rec['fat']?.toString() ?? '') ?? 0.0;
          }

          items.add(FoodItem(
            id: 0,
            name: name,
            brand: 'Tandoor Recipe',
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat,
            servingSize: 100,
            barcode: id.isNotEmpty ? 'tandoor-$id' : null,
          ));
        }
        return items;
      }
    } catch (e) {
      logger.debug('[Recipe Integration] Search failed: $e');
      return [];
    }
  }
}
