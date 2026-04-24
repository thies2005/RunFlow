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
