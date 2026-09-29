import React, { useState, useEffect } from 'react';
import MessageList from '../components/chat/MessageList';
import Composer from '../components/chat/Composer';
import EmptyState from '../components/chat/EmptyState';
import { streamChat, getConversation, startNewDemoSession } from '../services/api';

export default function ChatPage({
  conversationId,
  onConversationCreated,
  onRefreshSidebar,
}) {
  const [messages, setMessages] = useState([]);
  const [streamingStatus, setStreamingStatus] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const [externalPrompt, setExternalPrompt] = useState('');
  const [lastMemorySaved, setLastMemorySaved] = useState(null);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([]);
      setError(null);
      setStreamingStatus(null);
      setStreamingText('');
      setLastMemorySaved(null);
    }
  }, [conversationId]);

  const loadConversation = async (id) => {
    try {
      const res = await getConversation(id);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const handleSendMessage = async (text, useMemory = true) => {
    setIsLoading(true);
    setError(null);
    setStreamingStatus('Analyzing intent…');
    setStreamingText('');
    setLastPrompt(text);

    // Append user message immediately
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    let accumulatedText = '';

    try {
      await streamChat(text, conversationId, useMemory, {
        onStatus: (status) => {
          setStreamingStatus(status);
        },
        onToken: (token) => {
          accumulatedText += token;
          setStreamingText(accumulatedText);
        },
        onFinal: (response) => {
          setStreamingStatus(null);
          setStreamingText('');
          setIsLoading(false);

          if (!conversationId && response.conversation_id) {
            if (onConversationCreated) {
              onConversationCreated(response.conversation_id);
            }
          }

          const assistantMsg = {
            role: 'assistant',
            content: response.answer,
            sources: response.sources || [],
            report: response.report,
            intent: response.intent,
            suggestions: response.suggestions || [],
            memory_indexed: response.memory_indexed,
          };

          setMessages((prev) => [...prev, assistantMsg]);
          setLastMemorySaved(response.memory_saved);
          if (onRefreshSidebar) onRefreshSidebar();
        },
        onError: (err) => {
          console.error('Stream chat error:', err);
          setStreamingStatus(null);
          setStreamingText('');
          setIsLoading(false);
          setError(err.message || 'Failed to complete chat request. Please try again.');
        },
      });
    } catch (err) {
      console.error('Submit error:', err);
      setStreamingStatus(null);
      setStreamingText('');
      setIsLoading(false);
      setError(err.message || 'Connection error');
    }
  };

  const handleStartDemo = async () => {
    setIsLoading(true);
    setStreamingStatus('Initializing fresh Hindsight bank session…');
    try {
      await startNewDemoSession();
      setStreamingStatus(null);
      setIsLoading(false);

      // Load Act 1 into composer with a guided suggestion
      setExternalPrompt(
        "Finance user opened invoice_7482.docm and PowerShell executed on FIN-WS-042 beaconing to 198.51.100.45"
      );
    } catch (err) {
      console.error('Failed to start demo session:', err);
      setStreamingStatus(null);
      setIsLoading(false);
      setExternalPrompt(
        "Finance user opened invoice_7482.docm and PowerShell executed on FIN-WS-042 beaconing to 198.51.100.45"
      );
    }
  };

  return (
    <div className="chat-container">
      {messages.length === 0 ? (
        <EmptyState
          onSelectPrompt={(prompt) => setExternalPrompt(prompt)}
          onStartDemo={handleStartDemo}
        />
      ) : (
        <MessageList
          messages={messages}
          streamingStatus={streamingStatus}
          streamingText={streamingText}
          error={error}
          onRetry={() => lastPrompt && handleSendMessage(lastPrompt)}
          onSuggestionClick={(sug) => setExternalPrompt(sug)}
        />
      )}

      <Composer
        onSend={handleSendMessage}
        disabled={isLoading}
        lastMemorySaved={lastMemorySaved}
        externalPrompt={externalPrompt}
      />
    </div>
  );
}
