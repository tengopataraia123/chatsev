import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { filterAdvertising } from '@/hooks/useAntiAds';
import { UserBio, BioContent, BioHistory, BIO_HISTORY_LIMIT } from '@/components/bio/types';

export const useBio = (userId?: string) => {
  const [bio, setBio] = useState<UserBio | null>(null);
  const [history, setHistory] = useState<BioHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isOwnBio = userId === user?.id || !userId;
  const targetUserId = userId || user?.id;

  const fetchBio = useCallback(async () => {
    if (!targetUserId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_bios')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setBio({
          ...data,
          visibility: data.visibility as 'public' | 'friends' | 'hidden',
          content_json: (data.content_json as unknown as BioContent[]) || []
        });
      } else {
        setBio(null);
      }
    } catch (error) {
      console.error('Error fetching bio:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id || !isOwnBio) return;
    
    try {
      const { data, error } = await supabase
        .from('bio_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(BIO_HISTORY_LIMIT);

      if (error) throw error;
      
      setHistory((data || []).map(h => ({
        ...h,
        content_json: (h.content_json as unknown as BioContent[]) || []
      })));
    } catch (error) {
      console.error('Error fetching bio history:', error);
    }
  }, [user?.id, isOwnBio]);

  useEffect(() => {
    fetchBio();
    if (isOwnBio) fetchHistory();
  }, [fetchBio, fetchHistory, isOwnBio]);

  const saveBio = async (
    content: string, 
    contentJson: BioContent[], 
    visibility: 'public' | 'friends' | 'hidden'
  ) => {
    if (!user?.id) return false;
    
    setSaving(true);
    try {
      // Filter for ads/spam
      const filtered = await filterAdvertising(content, user.id, undefined, 'bio');
      
      // Save current bio to history first (if exists)
      if (bio?.content) {
        await (supabase.from('bio_history').insert as any)({
          user_id: user.id,
          content: bio.content,
          content_json: bio.content_json
        });
        
        // Clean up old history (keep only last 5)
        const { data: oldHistory } = await supabase
          .from('bio_history')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(BIO_HISTORY_LIMIT, 100);
        
        if (oldHistory && oldHistory.length > 0) {
          await supabase
            .from('bio_history')
            .delete()
            .in('id', oldHistory.map(h => h.id));
        }
      }

      // Upsert new bio
      const { error } = await (supabase.from('user_bios').upsert as any)({
        user_id: user.id,
        content: filtered.text,
        content_json: contentJson,
        visibility,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({ title: 'Bio შენახულია!' });
      await fetchBio();
      await fetchHistory();
      return true;
    } catch (error) {
      console.error('Error saving bio:', error);
      toast({ title: 'შეცდომა bio-ს შენახვისას', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const restoreFromHistory = async (historyItem: BioHistory) => {
    if (!user?.id) return false;
    
    return saveBio(
      historyItem.content, 
      historyItem.content_json, 
      bio?.visibility || 'public'
    );
  };

  const deleteBio = async () => {
    if (!user?.id) return false;
    
    try {
      const { error } = await supabase
        .from('user_bios')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setBio(null);
      toast({ title: 'Bio წაიშალა' });
      return true;
    } catch (error) {
      console.error('Error deleting bio:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
      return false;
    }
  };

  return {
    bio,
    history,
    loading,
    saving,
    isOwnBio,
    saveBio,
    restoreFromHistory,
    deleteBio,
    refetch: fetchBio
  };
};
