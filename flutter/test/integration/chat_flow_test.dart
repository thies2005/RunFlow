import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/domain/entities/chat_entities.dart';
import 'package:runflow_flutter/data/repositories/chat_repository_impl.dart';

void main() {
  group('Chat flow integration', () {
    late Dio dio;
    late ChatRepositoryImpl repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
      repository = ChatRepositoryImpl(dio: dio);
    });

    test('create session then list sessions', () async {
      dio.httpClientAdapter = _CreateSessionAdapter();

      final session = await repository.createSession();
      expect(session.id, 's-new');
      expect(session.title, 'New Chat');

      dio.httpClientAdapter = _ListSessionsAdapter();

      final sessions = await repository.listSessions();
      expect(sessions.length, 1);
      expect(sessions.first.id, 's-1');
    });

    test('create session then send message and receive stream', () async {
      const String sseData =
          'data: {"token":"Hello "}\ndata: {"token":"world!"}\ndata: [DONE]\n';

      dio.httpClientAdapter = _SSEStreamAdapter(sseData);

      final tokens = await repository.sendMessage('s-1', 'Hi').toList();
      expect(tokens, ['Hello ', 'world!']);
    });

    test('get messages caches and falls back offline', () async {
      dio.httpClientAdapter = _MessagesAdapter();

      final messages = await repository.getMessages('s-1');
      expect(messages.length, 2);
      expect(messages.first.role, ChatMessageRole.user);
      expect(messages.last.role, ChatMessageRole.assistant);

      dio.httpClientAdapter = _NetworkErrorAdapter();

      final cachedMessages = await repository.getMessages('s-1');
      expect(cachedMessages.length, 2);
      expect(cachedMessages.first.content, 'Hello');
    });

    test('create session then delete session', () async {
      dio.httpClientAdapter = _CreateSessionAdapter();
      final session = await repository.createSession();

      dio.httpClientAdapter = _MessagesAdapter();
      await repository.getMessages(session.id);

      dio.httpClientAdapter = _DeleteSessionAdapter();
      final deleted = await repository.deleteSession(session.id);
      expect(deleted, true);
    });

    test('SSE handles partial chunks across stream events', () async {
      const String chunk1 = 'data: {"tok';
      const String chunk2 = 'en":"partial"}\ndata: [DONE]\n';

      dio.httpClientAdapter = _MultiChunkSSEAdapter([chunk1, chunk2]);

      final tokens = await repository.sendMessage('s-1', 'test').toList();
      expect(tokens, ['partial']);
    });

    test('SSE handles malformed JSON gracefully', () async {
      const String sseData =
          'data: {bad}\ndata: {"token":"good"}\ndata: [DONE]\n';
      dio.httpClientAdapter = _SSEStreamAdapter(sseData);

      final tokens = await repository.sendMessage('s-1', 'test').toList();
      expect(tokens, ['good']);
    });

    test('SSE handles token null gracefully', () async {
      const String sseData =
          'data: {"token":null}\ndata: {"token":"value"}\ndata: [DONE]\n';
      dio.httpClientAdapter = _SSEStreamAdapter(sseData);

      final tokens = await repository.sendMessage('s-1', 'test').toList();
      expect(tokens, ['value']);
    });
  });
}

class _CreateSessionAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'session': {
          'id': 's-new',
          'title': 'New Chat',
          'createdAt': '2024-06-15T12:00:00Z',
          'updatedAt': '2024-06-15T12:00:00Z',
        },
      }),
      201,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _ListSessionsAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'sessions': [
          {
            'id': 's-1',
            'title': 'Chat 1',
            'createdAt': '2024-06-15T12:00:00Z',
            'updatedAt': '2024-06-15T12:00:00Z',
          },
        ],
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _MessagesAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'messages': [
          {
            'id': 'm1',
            'sessionId': 's-1',
            'role': 'user',
            'content': 'Hello',
            'createdAt': '2024-06-15T12:00:00Z',
          },
          {
            'id': 'm2',
            'sessionId': null,
            'role': 'assistant',
            'content': 'Hi there!',
            'createdAt': '2024-06-15T12:00:01Z',
          },
        ],
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _SSEStreamAdapter implements HttpClientAdapter {
  _SSEStreamAdapter(this.sseData);

  final String sseData;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody(
      Stream.value(Uint8List.fromList(utf8.encode(sseData))),
      200,
      headers: {
        Headers.contentTypeHeader: ['text/event-stream'],
      },
    );
  }
}

class _MultiChunkSSEAdapter implements HttpClientAdapter {
  _MultiChunkSSEAdapter(this.chunks);

  final List<String> chunks;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final stream = Stream.fromIterable(
      chunks.map((c) => Uint8List.fromList(utf8.encode(c))),
    );
    return ResponseBody(
      stream,
      200,
      headers: {
        Headers.contentTypeHeader: ['text/event-stream'],
      },
    );
  }
}

class _DeleteSessionAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({'success': true}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class _NetworkErrorAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw DioException(
      requestOptions: options,
      type: DioExceptionType.connectionError,
    );
  }
}
