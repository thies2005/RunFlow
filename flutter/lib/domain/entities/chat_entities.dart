enum ChatMessageRole { user, assistant }

class ChatSession {
  const ChatSession({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final DateTime createdAt;
  final DateTime updatedAt;

  ChatSession copyWith({
    String? id,
    String? title,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ChatSession(
      id: id ?? this.id,
      title: title ?? this.title,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatSession &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          title == other.title &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode => Object.hash(
        id,
        title,
        createdAt,
        updatedAt,
      );
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String? sessionId;
  final ChatMessageRole role;
  final String content;
  final DateTime createdAt;

  ChatMessage copyWith({
    String? id,
    String? sessionId,
    ChatMessageRole? role,
    String? content,
    DateTime? createdAt,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      sessionId: sessionId ?? this.sessionId,
      role: role ?? this.role,
      content: content ?? this.content,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatMessage &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          sessionId == other.sessionId &&
          role == other.role &&
          content == other.content &&
          createdAt == other.createdAt;

  @override
  int get hashCode => Object.hash(
        id,
        sessionId,
        role,
        content,
        createdAt,
      );
}
