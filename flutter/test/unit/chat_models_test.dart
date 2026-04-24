import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/chat_models.dart';

void main() {
  group('ChatSession', () {
    test('deserializes from JSON', () {
      final json = {
        'id': 'sess1',
        'title': 'Training Plan Chat',
        'createdAt': '2024-06-15T10:00:00.000Z',
        'updatedAt': '2024-06-15T11:00:00.000Z',
      };
      final session = ChatSession.fromJson(json);

      expect(session.id, 'sess1');
      expect(session.title, 'Training Plan Chat');
      expect(session.createdAt, DateTime.parse('2024-06-15T10:00:00.000Z'));
      expect(session.updatedAt, DateTime.parse('2024-06-15T11:00:00.000Z'));
    });

    test('round-trip serialization', () {
      final json = {
        'id': 'sess2',
        'title': 'Race Strategy',
        'createdAt': '2024-07-01T08:00:00.000Z',
        'updatedAt': '2024-07-01T09:30:00.000Z',
      };
      final original = ChatSession.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = ChatSession.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.id, original.id);
      expect(restored.title, original.title);
      expect(restored.createdAt, original.createdAt);
      expect(restored.updatedAt, original.updatedAt);
    });
  });

  group('ChatMessage', () {
    test('deserializes user message from JSON', () {
      final json = {
        'id': 'msg1',
        'sessionId': 'sess1',
        'role': 'user',
        'content': 'What is my VDOT?',
        'createdAt': '2024-06-15T10:00:00.000Z',
      };
      final message = ChatMessage.fromJson(json);

      expect(message.id, 'msg1');
      expect(message.sessionId, 'sess1');
      expect(message.role, ChatMessageRole.user);
      expect(message.content, 'What is my VDOT?');
    });

    test('deserializes assistant message from JSON', () {
      final json = {
        'id': 'msg2',
        'sessionId': 'sess1',
        'role': 'assistant',
        'content': 'Based on your recent runs, your VDOT is approximately 52.',
        'createdAt': '2024-06-15T10:01:00.000Z',
      };
      final message = ChatMessage.fromJson(json);

      expect(message.id, 'msg2');
      expect(message.role, ChatMessageRole.assistant);
      expect(message.content,
          'Based on your recent runs, your VDOT is approximately 52.');
    });

    test('round-trip serialization', () {
      final json = {
        'id': 'msg3',
        'sessionId': 'sess2',
        'role': 'user',
        'content': 'Suggest a tempo workout',
        'createdAt': '2024-07-01T08:00:00.000Z',
      };
      final original = ChatMessage.fromJson(json);
      final serialized = jsonEncode(original.toJson());
      final restored = ChatMessage.fromJson(
        jsonDecode(serialized) as Map<String, dynamic>,
      );

      expect(restored.id, original.id);
      expect(restored.sessionId, original.sessionId);
      expect(restored.role, original.role);
      expect(restored.content, original.content);
      expect(restored.createdAt, original.createdAt);
    });
  });

  group('ChatMessageRole', () {
    test('deserializes correctly through ChatMessage', () {
      final userJson = {
        'id': 'r1',
        'sessionId': 's1',
        'role': 'user',
        'content': 'Hi',
        'createdAt': '2024-01-01T00:00:00.000Z',
      };
      final assistantJson = {
        'id': 'r2',
        'sessionId': 's1',
        'role': 'assistant',
        'content': 'Hello!',
        'createdAt': '2024-01-01T00:00:00.000Z',
      };

      final userMsg = ChatMessage.fromJson(userJson);
      final assistantMsg = ChatMessage.fromJson(assistantJson);

      expect(userMsg.role, ChatMessageRole.user);
      expect(assistantMsg.role, ChatMessageRole.assistant);
    });

    test('enum values are correct', () {
      expect(ChatMessageRole.values.length, 2);
      expect(ChatMessageRole.values,
          contains(ChatMessageRole.user));
      expect(ChatMessageRole.values,
          contains(ChatMessageRole.assistant));
    });
  });
}
