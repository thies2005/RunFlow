import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/errors/exceptions.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/chat_models.dart';
import 'package:runflow_flutter/domain/repositories/chat_repository.dart';

class ChatRepositoryImpl implements ChatRepository {
  ChatRepositoryImpl({required this.dio});

  final Dio dio;
  final Map<String, List<ChatMessage>> _messagesCache = {};
  final List<ChatSession> _sessionsCache = [];

  @override
  Future<List<ChatSession>> listSessions() async {
    try {
      final response = await dio.get(ApiConstants.aiChatSessionsUrl);
      final data = response.data as Map<String, dynamic>;
      final sessions = (data['sessions'] as List<dynamic>)
          .map((e) => ChatSession.fromJson(e as Map<String, dynamic>))
          .toList();
      _sessionsCache
        ..clear()
        ..addAll(sessions);
      return sessions;
    } on DioException catch (e) {
      debugPrint('[ChatRepositoryImpl] listSessions failed: $e');
      if (_sessionsCache.isNotEmpty) return List.unmodifiable(_sessionsCache);
      return [];
    } catch (e) {
      debugPrint('[ChatRepositoryImpl] listSessions unexpected error: $e');
      if (_sessionsCache.isNotEmpty) return List.unmodifiable(_sessionsCache);
      return [];
    }
  }

  @override
  Future<ChatSession> createSession() async {
    try {
      final response = await dio.post(ApiConstants.aiChatSessionsUrl);
      final payload = unwrapPayload(
        response.data as Map<String, dynamic>,
        const ['session'],
      );
      return ChatSession.fromJson(payload);
    } on DioException catch (e) {
      debugPrint('[ChatRepositoryImpl] createSession failed: $e');
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to create chat session. Please check your connection.',
              statusCode: e.response?.statusCode,
            );
    } catch (e) {
      debugPrint('[ChatRepositoryImpl] createSession unexpected error: $e');
      throw const ServerException(message: 'Failed to create chat session. Please try again.');
    }
  }

  @override
  Future<List<ChatMessage>> getMessages(String sessionId) async {
    try {
      final response = await dio.get(
        ApiConstants.aiChatHistoryUrl,
        queryParameters: {'sessionId': sessionId},
      );
      final data = response.data as Map<String, dynamic>;
      final messages = (data['messages'] as List<dynamic>)
          .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
          .toList();
      _messagesCache[sessionId] = messages;
      return messages;
    } on DioException catch (e) {
      debugPrint('[ChatRepositoryImpl] getMessages failed: $e');
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
      debugPrint('[ChatRepositoryImpl] getMessages unexpected error: $e');
      if (_messagesCache.containsKey(sessionId)) {
        return _messagesCache[sessionId]!;
      }
      return [];
    }
  }

  @override
  Stream<String> sendMessage(String sessionId, String content) async* {
    try {
      final response = await dio.post(
        ApiConstants.aiChatStreamUrl,
        data: {'message': content, 'sessionId': sessionId},
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Accept': 'text/event-stream'},
        ),
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
      debugPrint('[ChatRepositoryImpl] sendMessage failed: $e');
      throw e.error is AppException
          ? e.error as AppException
          : ServerException(
              message: 'Failed to send message. Please check your connection.',
              statusCode: e.response?.statusCode,
            );
    } catch (e) {
      debugPrint('[ChatRepositoryImpl] sendMessage unexpected error: $e');
      throw const ServerException(message: 'Failed to send message. Please try again.');
    }
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
      debugPrint('[ChatRepositoryImpl] deleteSession failed: $e');
      return false;
    } catch (e) {
      debugPrint('[ChatRepositoryImpl] deleteSession unexpected error: $e');
      return false;
    }
  }
}
