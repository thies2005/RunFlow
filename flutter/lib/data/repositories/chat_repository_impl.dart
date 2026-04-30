import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:runflow_flutter/core/utils/logger.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/mappers/mappers.dart';
import 'package:runflow_flutter/data/models/chat_models.dart';
import 'package:runflow_flutter/domain/entities/entities.dart' as domain;
import 'package:runflow_flutter/domain/repositories/chat_repository.dart';

class ChatRepositoryImpl implements ChatRepository {
  ChatRepositoryImpl({required this.dio});

  final Dio dio;

  static const _maxCachedSessions = 50;
  static const _maxCachedMessagesPerSession = 100;
  static const _maxCachedSessionList = 20;

  final Map<String, List<domain.ChatMessage>> _messagesCache = {};
  final List<domain.ChatSession> _sessionsCache = [];
  CancelToken? _activeToken;
  CancelToken? _activeGetMessagesToken;

  List<domain.ChatMessage> _capMessages(List<domain.ChatMessage> messages) {
    if (messages.length <= _maxCachedMessagesPerSession) return messages;
    return messages.sublist(messages.length - _maxCachedMessagesPerSession);
  }

  void _evictMessagesCache() {
    while (_messagesCache.length > _maxCachedSessions) {
      _messagesCache.remove(_messagesCache.keys.first);
    }
  }

  @override
  Future<List<domain.ChatSession>> listSessions() async {
    try {
      final response = await dio.get(ApiConstants.aiChatSessionsUrl);
      final sessions = unwrapList(
        response.data as Map<String, dynamic>,
        const ['sessions'],
      ).map(ChatSession.fromJson).toList();
      final domainSessions = sessions.map((s) => s.toDomain()).toList();
      _sessionsCache
        ..clear()
        ..addAll(domainSessions.length > _maxCachedSessionList
            ? domainSessions.sublist(0, _maxCachedSessionList)
            : domainSessions);
      return domainSessions;
    } on DioException catch (e) {
      logger.error('[ChatRepositoryImpl] listSessions failed: $e');
      if (_sessionsCache.isNotEmpty) return List.unmodifiable(_sessionsCache);
      return [];
    } catch (e) {
      logger.error('[ChatRepositoryImpl] listSessions unexpected error: $e');
      if (_sessionsCache.isNotEmpty) return List.unmodifiable(_sessionsCache);
      return [];
    }
  }

  @override
  Future<domain.ChatSession> createSession() async {
    try {
      final response = await dio.post(ApiConstants.aiChatSessionsUrl);
      final payload = unwrapPayload(
        response.data as Map<String, dynamic>,
        const ['session'],
      );
      return ChatSession.fromJson(payload).toDomain();
    } on DioException catch (e) {
      logger.error('[ChatRepositoryImpl] createSession failed: $e');
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to create chat session. Please check your connection.',
              statusCode: e.response?.statusCode,
            );
    } catch (e) {
      logger.error('[ChatRepositoryImpl] createSession unexpected error: $e');
      throw const ServerException(message: 'Failed to create chat session. Please try again.');
    }
  }

  @override
  Future<List<domain.ChatMessage>> getMessages(String sessionId) async {
    try {
      _activeGetMessagesToken?.cancel();
      final getMessagesToken = CancelToken();
      _activeGetMessagesToken = getMessagesToken;
      final response = await dio.get(
        ApiConstants.aiChatHistoryUrl,
        queryParameters: {'sessionId': sessionId},
        cancelToken: getMessagesToken,
      );
      final messages = unwrapList(
        response.data as Map<String, dynamic>,
        const ['messages'],
      ).map(ChatMessage.fromJson).toList();
      final domainMessages = messages.map((m) => m.toDomain()).toList();
      _messagesCache[sessionId] = _capMessages(domainMessages);
      _evictMessagesCache();
      return domainMessages;
    } on DioException catch (e) {
      logger.error('[ChatRepositoryImpl] getMessages failed: $e');
      if (_messagesCache.containsKey(sessionId)) {
        return _messagesCache[sessionId]!;
      }
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to load messages.',
              statusCode: e.response?.statusCode,
            );
    } catch (e) {
      logger.error('[ChatRepositoryImpl] getMessages unexpected error: $e');
      if (_messagesCache.containsKey(sessionId)) {
        return _messagesCache[sessionId]!;
      }
      return [];
    }
  }

  @override
  Stream<String> sendMessage(String sessionId, String content) async* {
    _activeToken?.cancel();
    final cancelToken = CancelToken();
    _activeToken = cancelToken;
    try {
      final response = await dio.post(
        ApiConstants.aiChatStreamUrl,
        data: {'message': content, 'sessionId': sessionId},
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Accept': 'text/event-stream'},
        ),
        cancelToken: cancelToken,
      );

      final responseStream = response.data.stream as Stream<List<int>>;
      String buffer = '';

      await for (final chunk in responseStream) {
        buffer += utf8.decode(chunk, allowMalformed: true);
        final lines = buffer.split('\n');
        buffer = lines.removeLast();

        for (final line in lines) {
          if (line.startsWith('data: ')) {
            final dataStr = line.substring(6).trim();
            if (dataStr == '[DONE]') return;
            if (dataStr.isEmpty) continue;
            try {
              final json = jsonDecode(dataStr) as Map<String, dynamic>;
              final token = json['token'] as String?;
              if (token != null) {
                yield token;
              }
            } on FormatException {
              continue;
            }
          }
        }
      }
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) return;
      logger.error('[ChatRepositoryImpl] sendMessage failed: $e');
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to send message. Please check your connection.',
              statusCode: e.response?.statusCode,
            );
    } catch (e) {
      logger.error('[ChatRepositoryImpl] sendMessage unexpected error: $e');
      throw const ServerException(message: 'Failed to send message. Please try again.');
    }
  }

  void cancelStreaming() {
    _activeToken?.cancel();
    _activeToken = null;
    _activeGetMessagesToken?.cancel();
    _activeGetMessagesToken = null;
  }

  void dispose() {
    cancelStreaming();
  }

  @override
  Future<bool> deleteSession(String sessionId) async {
    try {
      final response = await dio.delete(
        ApiConstants.aiChatSessionsUrl,
        queryParameters: {'sessionId': sessionId},
      );
      final data = response.data as Map<String, dynamic>;
      _messagesCache.remove(sessionId);
      return data['success'] as bool? ?? true;
    } on DioException catch (e) {
      logger.error('[ChatRepositoryImpl] deleteSession failed: $e');
      return false;
    } catch (e) {
      logger.error('[ChatRepositoryImpl] deleteSession unexpected error: $e');
      return false;
    }
  }
}
