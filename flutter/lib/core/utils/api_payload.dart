Map<String, dynamic> unwrapPayload(
  Map<String, dynamic> data,
  List<String> envelopeKeys,
) {
  for (final key in envelopeKeys) {
    final nested = data[key];
    if (nested is Map<String, dynamic>) {
      return nested;
    }

    if (nested is Map) {
      return Map<String, dynamic>.from(nested);
    }
  }

  return data;
}

List<Map<String, dynamic>> unwrapList(
  Map<String, dynamic> data,
  List<String> envelopeKeys,
) {
  for (final key in envelopeKeys) {
    final nested = data[key];
    if (nested is List) {
      return [
        for (final item in nested)
          if (item is Map) Map<String, dynamic>.from(item),
      ];
    }
  }

  return [];
}
