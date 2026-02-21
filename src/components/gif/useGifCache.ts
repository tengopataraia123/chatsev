import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Gif {
  id: string;
  title: string;
  file_original: string;
  file_preview: string | null;
  category_id: string | null;
  usage_count?: number;
  created_at?: string;
  shortcode?: string | null;
}

interface CategoryWithCount {
  id: string;
  name: string;
  gif_count: number;
}

interface GifCache {
  categories: CategoryWithCount[];
  gifsByCategory: Map<string, Gif[]>;
  lastFetch: number;
  preloadedImages: Set<string>;
  preloadingCategories: Set<string>;
}

// Global cache
const globalCache: GifCache = {
  categories: [],
  gifsByCategory: new Map(),
  lastFetch: 0,
  preloadedImages: new Set(),
  preloadingCategories: new Set()
};

const CACHE_TTL = 10 * 60 * 1000;

// Ultra-fast parallel image preloader with priority
const preloadImagesParallel = (urls: string[], concurrency = 20, highPriority = false): void => {
  const toLoad = urls.filter(url => !globalCache.preloadedImages.has(url));
  if (toLoad.length === 0) return;

  let index = 0;
  
  const loadNext = () => {
    if (index >= toLoad.length) return;
    
    const url = toLoad[index++];
    
    // Use link preload for high priority (browser-native, fastest)
    if (highPriority && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      link.onload = () => {
        globalCache.preloadedImages.add(url);
        loadNext();
      };
      link.onerror = () => loadNext();
      document.head.appendChild(link);
      // Clean up after load
      setTimeout(() => link.remove(), 5000);
    } else {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        globalCache.preloadedImages.add(url);
        loadNext();
      };
      img.onerror = () => loadNext();
      img.src = url;
    }
  };

  // Start concurrent loaders - more for faster loading
  for (let i = 0; i < Math.min(concurrency, toLoad.length); i++) {
    loadNext();
  }
};

export const useGifCache = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>(globalCache.categories);
  const [loading, setLoading] = useState(globalCache.categories.length === 0);
  const initialLoadDone = useRef(false);

  const isCacheValid = useCallback(() => {
    return Date.now() - globalCache.lastFetch < CACHE_TTL && globalCache.categories.length > 0;
  }, []);

  const prefetchAll = useCallback(async (force = false) => {
    if (!force && isCacheValid()) {
      setCategories(globalCache.categories);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [categoriesResult, gifsResult] = await Promise.all([
        supabase
          .from('gif_categories')
          .select('id, name, sort_order')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('gifs')
          .select('id, title, file_original, file_preview, category_id, usage_count, created_at, shortcode')
          .eq('status', 'active')
          .order('usage_count', { ascending: false })
      ]);

      const categoriesData = categoriesResult.data || [];
      const gifsData = gifsResult.data || [];

      const gifsByCategory = new Map<string, Gif[]>();
      const countMap: Record<string, number> = {};

      gifsData.forEach(gif => {
        if (gif.category_id) {
          countMap[gif.category_id] = (countMap[gif.category_id] || 0) + 1;
          if (!gifsByCategory.has(gif.category_id)) {
            gifsByCategory.set(gif.category_id, []);
          }
          gifsByCategory.get(gif.category_id)!.push(gif);
        }
      });

      const categoriesWithCount: CategoryWithCount[] = categoriesData.map(cat => ({
        id: cat.id,
        name: cat.name,
        gif_count: countMap[cat.id] || 0
      }));

      globalCache.categories = categoriesWithCount;
      globalCache.gifsByCategory = gifsByCategory;
      globalCache.lastFetch = Date.now();

      setCategories(categoriesWithCount);

      // Aggressively preload first 50 images from first 5 categories with high priority
      categoriesWithCount.slice(0, 5).forEach((cat, idx) => {
        const categoryGifs = gifsByCategory.get(cat.id) || [];
        const urls = categoryGifs.slice(0, 50).map(g => g.file_preview || g.file_original);
        // First 2 categories get high priority browser preload
        preloadImagesParallel(urls, 30, idx < 2);
      });

    } catch (error) {
      console.error('Error prefetching GIFs:', error);
    } finally {
      setLoading(false);
    }
  }, [isCacheValid]);

  // Ultra-aggressive category preload with high priority
  const preloadCategory = useCallback((categoryId: string) => {
    if (globalCache.preloadingCategories.has(categoryId)) return;
    globalCache.preloadingCategories.add(categoryId);
    
    const gifs = globalCache.gifsByCategory.get(categoryId) || [];
    const urls = gifs.map(g => g.file_preview || g.file_original);
    
    // Load ALL images with maximum concurrency and high priority
    preloadImagesParallel(urls, 40, true);
  }, []);

  const getGifsForCategory = useCallback((categoryId: string, sortBy: string = 'popularity', searchQuery: string = '') => {
    let gifs = globalCache.gifsByCategory.get(categoryId) || [];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      gifs = gifs.filter(gif => gif.title.toLowerCase().includes(query));
    }
    
    const sortedGifs = [...gifs];
    switch (sortBy) {
      case 'popularity':
        sortedGifs.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        break;
      case 'newest':
        sortedGifs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'oldest':
        sortedGifs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'alphabetical':
        sortedGifs.sort((a, b) => a.title.localeCompare(b.title, 'ka'));
        break;
      case 'alphabetical_desc':
        sortedGifs.sort((a, b) => b.title.localeCompare(a.title, 'ka'));
        break;
    }
    
    return sortedGifs.slice(0, 100);
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      prefetchAll();
    }
  }, [prefetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('gif-cache-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gifs' }, () => {
        globalCache.preloadingCategories.clear();
        prefetchAll(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gif_categories' }, () => {
        prefetchAll(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prefetchAll]);

  // Get GIF by shortcode synchronously from cache
  const getGifByShortcode = useCallback((shortcode: string): Gif | null => {
    const normalized = shortcode.replace(/^\.|\.$/g, '').toLowerCase();
    
    for (const gifs of globalCache.gifsByCategory.values()) {
      const found = gifs.find(g => g.shortcode?.toLowerCase() === normalized);
      if (found) return found;
    }
    return null;
  }, []);

  return {
    categories,
    loading,
    getGifsForCategory,
    preloadCategory,
    getGifByShortcode,
    refreshCache: () => prefetchAll(true)
  };
};

// Synchronous global helper to get GIF by shortcode (for use outside hooks)
export const getGifByShortcodeSync = (shortcode: string): { id: string; file_original: string; shortcode: string | null } | null => {
  // Normalize: handle both .ბა9. and ბა9 formats
  const cleanShortcode = shortcode.replace(/^\.|\.$/g, '').toLowerCase();
  const fullShortcode = `.${cleanShortcode}.`.toLowerCase();
  
  for (const gifs of globalCache.gifsByCategory.values()) {
    const found = gifs.find(g => {
      if (!g.shortcode) return false;
      const gifShortcode = g.shortcode.toLowerCase();
      // Match either exact full format or clean format
      return gifShortcode === fullShortcode || 
             gifShortcode === cleanShortcode ||
             gifShortcode.replace(/^\.|\.$/g, '') === cleanShortcode;
    });
    if (found) return { id: found.id, file_original: found.file_original, shortcode: found.shortcode || null };
  }
  return null;
};

// Start loading immediately when module loads
if (typeof window !== 'undefined') {
  Promise.all([
    supabase
      .from('gif_categories')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('gifs')
      .select('id, title, file_original, file_preview, category_id, usage_count, created_at, shortcode')
      .eq('status', 'active')
      .order('usage_count', { ascending: false })
  ]).then(([categoriesResult, gifsResult]) => {
    const categoriesData = categoriesResult.data || [];
    const gifsData = gifsResult.data || [];
    
    const gifsByCategory = new Map<string, Gif[]>();
    const countMap: Record<string, number> = {};

    gifsData.forEach(gif => {
      if (gif.category_id) {
        countMap[gif.category_id] = (countMap[gif.category_id] || 0) + 1;
        if (!gifsByCategory.has(gif.category_id)) {
          gifsByCategory.set(gif.category_id, []);
        }
        gifsByCategory.get(gif.category_id)!.push(gif);
      }
    });

    globalCache.categories = categoriesData.map(cat => ({
      id: cat.id,
      name: cat.name,
      gif_count: countMap[cat.id] || 0
    }));
    globalCache.gifsByCategory = gifsByCategory;
    globalCache.lastFetch = Date.now();

    // Immediately preload first 60 images from all categories with high priority
    globalCache.categories.forEach((cat, idx) => {
      const categoryGifs = gifsByCategory.get(cat.id) || [];
      const urls = categoryGifs.slice(0, 60).map(g => g.file_preview || g.file_original);
      // First 3 categories get browser-native high priority preload
      preloadImagesParallel(urls, 40, idx < 3);
    });
  });
}
