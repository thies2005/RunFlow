import 'package:runflow_flutter/domain/entities/chat_entities.dart';

abstract class ChatRepository {
  Future<List<ChatSession>> listSessions();

  Future<ChatSession> createSession();

  Future<List<ChatMessage>> getMessages(String sessionId);

  Stream<String> sendMessage(String sessionId, String content);

  Future<bool> deleteSession(String sessionId);
}
