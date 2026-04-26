import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/data/models/chat_models.dart';
import 'package:runflow_flutter/data/repositories/chat_repository_impl.dart';

class MockDio extends Mock implements Dio {}

Response<dynamic> _sseResponse(String sseData) {
  return Response<dynamic>(
    requestOptions: RequestOptions(path: ''),
    statusCode: 200,
    data: ResponseBody.fromString(sseData, 200),
  );
}

Response<dynamic> _multiChunkResponse(List<String> chunks) {
  final stream = Stream<Uint8List>.fromIterable(
    chunks.map((c) => Uint8List.fromList(utf8.encode(c))),
  );
  return Response<dynamic>(
    requestOptions: RequestOptions(path: ''),
    statusCode: 200,
    data: ResponseBody(stream, 200),
  );
}

void main() {
  late MockDio mockDio;
  late ChatRepositoryImpl repository;

  setUp(() {
    mockDio = MockDio();
    repository = ChatRepositoryImpl(dio: mockDio);
  });

  group('ChatRepositoryImpl', () {
    group('listSessions', () {
      test('success - returns list of ChatSession', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {
                'sessions': [
                  {
                    'id': 's1',
                    'title': 'Chat 1',
                    'createdAt': '2024-06-15T12:00:00Z',
                    'updatedAt': '2024-06-15T12:00:00Z',
                  },
                  {
                    'id': 's2',
                    'title': 'Chat 2',
                    'createdAt': '2024-06-14T12:00:00Z',
                    'updatedAt': '2024-06-14T12:00:00Z',
                  },
                ],
              },
            ));

        final result = await repository.listSessions();
        expect(result.length, 2);
        expect(result.first.id, 's1');
        expect(result.last.title, 'Chat 2');
      });

      test('success - returns empty list', () async {
        when(() => mockDio.get(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 200,
              data: {'sessions': []},
            ));

        final result = await repository.listSessions();
        expect(result, isEmpty);
      });

      test('failure - throws ServerException on DioException', () async {
        when(() => mockDio.get(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.listSessions(),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('createSession', () {
      test('success - returns created ChatSession from envelope', () async {
        when(() => mockDio.post(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 201,
              data: {
                'session': {
                  'id': 's-new',
                  'title': 'New Chat',
                  'createdAt': '2024-06-15T12:00:00Z',
                  'updatedAt': '2024-06-15T12:00:00Z',
                },
              },
            ));

        final result = await repository.createSession();
        expect(result.id, 's-new');
        expect(result.title, 'New Chat');
      });

      test('success - returns ChatSession from flat response', () async {
        when(() => mockDio.post(any())).thenAnswer((_) async => Response<dynamic>(
              requestOptions: RequestOptions(path: ''),
              statusCode: 201,
              data: {
                'id': 's-flat',
                'title': 'Flat Chat',
                'createdAt': '2024-06-15T12:00:00Z',
                'updatedAt': '2024-06-15T12:00:00Z',
              },
            ));

        final result = await repository.createSession();
        expect(result.id, 's-flat');
      });

      test('failure - throws ServerException', () async {
        when(() => mockDio.post(any())).thenThrow(DioException(
          requestOptions: RequestOptions(path: ''),
          type: DioExceptionType.connectionError,
        ));

        expect(
          () => repository.createSession(),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('getMessages', () {
      test('success - returns messages and caches them', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {
                    'messages': [
                      {
                        'id': 'm1',
                        'sessionId': 's1',
                        'role': 'user',
                        'content': 'Hello',
                        'createdAt': '2024-06-15T12:00:00Z',
                      },
                    ],
                  },
                ));

        final result = await repository.getMessages('s1');
        expect(result.length, 1);
        expect(result.first.content, 'Hello');
        expect(result.first.role, ChatMessageRole.user);
      });

      test('success - sends sessionId as query parameter', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {'messages': []},
                ));

        await repository.getMessages('session-abc');

        final captured = verify(() => mockDio.get(
              any(),
              queryParameters: captureAny(named: 'queryParameters'),
            )).captured.single as Map<String, dynamic>;

        expect(captured['sessionId'], 'session-abc');
      });

      test('offline fallback - returns cached messages on DioException', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {
                    'messages': [
                      {
                        'id': 'm1',
                        'sessionId': 's1',
                        'role': 'user',
                        'content': 'Cached message',
                        'createdAt': '2024-06-15T12:00:00Z',
                      },
                    ],
                  },
                ));

        await repository.getMessages('s1');

        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        final cached = await repository.getMessages('s1');
        expect(cached.length, 1);
        expect(cached.first.content, 'Cached message');
      });

      test('failure - throws ServerException when no cache available', () async {
        when(() => mockDio.get(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.getMessages('unknown-session'),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('sendMessage (SSE parsing)', () {
      test('yields tokens from SSE data lines', () async {
        const sseData = 'data: {"token":"Hello "}\ndata: {"token":"World!"}\ndata: [DONE]\n';

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => _sseResponse(sseData));

        final tokens = await repository.sendMessage('s1', 'Hi').toList();
        expect(tokens, ['Hello ', 'World!']);
      });

      test('handles chunked SSE data across multiple events', () async {
        const chunk1 = 'data: {"token":"Hel';
        const chunk2 = 'lo"}\ndata: [DONE]\n';

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => _multiChunkResponse([chunk1, chunk2]));

        final tokens = await repository.sendMessage('s1', 'Hi').toList();
        expect(tokens, ['Hello']);
      });

      test('handles malformed JSON in SSE data gracefully', () async {
        const sseData = 'data: {invalid json}\ndata: {"token":"valid"}\ndata: [DONE]\n';

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => _sseResponse(sseData));

        final tokens = await repository.sendMessage('s1', 'Hi').toList();
        expect(tokens, ['valid']);
      });

      test('stops on [DONE] sentinel', () async {
        const sseData = 'data: {"token":"first"}\ndata: [DONE]\ndata: {"token":"after"}\n';

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => _sseResponse(sseData));

        final tokens = await repository.sendMessage('s1', 'Hi').toList();
        expect(tokens, ['first']);
      });

      test('skips SSE lines without token field', () async {
        const sseData = 'data: {"type":"thinking"}\ndata: {"token":"result"}\ndata: [DONE]\n';

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => _sseResponse(sseData));

        final tokens = await repository.sendMessage('s1', 'Hi').toList();
        expect(tokens, ['result']);
      });

      test('skips empty data lines', () async {
        const sseData = 'data: \ndata: {"token":"ok"}\ndata: [DONE]\n';

        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenAnswer((_) async => _sseResponse(sseData));

        final tokens = await repository.sendMessage('s1', 'Hi').toList();
        expect(tokens, ['ok']);
      });

      test('throws ServerException on DioException', () async {
        when(() => mockDio.post(
              any(),
              data: any(named: 'data'),
              options: any(named: 'options'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.sendMessage('s1', 'Hi').toList(),
          throwsA(isA<ServerException>()),
        );
      });
    });

    group('deleteSession', () {
      test('success - returns true and clears cache', () async {
        when(() => mockDio.delete(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: {'success': true},
                ));

        final result = await repository.deleteSession('s1');
        expect(result, true);
      });

      test('success - returns true when success field missing', () async {
        when(() => mockDio.delete(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenAnswer((_) async => Response<dynamic>(
                  requestOptions: RequestOptions(path: ''),
                  statusCode: 200,
                  data: <String, dynamic>{},
                ));

        final result = await repository.deleteSession('s1');
        expect(result, true);
      });

      test('failure - throws ServerException', () async {
        when(() => mockDio.delete(
              any(),
              queryParameters: any(named: 'queryParameters'),
            )).thenThrow(DioException(
              requestOptions: RequestOptions(path: ''),
              type: DioExceptionType.connectionError,
            ));

        expect(
          () => repository.deleteSession('s1'),
          throwsA(isA<ServerException>()),
        );
      });
    });
  });
}
