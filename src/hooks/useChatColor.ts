import { useState, useEffect, useCallback } from 'react';

const DEFAULT_STORAGE_KEY = 'group_chat_background_color';

export const useChatColor = (roomKey?: string) => {
  const storageKey = roomKey ? `chat_background_color_${roomKey}` : DEFAULT_STORAGE_KEY;
  
  const [chatColor, setChatColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || '';
    }
    return '';
  });

  useEffect(() => {
    if (chatColor) {
      localStorage.setItem(storageKey, chatColor);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [chatColor, storageKey]);

  const setColor = useCallback((color: string) => {
    setChatColor(color);
  }, []);

  return { chatColor, setChatColor: setColor };
};

export default useChatColor;
