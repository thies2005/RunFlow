class AiMealSuggestion {
  const AiMealSuggestion({
    required this.suggestionName,
    required this.reasoning,
    required this.items,
    required this.totalCalories,
    required this.totalProtein,
    required this.totalCarbs,
    required this.totalFats,
  });

  final String suggestionName;
  final String reasoning;
  final List<AiMealItem> items;
  final double totalCalories;
  final double totalProtein;
  final double totalCarbs;
  final double totalFats;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AiMealSuggestion &&
          runtimeType == other.runtimeType &&
          suggestionName == other.suggestionName &&
          reasoning == other.reasoning &&
          _listEquals(items, other.items) &&
          totalCalories == other.totalCalories &&
          totalProtein == other.totalProtein &&
          totalCarbs == other.totalCarbs &&
          totalFats == other.totalFats;

  @override
  int get hashCode => Object.hash(
        suggestionName,
        reasoning,
        Object.hashAll(items),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFats,
      );

  static bool _listEquals(List<AiMealItem> a, List<AiMealItem> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

class AiMealItem {
  const AiMealItem({
    required this.name,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fats,
    this.servingSize,
  });

  final String name;
  final double calories;
  final double protein;
  final double carbs;
  final double fats;
  final String? servingSize;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AiMealItem &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          calories == other.calories &&
          protein == other.protein &&
          carbs == other.carbs &&
          fats == other.fats &&
          servingSize == other.servingSize;

  @override
  int get hashCode => Object.hash(
        name,
        calories,
        protein,
        carbs,
        fats,
        servingSize,
      );
}
