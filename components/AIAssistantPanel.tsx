import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated as RNAnimated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useAIAssistant } from '../context/AIAssistantContext';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from './tracker/utils/colors';
import { HealthCoachFirstUseModal, HealthCoachDisclaimer } from './legal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.6;
const MINIMIZED_HEIGHT = 50;

// Chef hat icon
function ChefHatIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4C10.35 4 9 5.35 9 7C9 7.35 9.07 7.69 9.19 8H6C4.35 8 3 9.35 3 11C3 12.3 3.84 13.41 5 13.82V18C5 19.1 5.9 20 7 20H17C18.1 20 19 19.1 19 18V13.82C20.16 13.41 21 12.3 21 11C21 9.35 19.65 8 18 8H14.81C14.93 7.69 15 7.35 15 7C15 5.35 13.65 4 12 4Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9 16H15"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AIAssistantPanel() {
  const {
    isOpen,
    isMinimized,
    openPanel,
    closePanel,
    minimizePanel,
    messages,
    isLoading,
    sendMessage,
    clearConversation,
    pageContext,
    getQuickActions,
  } = useAIAssistant();

  const [inputText, setInputText] = React.useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const buttonScale = useSharedValue(1);
  const panelTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Update panel position based on state
  useEffect(() => {
    if (isOpen && !isMinimized) {
      panelTranslateY.value = withSpring(SCREEN_HEIGHT - PANEL_HEIGHT, {
        damping: 20,
        stiffness: 150,
      });
    } else if (isOpen && isMinimized) {
      panelTranslateY.value = withSpring(SCREEN_HEIGHT - MINIMIZED_HEIGHT - 80, {
        damping: 20,
        stiffness: 150,
      });
    } else {
      panelTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
    }
  }, [isOpen, isMinimized]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, isMinimized]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isOpen && !isMinimized) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isOpen, isMinimized]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelTranslateY.value }],
  }));

  const handleButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSpring(0.9, {}, () => {
      buttonScale.value = withSpring(1);
    });
    openPanel();
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    await sendMessage(text);
  };

  const handleQuickAction = async (message: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(message);
  };

  const getContextLabel = () => {
    if (pageContext.dishName && pageContext.screen === 'dish_detail') {
      return `Viewing: ${pageContext.dishName}`;
    }
    if (pageContext.restaurantName && pageContext.screen === 'restaurant') {
      return `At: ${pageContext.restaurantName}`;
    }
    if (pageContext.screen === 'tracker') {
      return 'In your tracker';
    }
    return 'Ready to help';
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';

    if (item.isLoading) {
      return (
        <View style={[styles.messageRow, styles.messageRowAssistant]}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.avatar}
            >
              <ChefHatIcon size={14} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.avatar}
            >
              <ChefHatIcon size={14} color="#FFFFFF" />
            </LinearGradient>
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    if (messages.length > 1) return null;

    const actions = getQuickActions();

    return (
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Quick questions</Text>
        <View style={styles.quickActionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionChip}
              onPress={() => handleQuickAction(action.message)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Don't render button if panel is open
  const showButton = !isOpen;

  return (
    <>
      {/* Floating Button */}
      {showButton && (
        <AnimatedTouchable
          style={[styles.floatingButton, buttonAnimatedStyle]}
          onPress={handleButtonPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.floatingButtonGradient}
          >
            <ChefHatIcon size={26} color="#FFFFFF" />
          </LinearGradient>
        </AnimatedTouchable>
      )}

      {/* Backdrop */}
      {isOpen && !isMinimized && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={minimizePanel}
        />
      )}

      {/* Panel */}
      <Animated.View style={[styles.panel, panelAnimatedStyle]}>
        {/* Minimized Bar */}
        {isMinimized ? (
          <TouchableOpacity
            style={styles.minimizedBar}
            onPress={openPanel}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.minimizedBarGradient}
            >
              <View style={styles.minimizedContent}>
                <ChefHatIcon size={20} color="#FFFFFF" />
                <Text style={styles.minimizedText}>AI Assistant</Text>
                {messages.length > 1 && (
                  <Text style={styles.minimizedCount}>({messages.length - 1})</Text>
                )}
              </View>
              <Text style={styles.minimizedHint}>Tap to expand</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.panelContent}>
            {/* Handle bar */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  style={styles.headerAvatar}
                >
                  <ChefHatIcon size={16} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={styles.headerTitle}>AI Assistant</Text>
                  <Text style={styles.headerSubtitle}>{getContextLabel()}</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                {messages.length > 1 && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={clearConversation}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={minimizePanel}
                >
                  <Ionicons name="remove" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={closePanel}
                >
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Disclaimer */}
            <HealthCoachDisclaimer style={{ paddingHorizontal: 16, paddingBottom: 8 }} />

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderQuickActions}
              keyboardShouldPersistTaps="handled"
            />

            {/* Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={0}
            >
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    placeholder="Ask about nutrition, dishes..."
                    placeholderTextColor={COLORS.textMuted}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                    editable={!isLoading}
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={
                        inputText.trim() && !isLoading
                          ? [COLORS.primary, COLORS.secondary]
                          : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)']
                      }
                      style={styles.sendButtonGradient}
                    >
                      <Ionicons
                        name="send"
                        size={16}
                        color={inputText.trim() && !isLoading ? '#FFFFFF' : COLORS.textMuted}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </Animated.View>

      {/* Health Coach First Use Modal */}
      <HealthCoachFirstUseModal />
    </>
  );
}

const styles = StyleSheet.create({
  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Backdrop
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },

  // Panel
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    zIndex: 999,
  },
  panelContent: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    overflow: 'hidden',
  },

  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },

  // Minimized Bar
  minimizedBar: {
    height: MINIMIZED_HEIGHT,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  minimizedBarGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  minimizedText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  minimizedCount: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  minimizedHint: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },

  // Messages
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.sm,
  },
  assistantBubble: {
    backgroundColor: COLORS.cardBg,
    borderBottomLeftRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  typingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },

  // Quick Actions
  quickActionsContainer: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  quickActionsTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  quickActionChip: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },

  // Input
  inputContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    maxHeight: 80,
    paddingVertical: SPACING.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
