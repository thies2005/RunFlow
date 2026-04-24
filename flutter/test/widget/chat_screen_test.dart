import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/models/chat_models.dart';
import 'package:runflow_flutter/presentation/providers/chat_providers.dart';
import 'package:runflow_flutter/presentation/screens/chat/chat_screen.dart';

class _FakeChatSessions extends ChatSessions {
  _FakeChatSessions(this.data);

  final List<ChatSession> data;

  @override
  Future<List<ChatSession>> build() async => data;

  @override
  Future<void> refresh() async {}

  @override
  Future<ChatSession> createSession() async {
    return data.first;
  }

  @override
  Future<void> deleteSession(String sessionId) async {}
}

class _FakeChatMessages extends ChatMessages {
  _FakeChatMessages(this.data);

  final List<ChatMessage> data;

  @override
  Future<List<ChatMessage>> build(String sessionId) async => data;

  @override
  Future<void> refresh() async {}
}

class _FakeChatNotifier extends ChatNotifier {
  _FakeChatNotifier(this.fakeState);

  final ChatState fakeState;

  @override
  ChatState get state => fakeState;

  @override
  set state(ChatState value) {}

  @override
  ChatState build() => fakeState;

  @override
  Future<void> sendMessage(String sessionId, String content) async {}
}

class _FakeSessionId extends CurrentSessionIdNotifier {
  _FakeSessionId(this._value);

  final String? _value;

  @override
  String? build() => _value;
}

void main() {
  final testMessages = [
    ChatMessage(
      id: 'msg1',
      sessionId: 'sess1',
      role: ChatMessageRole.user,
      content: 'Hello coach',
      createdAt: DateTime(2024, 6, 15, 10, 0),
    ),
    ChatMessage(
      id: 'msg2',
      sessionId: 'sess1',
      role: ChatMessageRole.assistant,
      content: 'Hi there! How can I help?',
      createdAt: DateTime(2024, 6, 15, 10, 1),
    ),
  ];

  group('ChatScreen', () {
    testWidgets('renders empty state when no session selected',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatSessionsProvider.overrideWith(() => _FakeChatSessions([])),
            currentSessionIdProvider
                .overrideWith(() => _FakeSessionId(null)),
          ],
          child: const MaterialApp(
            home: ChatScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your AI Running Coach'), findsOneWidget);
      expect(find.text('New Chat'), findsOneWidget);
      expect(find.byIcon(Icons.auto_awesome), findsOneWidget);
    });

    testWidgets('renders suggested prompts in empty state',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatSessionsProvider.overrideWith(() => _FakeChatSessions([])),
            currentSessionIdProvider
                .overrideWith(() => _FakeSessionId(null)),
          ],
          child: const MaterialApp(
            home: ChatScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text("What's my current fitness level?"), findsOneWidget);
      expect(find.text('Suggest a workout for today'), findsOneWidget);
      expect(find.text('How should I taper for my race?'), findsOneWidget);
      expect(find.text('Analyze my recent training'), findsOneWidget);
    });

    testWidgets('renders messages when session is selected',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentSessionIdProvider
                .overrideWith(() => _FakeSessionId('sess1')),
            chatSessionsProvider.overrideWith(() => _FakeChatSessions([])),
            chatMessagesProvider
                // ignore: deprecated_member_use
                .overrideWith(() => _FakeChatMessages(testMessages)),
            // ignore: deprecated_member_use
            chatProvider.overrideWith(
              () => _FakeChatNotifier(const ChatState()),
            ),
          ],
          child: const MaterialApp(
            home: ChatScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Hello coach'), findsOneWidget);
      expect(find.text('Hi there! How can I help?'), findsOneWidget);
    });

    testWidgets('renders input bar with send button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentSessionIdProvider
                .overrideWith(() => _FakeSessionId('sess1')),
            chatSessionsProvider.overrideWith(() => _FakeChatSessions([])),
            chatMessagesProvider
                // ignore: deprecated_member_use
                .overrideWith(() => _FakeChatMessages([])),
            // ignore: deprecated_member_use
            chatProvider.overrideWith(
              () => _FakeChatNotifier(const ChatState()),
            ),
          ],
          child: const MaterialApp(
            home: ChatScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(TextField), findsOneWidget);
      expect(find.byIcon(Icons.send), findsOneWidget);
      expect(find.text('Ask your AI coach...'), findsOneWidget);
    });

    testWidgets('renders app bar with history and new chat buttons',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatSessionsProvider.overrideWith(() => _FakeChatSessions([])),
            currentSessionIdProvider
                .overrideWith(() => _FakeSessionId(null)),
          ],
          child: const MaterialApp(
            home: ChatScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.history), findsOneWidget);
      expect(find.byIcon(Icons.add_comment_outlined), findsOneWidget);
      expect(find.text('AI Coach'), findsOneWidget);
    });

    testWidgets('shows error state with retry button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentSessionIdProvider
                .overrideWith(() => _FakeSessionId('sess1')),
            chatSessionsProvider.overrideWith(() => _FakeChatSessions([])),
            // ignore: deprecated_member_use
            chatMessagesProvider.overrideWith(
              () => _FailingChatMessages(),
            ),
            // ignore: deprecated_member_use
            chatProvider.overrideWith(
              () => _FakeChatNotifier(const ChatState()),
            ),
          ],
          child: const MaterialApp(
            home: ChatScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}

class _FailingChatMessages extends ChatMessages {
  @override
  Future<List<ChatMessage>> build(String sessionId) async {
    throw Exception('Network error');
  }

  @override
  Future<void> refresh() async {}
}
