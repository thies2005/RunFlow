import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/domain/entities/chat_entities.dart';
import 'package:runflow_flutter/data/repositories/chat_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/chat_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/screens/chat/chat_screen.dart';

part 'chat_providers.g.dart';

@Riverpod(keepAlive: true)
ChatRepository chatRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  return ChatRepositoryImpl(dio: client.dio);
}

@Riverpod(keepAlive: true)
class ChatSessions extends _$ChatSessions {
  @override
  Future<List<ChatSession>> build() async {
    final repo = ref.read(chatRepositoryProvider);
    return repo.listSessions();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    final repo = ref.read(chatRepositoryProvider);
    state = await AsyncValue.guard(repo.listSessions);
  }

  Future<ChatSession> createSession() async {
    final repo = ref.read(chatRepositoryProvider);
    final session = await repo.createSession();
    await refresh();
    return session;
  }

  Future<void> deleteSession(String sessionId) async {
    final repo = ref.read(chatRepositoryProvider);
    await repo.deleteSession(sessionId);
    await refresh();
  }
}

@riverpod
class ChatMessages extends _$ChatMessages {
  @override
  Future<List<ChatMessage>> build(String sessionId) async {
    final repo = ref.read(chatRepositoryProvider);
    return repo.getMessages(sessionId);
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    final repo = ref.read(chatRepositoryProvider);
    state = await AsyncValue.guard(() => repo.getMessages(sessionId));
  }
}

@riverpod
class ChatNotifier extends _$ChatNotifier {
  String? _streamingSessionId;
  ChatRepository? _repo;

  @override
  ChatState build() {
    _repo = ref.read(chatRepositoryProvider);
    ref.listen(currentSessionIdProvider, (prev, next) {
      if (prev != next && _streamingSessionId != null) {
        _cancelCurrentStream();
        state = const ChatState();
      }
    });
    ref.onDispose(_cancelCurrentStream);
    return const ChatState();
  }

  void _cancelCurrentStream() {
    _streamingSessionId = null;
    _repo?.cancelStreaming();
  }

  void resetForNewSession() {
    if (_streamingSessionId != null) {
      _cancelCurrentStream();
      state = const ChatState();
    }
  }

  Future<void> sendMessage(String sessionId, String content) async {
    _cancelCurrentStream();
    _streamingSessionId = sessionId;
    final repo = _repo!;

    state = state.copyWith(isStreaming: true, streamingContent: '', error: '');

    try {
      await for (final chunk in repo.sendMessage(sessionId, content)) {
        if (_streamingSessionId != sessionId) break;
        state = state.copyWith(
          streamingContent: state.streamingContent + chunk,
        );
      }
    } catch (e) {
      if (_streamingSessionId == sessionId) {
        state = state.copyWith(error: e.toString());
      }
    } finally {
      if (ref.mounted && _streamingSessionId == sessionId) {
        state = state.copyWith(isStreaming: false);
        _streamingSessionId = null;
        ref.invalidate(chatMessagesProvider(sessionId));
      }
    }
  }
}

class ChatState {
  const ChatState({
    this.isStreaming = false,
    this.streamingContent = '',
    this.error = '',
  });

  final bool isStreaming;
  final String streamingContent;
  final String error;

  ChatState copyWith({
    bool? isStreaming,
    String? streamingContent,
    String? error,
  }) {
    return ChatState(
      isStreaming: isStreaming ?? this.isStreaming,
      streamingContent: streamingContent ?? this.streamingContent,
      error: error ?? this.error,
    );
  }
}
