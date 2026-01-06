import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { sendAssistantMessage, AIMenuContext } from '../api/api';
import { getCurrentUserId } from './AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface PageContext {
  screen: string;
  placeId: string | null;
  restaurantName: string | null;
  dishId: string | null;
  dishName: string | null;
}

interface AIAssistantContextType {
  // Panel state
  isOpen: boolean;
  isMinimized: boolean;
  openPanel: () => void;
  closePanel: () => void;
  minimizePanel: () => void;
  togglePanel: () => void;

  // Conversation state
  messages: Message[];
  conversationId: number | null;
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;

  // Page context (updates as user navigates)
  pageContext: PageContext;
  setPageContext: (context: Partial<PageContext>) => void;

  // Quick actions based on context
  getQuickActions: () => Array<{ label: string; message: string }>;
}

const AIAssistantContext = createContext<AIAssistantContextType | null>(null);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  // Panel visibility state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Current page context
  const [pageContext, setPageContextState] = useState<PageContext>({
    screen: 'home',
    placeId: null,
    restaurantName: null,
    dishId: null,
    dishName: null,
  });

  // Track if we've shown the welcome message
  const hasShownWelcome = useRef(false);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);

    // Add welcome message on first open
    if (!hasShownWelcome.current && messages.length === 0) {
      hasShownWelcome.current = true;
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your nutrition coach. I can help you make better food choices based on your health profile, today's meals, and your goals. What would you like to know?",
        timestamp: new Date(),
      }]);
    }
  }, [messages.length]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const minimizePanel = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const togglePanel = useCallback(() => {
    if (isOpen && !isMinimized) {
      minimizePanel();
    } else {
      openPanel();
    }
  }, [isOpen, isMinimized, openPanel, minimizePanel]);

  const setPageContext = useCallback((context: Partial<PageContext>) => {
    setPageContextState(prev => ({
      ...prev,
      ...context,
    }));
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userId = await getCurrentUserId();

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    // Add loading message
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      // Include page context in the message for better responses
      let contextualMessage = message.trim();

      // Add context hint for the AI
      if (pageContext.dishName && pageContext.screen === 'dish_detail') {
        contextualMessage = `[User is viewing dish: ${pageContext.dishName}${pageContext.restaurantName ? ` at ${pageContext.restaurantName}` : ''}] ${contextualMessage}`;
      } else if (pageContext.restaurantName && pageContext.screen === 'restaurant') {
        contextualMessage = `[User is browsing menu at: ${pageContext.restaurantName}] ${contextualMessage}`;
      } else if (pageContext.screen === 'tracker') {
        contextualMessage = `[User is viewing their daily tracker] ${contextualMessage}`;
      }

      // Build menu context if on restaurant screen with placeId
      // Backend will fetch the full menu using placeId
      let menuContext: AIMenuContext | null = null;
      if (pageContext.screen === 'restaurant' && pageContext.restaurantName && pageContext.placeId) {
        menuContext = {
          restaurantName: pageContext.restaurantName,
          placeId: pageContext.placeId,
        };
      }

      const response = await sendAssistantMessage(userId, contextualMessage, conversationId, menuContext);

      if (response.ok && response.response) {
        if (response.conversation_id && !conversationId) {
          setConversationId(response.conversation_id);
        }

        // Replace loading message with actual response
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isLoading);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: response.response!,
              timestamp: new Date(),
            },
          ];
        });
      } else {
        // Error response
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isLoading);
          return [
            ...filtered,
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: "Sorry, I couldn't process your request. Please try again.",
              timestamp: new Date(),
            },
          ];
        });
      }
    } catch (error) {
      if (__DEV__) console.error('Chat error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: "Something went wrong. Please check your connection and try again.",
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, pageContext]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    hasShownWelcome.current = false;
  }, []);

  const getQuickActions = useCallback(() => {
    const actions: Array<{ label: string; message: string }> = [];

    // Context-specific actions
    if (pageContext.dishName && pageContext.screen === 'dish_detail') {
      actions.push({ label: '🔍 Is this safe for me?', message: 'Is this dish safe for me given my allergies and sensitivities?' });
      actions.push({ label: '🔄 Find alternatives', message: 'What are some healthier alternatives to this dish?' });
      actions.push({ label: '📊 Nutrition breakdown', message: 'Give me a detailed nutrition breakdown of this dish' });
    } else if (pageContext.restaurantName && pageContext.screen === 'restaurant') {
      actions.push({ label: '✨ Best options here', message: 'What are the healthiest options at this restaurant for me?' });
      actions.push({ label: '⚠️ What to avoid', message: 'What should I avoid ordering here based on my profile?' });
    } else if (pageContext.screen === 'tracker') {
      actions.push({ label: '📊 Today\'s progress', message: 'How am I doing with my nutrition goals today?' });
      actions.push({ label: '🍽️ Meal suggestions', message: 'What should I eat for my next meal to balance my macros?' });
    }

    // Always available actions
    actions.push({ label: '💧 Hydration check', message: 'Am I drinking enough water today?' });
    actions.push({ label: '🎯 Goal check', message: 'How am I progressing towards my health goals?' });

    return actions.slice(0, 4); // Max 4 quick actions
  }, [pageContext]);

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        isMinimized,
        openPanel,
        closePanel,
        minimizePanel,
        togglePanel,
        messages,
        conversationId,
        isLoading,
        sendMessage,
        clearConversation,
        pageContext,
        setPageContext,
        getQuickActions,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
}

// Hook for pages to update context
export function useSetAIContext(context: {
  screen: string;
  placeId?: string | null;
  restaurantName?: string | null;
  dishId?: string | null;
  dishName?: string | null;
}) {
  const { setPageContext } = useAIAssistant();

  React.useEffect(() => {
    setPageContext({
      screen: context.screen,
      placeId: context.placeId ?? null,
      restaurantName: context.restaurantName ?? null,
      dishId: context.dishId ?? null,
      dishName: context.dishName ?? null,
    });
  }, [
    context.screen,
    context.placeId,
    context.restaurantName,
    context.dishId,
    context.dishName,
    setPageContext,
  ]);
}
