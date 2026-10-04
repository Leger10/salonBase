// src/hooks/useIntegratedAi.js (version Supabase simplifiée)
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useIntegratedAi({ endpointUrl = '/functions/v1/ai-chat' } = {}) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (userMessage, images = []) => {
    setIsStreaming(true);
    
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: userMessage, images }
      });

      if (error) throw error;

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: data.response || 'Désolé, je n\'ai pas pu traiter votre demande.'
        };
        return updated;
      });
    } catch (err) {
      console.error('AI Error:', err);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, clearMessages };
}