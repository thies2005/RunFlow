import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase.forTesting();
  });

  tearDown(() {
    db.close();
  });

  test('clearUserData removes rows from every user-scoped table', () async {
    final handle = await db.database;
    final now = DateTime.now().millisecondsSinceEpoch;

    // Insert rows with foreign-key child -> parent relationships that would
    // cause a naive DELETE to trip FOREIGN KEY constraints.
    handle.execute(
      'INSERT INTO supplement_stacks (name, is_active) VALUES (?, ?)',
      ['stack', 1],
    );
    handle.execute(
      'INSERT INTO supplements (name, dosage, frequency) VALUES (?, ?, ?)',
      ['Vitamin D', '1000', 'DAILY'],
    );
    handle.execute(
      'INSERT INTO supplement_stack_items (stack_id, supplement_id) '
      'VALUES (?, ?)',
      [1, 1],
    );
    handle.execute(
      'INSERT INTO nutrition_logs (date, created_at) VALUES (?, ?)',
      [now, now],
    );
    handle.execute(
      'INSERT INTO daily_health_logs (date, nutrition_log_id) VALUES (?, 1)',
      [now],
    );

    expect(
      handle.select('SELECT COUNT(*) AS c FROM supplement_stack_items').first['c'],
      1,
    );

    await db.clearUserData();

    for (final table in const [
      'supplement_stacks',
      'supplements',
      'supplement_stack_items',
      'nutrition_logs',
      'daily_health_logs',
    ]) {
      final count =
          handle.select('SELECT COUNT(*) AS c FROM $table').first['c'] as int;
      expect(count, 0, reason: '$table should be empty after clearUserData');
    }
  });

  test('clearUserData restores foreign_keys pragma to ON', () async {
    await db.initialize();
    expect(
      (await db.database).select('PRAGMA foreign_keys').first['foreign_keys'],
      1,
    );

    await db.clearUserData();

    expect(
      (await db.database).select('PRAGMA foreign_keys').first['foreign_keys'],
      1,
      reason: 'foreign_keys must be re-enabled after the wipe',
    );
  });

  test('clearUserData is idempotent on an empty database', () async {
    await db.initialize();
    await expectLater(db.clearUserData(), completes);
  });
}
