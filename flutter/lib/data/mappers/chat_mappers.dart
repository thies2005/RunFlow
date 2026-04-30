import 'package:runflow_flutter/data/models/chat_models.dart';
import 'package:runflow_flutter/domain/entities/chat_entities.dart' as domain;

extension ChatMessageRoleMapper on ChatMessageRole {
  domain.ChatMessageRole toDomain() => domain.ChatMessageRole.values[index];
}

extension DomainChatMessageRoleMapper on domain.ChatMessageRole {
  ChatMessageRole toData() => ChatMessageRole.values[index];
}

extension ChatSessionMapper on ChatSession {
  domain.ChatSession toDomain() => domain.ChatSession(
        id: id,
        title: title,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

extension DomainChatSessionMapper on domain.ChatSession {
  ChatSession toData() => ChatSession(
        id: id,
        title: title,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

extension ChatMessageMapper on ChatMessage {
  domain.ChatMessage toDomain() => domain.ChatMessage(
        id: id,
        sessionId: sessionId,
        role: role.toDomain(),
        content: content,
        createdAt: createdAt,
      );
}

extension DomainChatMessageMapper on domain.ChatMessage {
  ChatMessage toData() => ChatMessage(
        id: id,
        sessionId: sessionId,
        role: role.toData(),
        content: content,
        createdAt: createdAt,
      );
}
