import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/chat_entities.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/chat_providers.dart';

final currentSessionIdProvider = NotifierProvider<CurrentSessionIdNotifier, String?>(
  CurrentSessionIdNotifier.new,
);

class CurrentSessionIdNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? id) {
    state = id;
  }
}

String _formatTimeAgo(DateTime dateTime, S s) {
  final diff = DateTime.now().difference(dateTime);
  if (diff.inMinutes < 1) return s.chatJustNow;
  if (diff.inHours < 1) return s.chatMinutesAgo(diff.inMinutes);
  if (diff.inDays < 1) return s.chatHoursAgo(diff.inHours);
  if (diff.inDays < 7) return s.chatDaysAgo(diff.inDays);
  return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
}

String _cleanChatContent(String content) {
  var cleaned = content.replaceAll(RegExp(r'<think>[\s\S]*?<\/think>'), '');
  final openThinkIndex = cleaned.indexOf('<think>');
  if (openThinkIndex != -1) {
    cleaned = cleaned.substring(0, openThinkIndex);
  }
  return cleaned;
}

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();

  List<String> _suggestedPrompts(S s) => [
    s.chatPromptFitnessLevel,
    s.chatPromptWorkoutToday,
    s.chatPromptTaper,
    s.chatPromptAnalyzeTraining,
  ];

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage(String sessionId) {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    HapticFeedback.lightImpact();

    ref.read(chatProvider.notifier).sendMessage(sessionId, text);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final sessionId = ref.watch(currentSessionIdProvider);
    final theme = Theme.of(context);
    final s = S.of(context);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(s.chatAiCoach),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings/ai'),
          ),
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => _showSessionsDrawer(context),
          ),
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            onPressed: _createNewSession,
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.primary.withValues(alpha: 0.1),
            width: double.infinity,
            child: Text(
              'You are interacting with an AI system. This is for educational purposes and is not medical advice.',
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.primary),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: sessionId != null
                ? _buildChatBody(sessionId, theme)
                : _buildEmptyState(theme, s),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBody(String sessionId, ThemeData theme) {
    final messagesAsync = ref.watch(chatMessagesProvider(sessionId));
    final chatState = ref.watch(chatProvider);

    return Column(
      children: [
        Expanded(
          child: messagesAsync.when(
            data: (messages) => _buildMessageList(
              messages,
              sessionId,
              chatState,
              theme,
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => _buildErrorState(e.toString(), sessionId),
          ),
        ),
        if (chatState.error.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.error.withValues(alpha: 0.1),
            child: Row(
              children: [
                const Icon(Icons.error_outline, size: 16, color: AppColors.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    chatState.error.contains('429')
                        ? S.of(context).chatRateLimited
                        : S.of(context).chatStreamingError,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        _buildInputBar(sessionId, chatState, theme),
      ],
    );
  }

  Widget _buildMessageList(
    List<ChatMessage> messages,
    String sessionId,
    ChatState chatState,
    ThemeData theme,
  ) {
    final showStreaming = chatState.isStreaming || chatState.streamingContent.isNotEmpty;

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(chatMessagesProvider(sessionId).notifier).refresh(),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        controller: _scrollController,
        slivers: [
          if (messages.isEmpty && !showStreaming)
            SliverToBoxAdapter(
              child: _buildSuggestionsInChat(theme, sessionId),
            ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                if (index < messages.length) {
                  return _MessageBubble(message: messages[index], theme: theme);
                }
                if (showStreaming) {
                  return _buildStreamingBubble(chatState.streamingContent, theme);
                }
                return const SizedBox.shrink();
              },
              childCount: messages.length + (showStreaming ? 1 : 0),
            ),
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 8)),
        ],
      ),
    );
  }

  Widget _buildSuggestionsInChat(ThemeData theme, String sessionId) {
    final s = S.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          Icon(
            Icons.auto_awesome,
            size: 48,
            color: theme.colorScheme.primary.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            s.chatAskYourCoach,
            style: theme.textTheme.titleMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _suggestedPrompts(s).map((prompt) {
              return ActionChip(
                label: Text(prompt),
                onPressed: () {
                  _messageController.text = prompt;
                  _sendMessage(sessionId);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStreamingBubble(String content, ThemeData theme) {
    final cleanedContent = _cleanChatContent(content);
    if (cleanedContent.isEmpty) {
      return _TypingIndicator(theme: theme);
    }
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MarkdownBody(
              data: cleanedContent,
              styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
                p: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ),
            const SizedBox(height: 4),
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputBar(
    String sessionId,
    ChatState chatState,
    ThemeData theme,
  ) {
    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 8,
        top: 8,
        bottom: MediaQuery.of(context).padding.bottom + 8,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.12),
          ),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => _showPlusMenu(context, sessionId),
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              focusNode: _focusNode,
              enabled: !chatState.isStreaming,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(sessionId),
              decoration: InputDecoration(
                hintText: S.of(context).chatAskCoachHint,
                border: InputBorder.none,
              ),
              maxLines: 4,
              minLines: 1,
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed:
                chatState.isStreaming ? null : () => _sendMessage(sessionId),
            icon: chatState.isStreaming
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme, S s) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.auto_awesome,
              size: 64,
              color: theme.colorScheme.primary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 24),
            Text(
              s.chatYourAiRunningCoach,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              s.chatIntroDescription,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: _suggestedPrompts(s).map((prompt) {
                return ActionChip(
                  label: Text(prompt),
                  onPressed: () => _startSessionWithPrompt(prompt),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _createNewSession,
              icon: const Icon(Icons.add),
              label: Text(s.chatNewChat),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error, String sessionId) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.error),
          const SizedBox(height: 16),
          Text(S.of(context).statusError,
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: () => ref
                .read(chatMessagesProvider(sessionId).notifier)
                .refresh(),
            child: Text(S.of(context).actionRetry),
          ),
        ],
      ),
    );
  }

  Future<void> _createNewSession() async {
    try {
      final session =
          await ref.read(chatSessionsProvider.notifier).createSession();
      ref.read(currentSessionIdProvider.notifier).set(session.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).chatFailedToCreateSession(e.toString()))),
        );
      }
    }
  }

  Future<void> _startSessionWithPrompt(String prompt) async {
    try {
      final session =
          await ref.read(chatSessionsProvider.notifier).createSession();
      ref.read(currentSessionIdProvider.notifier).set(session.id);
      _messageController.text = prompt;
      _sendMessage(session.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).chatFailedToStartSession(e.toString()))),
        );
      }
    }
  }

  void _showSessionsDrawer(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => const _SessionsSheet(),
    );
  }

  void _showPlusMenu(BuildContext context, String sessionId) {
    final s = S.of(context);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppColors.primary),
              title: Text(s.chatCalorieSnap),
              onTap: () {
                Navigator.pop(context);
                context.push('/health/ai-scan').then((result) {
                  if (result != null && result is FoodItem) {
                    final msg = 'I just ate ${result.name}. It has ${result.calories.toStringAsFixed(0)} kcal (${result.protein.toStringAsFixed(0)}g protein, ${result.carbs.toStringAsFixed(0)}g carbs, ${result.fat.toStringAsFixed(0)}g fat).';
                    _messageController.text = msg;
                    _sendMessage(sessionId);
                  }
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.book, color: AppColors.primary),
              title: Text(s.chatPromptLibrary),
              onTap: () {
                Navigator.pop(context);
                _showPromptLibrary(context, sessionId);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showPromptLibrary(BuildContext context, String sessionId) {
    final s = S.of(context);
    final categories = {
      s.chatCategoryTraining: [
        s.chatPromptTaperRace,
        s.chatPromptAnalyzeLoad,
        s.chatPromptPaceLongRun,
      ],
      s.chatCategoryRecovery: [
        s.chatPromptSleepPeak,
        s.chatPromptOvertraining,
        s.chatPromptRecoveryMarathon,
      ],
      s.chatCategoryNutrition: [
        s.chatPromptEatBeforeLongRun,
        s.chatPromptFuelHalfMarathon,
        s.chatPromptPostRunProtein,
      ],
      s.chatCategoryPacing: [
        s.chatPromptPredicted5k,
        s.chatPromptHillyMarathon,
        s.chatPromptNegativeSplits,
      ],
    };

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.3,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      s.chatPromptLibrary,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: categories.entries.map((category) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            category.key,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                        ),
                        ...category.value.map((prompt) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(prompt, style: Theme.of(context).textTheme.bodyMedium),
                              trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                              onTap: () {
                                Navigator.pop(context);
                                _messageController.text = prompt;
                                _sendMessage(sessionId);
                              },
                            )),
                        const Divider(),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.theme});

  final ChatMessage message;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == ChatMessageRole.user;
    final cleanedContent = isUser ? message.content : _cleanChatContent(message.content);
    final isMealLogged = cleanedContent.contains('<!-- MEAL_LOGGED_WIDGET -->');
    final finalContent = cleanedContent.replaceAll('<!-- MEAL_LOGGED_WIDGET -->', '').trim();

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        decoration: BoxDecoration(
          color: isUser
              ? theme.colorScheme.primary
              : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isUser)
              Text(
                finalContent,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onPrimary,
                ),
              )
            else
              MarkdownBody(
                data: finalContent,
                styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
                  p: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ),
            if (isMealLogged)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.tertiaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(Icons.restaurant, color: theme.colorScheme.onTertiaryContainer),
                    const SizedBox(width: 8),
                    Text(S.of(context).chatMealLogged, style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onTertiaryContainer,
                      fontWeight: FontWeight.bold,
                    )),
                  ],
                ),
              ),
            const SizedBox(height: 4),
            Text(
              _formatTimeAgo(message.createdAt, S.of(context)),
              style: theme.textTheme.labelSmall?.copyWith(
                color: isUser
                    ? theme.colorScheme.onPrimary.withValues(alpha: 0.7)
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator({required this.theme});

  final ThemeData theme;

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: widget.theme.colorScheme.surfaceContainerHighest,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(16),
          ),
        ),
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (index) {
                final progress =
                    (_controller.value * 3 - index).clamp(0.0, 1.0);
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: widget.theme.colorScheme.onSurfaceVariant
                        .withValues(alpha: 0.3 + 0.7 * progress),
                    shape: BoxShape.circle,
                  ),
                );
              }),
            );
          },
        ),
      ),
    );
  }
}

class _SessionsSheet extends ConsumerWidget {
  const _SessionsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(chatSessionsProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    S.of(context).chatChatHistory,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Expanded(
              child: sessionsAsync.when(
                data: (sessions) {
                  if (sessions.isEmpty) {
                    return Center(
                      child: Text(S.of(context).chatNoSessions),
                    );
                  }
                  return ListView.builder(
                    controller: scrollController,
                    itemCount: sessions.length,
                    itemBuilder: (context, index) {
                      final session = sessions[index];
                      return _SessionTile(session: session);
                    },
                  );
                },
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Text('${S.of(context).actionError}: $e'),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SessionTile extends ConsumerWidget {
  const _SessionTile({required this.session});

  final ChatSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Dismissible(
      key: ValueKey(session.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: AppColors.error,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      confirmDismiss: (_) async {
        return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(S.of(context).chatDeleteChat),
            content: Text(
                S.of(context).chatDeleteConfirm(session.title)),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(S.of(context).actionCancel),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(S.of(context).actionDelete),
              ),
            ],
          ),
        );
      },
      onDismissed: (_) {
        ref.read(chatSessionsProvider.notifier).deleteSession(session.id);
        final currentId = ref.read(currentSessionIdProvider);
        if (currentId == session.id) {
          ref.read(currentSessionIdProvider.notifier).set(null);
        }
      },
      child: ListTile(
        title: Text(session.title),
        subtitle: Text(_formatTimeAgo(session.updatedAt, S.of(context))),
        leading: const Icon(Icons.chat_bubble_outline),
        onTap: () {
          ref.read(currentSessionIdProvider.notifier).set(session.id);
          Navigator.pop(context);
        },
      ),
    );
  }
}
