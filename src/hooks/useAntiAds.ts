import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BlockedDomain {
  id: string;
  domain: string;
  is_active: boolean;
}

interface FilterResult {
  text: string;
  wasFiltered: boolean;
  detectedDomains: string[];
}

// Cache for blocked domains
let cachedDomains: BlockedDomain[] = [];
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute

export const useAntiAds = () => {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedDomains = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedDomains.length > 0 && now - lastFetch < CACHE_DURATION) {
      setBlockedDomains(cachedDomains);
      setLoading(false);
      return cachedDomains;
    }

    try {
      const { data, error } = await supabase
        .from('blocked_domains')
        .select('id, domain, is_active')
        .eq('is_active', true);

      if (error) throw error;

      cachedDomains = data || [];
      lastFetch = now;
      setBlockedDomains(cachedDomains);
      return cachedDomains;
    } catch (error) {
      console.error('Error fetching blocked domains:', error);
      return cachedDomains;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedDomains();
  }, [fetchBlockedDomains]);

  return { blockedDomains, loading, refetch: () => fetchBlockedDomains(true) };
};

// Standalone filter function for use without hook
export const filterAdvertising = async (
  text: string,
  userId?: string,
  targetUserId?: string,
  contextType?: string,
  contextId?: string
): Promise<FilterResult> => {
  console.log('[AntiAds] filterAdvertising called with:', { text, userId, targetUserId, contextType });
  
  if (!text || text.trim() === '') {
    console.log('[AntiAds] Empty text, skipping');
    return { text, wasFiltered: false, detectedDomains: [] };
  }

  // Fetch domains if cache is stale
  const now = Date.now();
  console.log('[AntiAds] Cache status:', { cachedDomainsCount: cachedDomains.length, cacheAge: now - lastFetch, CACHE_DURATION });
  
  if (cachedDomains.length === 0 || now - lastFetch > CACHE_DURATION) {
    console.log('[AntiAds] Fetching blocked domains from DB...');
    try {
      const { data, error } = await supabase
        .from('blocked_domains')
        .select('id, domain, is_active')
        .eq('is_active', true);
      
      console.log('[AntiAds] Fetched domains:', { data, error });
      
      if (data) {
        cachedDomains = data;
        lastFetch = now;
      }
    } catch (error) {
      console.error('[AntiAds] Error fetching blocked domains:', error);
    }
  }

  console.log('[AntiAds] Domains to check:', cachedDomains.map(d => d.domain));

  if (cachedDomains.length === 0) {
    console.log('[AntiAds] No blocked domains, returning original text');
    return { text, wasFiltered: false, detectedDomains: [] };
  }

  let filteredText = text;
  const detectedDomains: string[] = [];

  for (const { domain } of cachedDomains) {
    // Create regex that matches the domain with various prefixes/suffixes
    // Matches: domain.com, www.domain.com, http://domain.com, https://domain.com, domain.com/path
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(https?:\\/\\/)?(www\\.)?${escapedDomain}(\\/[^\\s]*)?`,
      'gi'
    );

    // Check if domain exists in text and replace
    const newText = filteredText.replace(regex, (match) => {
      if (!detectedDomains.includes(domain)) {
        detectedDomains.push(domain);
      }
      return '❄'.repeat(Math.min(match.length, 10));
    });
    
    filteredText = newText;
  }

  // Log violation if detected
  if (detectedDomains.length > 0 && userId) {
    try {
      await supabase.from('ad_violations').insert({
        user_id: userId,
        target_user_id: targetUserId || null,
        original_text: text,
        filtered_text: filteredText,
        detected_domain: detectedDomains[0],
        context_type: contextType || 'unknown',
        context_id: contextId || null
      });
    } catch (error) {
      console.error('Error logging ad violation:', error);
    }
  }

  return {
    text: filteredText,
    wasFiltered: detectedDomains.length > 0,
    detectedDomains
  };
};

// Sync version for immediate filtering (uses cached domains)
export const filterAdvertisingSync = (text: string): FilterResult => {
  if (!text || text.trim() === '' || cachedDomains.length === 0) {
    return { text, wasFiltered: false, detectedDomains: [] };
  }

  let filteredText = text;
  const detectedDomains: string[] = [];

  for (const { domain } of cachedDomains) {
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(https?:\\/\\/)?(www\\.)?${escapedDomain}(\\/[^\\s]*)?`,
      'gi'
    );

    const newText = filteredText.replace(regex, (match) => {
      if (!detectedDomains.includes(domain)) {
        detectedDomains.push(domain);
      }
      return '❄'.repeat(Math.min(match.length, 10));
    });
    
    filteredText = newText;
  }

  return {
    text: filteredText,
    wasFiltered: detectedDomains.length > 0,
    detectedDomains
  };
};

// Preload domains on app start
export const preloadBlockedDomains = async () => {
  try {
    const { data } = await supabase
      .from('blocked_domains')
      .select('id, domain, is_active')
      .eq('is_active', true);
    
    if (data) {
      cachedDomains = data;
      lastFetch = Date.now();
    }
  } catch (error) {
    console.error('Error preloading blocked domains:', error);
  }
};
