import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/chat_entities.dart';
import 'package:runflow_flutter/domain/repositories/chat_repository.dart';
import 'package:runflow_flutter/presentation/providers/chat_providers.dart';
import 'package:runflow_flutter/presentation/screens/chat/chat_screen.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

class FakeChatRepository implements ChatRepository {
  List<ChatSession> sessionsToReturn = [];
  ChatSession? sessionToCreate;
  List<ChatMessage> messagesToReturn = [];
  Stream<String>? streamToReturn;
  bool deleteResult = true;
  Object? sendMessageError;
  int cancelStreamingCalls = 0;

  final List<String> listSessionsCalls = [];
  final List<void Function()> createSessionCalls = [];
  final List<String> getMessagesCalls = [];
  final List<(String, String)> sendMessageCalls = [];
  final List<String> deleteSessionCalls = [];

  @override
  Future<List<ChatSession>> listSessions() async {
    listSessionsCalls.add('listSessions');
    return sessionsToReturn;
  }

  @override
  Future<ChatSession> createSession() async {
    createSessionCalls.add(() {});
    if (sessionToCreate == null) {
      throw StateError('sessionToCreate not configured');
    }
    return sessionToCreate!;
  }

  @override
  Future<List<ChatMessage>> getMessages(String sessionId) async {
    getMessagesCalls.add(sessionId);
    return messagesToReturn;
  }

  @override
  Stream<String> sendMessage(String sessionId, String content) {
    sendMessageCalls.add((sessionId, content));
    if (sendMessageError != null) {
      return Stream.error(sendMessageError!);
    }
    return streamToReturn ?? const Stream.empty();
  }

  @override
  Future<bool> deleteSession(String sessionId) async {
    deleteSessionCalls.add(sessionId);
    return deleteResult;
  }

  @override
  void cancelStreaming() {
    cancelStreamingCalls++;
  }
}

void main() {
  group('ChatState', () {
    test('initial state has defaults', () {
      const state = ChatState();

      expect(state.isStreaming, false);
      expect(state.streamingContent, '');
      expect(state.error, '');
    });

    test('copyWith preserves unchanged fields', () {
      const state = ChatState(
        isStreaming: true,
        streamingContent: 'Hello',
        error: 'some error',
      );

      final updated = state.copyWith(isStreaming: false);

      expect(updated.isStreaming, false);
      expect(updated.streamingContent, 'Hello');
      expect(updated.error, 'some error');
    });

    test('copyWith updates streaming content', () {
      const state = ChatState(streamingContent: 'Hello');

      final updated = state.copyWith(streamingContent: 'Hello World');

      expect(updated.streamingContent, 'Hello World');
    });

    test('copyWith updates error', () {
      const state = ChatState();

      final updated = state.copyWith(error: 'Network error');

      expect(updated.error, 'Network error');
    });

    test('copyWith updates multiple fields', () {
      const state = ChatState();

      final updated = state.copyWith(
        isStreaming: true,
        streamingContent: 'Loading...',
      );

      expect(updated.isStreaming, true);
      expect(updated.streamingContent, 'Loading...');
      expect(updated.error, '');
    });
  });

  group('ChatSessions', () {
    late FakeChatRepository fakeRepo;
    late ProviderContainer container;

    setUp(() {
      fakeRepo = FakeChatRepository();
      container = ProviderContainer(
        overrides: [
          chatRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );
    });

    tearDown(() {
      container.dispose();
    });

    test('build loads sessions from repository', () async {
      final sessions = [
        ChatSession(
          id: '1',
          title: 'Session 1',
          createdAt: DateTime(2024, 1, 1),
          updatedAt: DateTime(2024, 1, 1),
        ),
        ChatSession(
          id: '2',
          title: 'Session 2',
          createdAt: DateTime(2024, 1, 2),
          updatedAt: DateTime(2024, 1, 2),
        ),
      ];
      fakeRepo.sessionsToReturn = sessions;

      final result = await container.read(chatSessionsProvider.future);

      expect(result, equals(sessions));
      expect(fakeRepo.listSessionsCalls.length, 1);
    });

    test('createSession creates session then refreshes list', () async {
      fakeRepo.sessionsToReturn = [];
      fakeRepo.sessionToCreate = ChatSession(
        id: 'new',
        title: 'New Session',
        createdAt: DateTime(2024, 2, 1),
        updatedAt: DateTime(2024, 2, 1),
      );

      await container.read(chatSessionsProvider.future);
      final session = await container
          .read(chatSessionsProvider.notifier)
          .createSession();

      expect(session.id, 'new');
      expect(fakeRepo.createSessionCalls.length, 1);
      expect(fakeRepo.listSessionsCalls.length, 2);
    });

    test('deleteSession deletes session then refreshes list', () async {
      fakeRepo.sessionsToReturn = [];

      await container.read(chatSessionsProvider.future);
      await container
          .read(chatSessionsProvider.notifier)
          .deleteSession('session-1');

      expect(fakeRepo.deleteSessionCalls, ['session-1']);
      expect(fakeRepo.listSessionsCalls.length, 2);
    });
  });

  group('ChatMessages', () {
    late FakeChatRepository fakeRepo;
    late ProviderContainer container;

    setUp(() {
      fakeRepo = FakeChatRepository();
      container = ProviderContainer(
        overrides: [
          chatRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );
    });

    tearDown(() {
      container.dispose();
    });

    test('build loads messages for given sessionId', () async {
      final messages = [
        ChatMessage(
          id: 'm1',
          sessionId: 's1',
          role: ChatMessageRole.user,
          content: 'Hello',
          createdAt: DateTime(2024, 1, 1),
        ),
        ChatMessage(
          id: 'm2',
          sessionId: 's1',
          role: ChatMessageRole.assistant,
          content: 'Hi there',
          createdAt: DateTime(2024, 1, 1),
        ),
      ];
      fakeRepo.messagesToReturn = messages;

      final result =
          await container.read(chatMessagesProvider('s1').future);

      expect(result, equals(messages));
      expect(fakeRepo.getMessagesCalls, ['s1']);
    });
  });

  group('ChatNotifier', () {
    late FakeChatRepository fakeRepo;
    late ProviderContainer container;
    late ProviderSubscription<ChatState> subscription;

    setUp(() {
      fakeRepo = FakeChatRepository();
      container = ProviderContainer(
        overrides: [
          chatRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );
      subscription = container.listen<ChatState>(
        chatProvider,
        (_, __) {},
        fireImmediately: true,
      );
    });

    tearDown(() {
      subscription.close();
      container.dispose();
    });

    test('sendMessage streams content chunks and updates state', () async {
      fakeRepo.streamToReturn = Stream.fromIterable(['Hel', 'lo!']);

      final notifier = container.read(chatProvider.notifier);

      expect(container.read(chatProvider).isStreaming, false);

      await notifier.sendMessage('s1', 'Hello');

      final state = container.read(chatProvider);
      expect(state.isStreaming, false);
      expect(state.streamingContent, 'Hello!');
      expect(state.error, '');
      expect(fakeRepo.sendMessageCalls.length, 1);
      expect(fakeRepo.sendMessageCalls.first, ('s1', 'Hello'));
    });

    test('sendMessage handles errors and sets error state', () async {
      fakeRepo.sendMessageError = Exception('Server error');

      final notifier = container.read(chatProvider.notifier);
      await notifier.sendMessage('s2', 'Break');

      final state = container.read(chatProvider);
      expect(state.isStreaming, false);
      expect(state.error, contains('Server error'));
    });

    test('sendMessage cancels previous stream when sending new message', () async {
      final controller = StreamController<String>();
      fakeRepo.streamToReturn = controller.stream;

      final notifier = container.read(chatProvider.notifier);
      // ignore: unawaited_futures
      notifier.sendMessage('s1', 'first');

      await Future.delayed(Duration.zero);

      fakeRepo.streamToReturn = Stream.fromIterable(['B']);
      await notifier.sendMessage('s2', 'second');

      final state = container.read(chatProvider);
      expect(state.streamingContent, 'B');
      expect(fakeRepo.cancelStreamingCalls, greaterThanOrEqualTo(1));

      await controller.close();
    });

    test('switching session cancels stream and resets state', () async {
      final controller = StreamController<String>();
      fakeRepo.streamToReturn = controller.stream;

      final notifier = container.read(chatProvider.notifier);
      // ignore: unawaited_futures
      notifier.sendMessage('s1', 'hello');

      await Future.delayed(Duration.zero);

      container.read(currentSessionIdProvider.notifier).set('s2');

      final state = container.read(chatProvider);
      expect(state.isStreaming, false);
      expect(state.streamingContent, '');
      expect(state.error, '');
      expect(fakeRepo.cancelStreamingCalls, greaterThanOrEqualTo(1));

      await controller.close();
    });

    test('switching to same session does not reset state', () async {
      container.read(currentSessionIdProvider.notifier).set('s1');

      fakeRepo.streamToReturn = Stream.fromIterable(['Hello']);

      final notifier = container.read(chatProvider.notifier);
      await notifier.sendMessage('s1', 'hi');

      container.read(currentSessionIdProvider.notifier).set('s1');

      final state = container.read(chatProvider);
      expect(state.streamingContent, 'Hello');
    });

    test('resetForNewSession clears active stream', () async {
      final controller = StreamController<String>();
      fakeRepo.streamToReturn = controller.stream;

      final notifier = container.read(chatProvider.notifier);
      // ignore: unawaited_futures
      notifier.sendMessage('s1', 'hello');

      await Future.delayed(Duration.zero);

      notifier.resetForNewSession();

      final state = container.read(chatProvider);
      expect(state.isStreaming, false);
      expect(state.streamingContent, '');
      expect(fakeRepo.cancelStreamingCalls, greaterThanOrEqualTo(1));

      await controller.close();
    });

    test('resetForNewSession is no-op when not streaming', () async {
      final notifier = container.read(chatProvider.notifier);
      notifier.resetForNewSession();

      expect(fakeRepo.cancelStreamingCalls, 0);
    });

    test('stream loop breaks when session changes mid-stream', () async {
      final controller = StreamController<String>();
      fakeRepo.streamToReturn = controller.stream;

      final notifier = container.read(chatProvider.notifier);
      // ignore: unawaited_futures
      notifier.sendMessage('s1', 'hello');

      await Future.delayed(Duration.zero);
      expect(container.read(chatProvider).isStreaming, true);

      container.read(currentSessionIdProvider.notifier).set('s2');

      controller.add('chunk1');
      controller.add('chunk2');
      await Future.delayed(Duration.zero);

      final state = container.read(chatProvider);
      expect(state.streamingContent, '');
      expect(state.isStreaming, false);

      await controller.close();
    });
  });
}
