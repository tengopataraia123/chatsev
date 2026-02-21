import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BlockedWord {
  id: string;
  word: string;
  is_active: boolean;
}

// Cache for blocked words
let cachedWords: BlockedWord[] = [];
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute

export const useWordFilter = () => {
  const [blockedWords, setBlockedWords] = useState<BlockedWord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedWords = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedWords.length > 0 && now - lastFetch < CACHE_DURATION) {
      setBlockedWords(cachedWords);
      setLoading(false);
      return cachedWords;
    }

    try {
      const { data, error } = await supabase
        .from('blocked_words')
        .select('id, word, is_active')
        .eq('is_active', true);

      if (error) throw error;

      cachedWords = data || [];
      lastFetch = now;
      setBlockedWords(cachedWords);
      return cachedWords;
    } catch (error) {
      console.error('Error fetching blocked words:', error);
      return cachedWords;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedWords();
  }, [fetchBlockedWords]);

  return { blockedWords, loading, refetch: () => fetchBlockedWords(true) };
};

// Sync version for immediate filtering (uses cached words)
export const filterWordsSync = (text: string): string => {
  if (!text || text.trim() === '' || cachedWords.length === 0) {
    return text;
  }

  let filteredText = text;

  for (const { word } of cachedWords) {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  }

  return filteredText;
};

// Preload words on app start
export const preloadBlockedWords = async () => {
  try {
    const { data } = await supabase
      .from('blocked_words')
      .select('id, word, is_active')
      .eq('is_active', true);
    
    if (data) {
      cachedWords = data;
      lastFetch = Date.now();
    }
  } catch (error) {
    console.error('Error preloading blocked words:', error);
  }
};
