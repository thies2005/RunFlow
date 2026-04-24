import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_models.freezed.dart';
part 'chat_models.g.dart';

enum ChatMessageRole {
  @JsonValue('user')
  user,
  @JsonValue('assistant')
  assistant,
}

@Freezed(copyWith: true)
sealed class ChatSession with _$ChatSession {
  const factory ChatSession({
    required String id,
    required String title,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _ChatSession;
  const ChatSession._();

  factory ChatSession.fromJson(Map<String, dynamic> json) =>
      _$ChatSessionFromJson(json);
}

@Freezed(copyWith: true)
sealed class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required String id,
    required String? sessionId,
    required ChatMessageRole role,
    required String content,
    required DateTime createdAt,
  }) = _ChatMessage;
  const ChatMessage._();

  factory ChatMessage.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageFromJson(json);
}
