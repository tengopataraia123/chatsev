import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VipStatus {
  isVip: boolean;
  vipType: string | null;
  expiresAt: string | null;
}

export const useVipStatus = (userId: string | undefined) => {
  const [vipStatus, setVipStatus] = useState<VipStatus>({
    isVip: false,
    vipType: null,
    expiresAt: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchVipStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('vip_purchases')
          .select('vip_type, expires_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setVipStatus({
            isVip: true,
            vipType: data.vip_type,
            expiresAt: data.expires_at
          });
        } else {
          setVipStatus({
            isVip: false,
            vipType: null,
            expiresAt: null
          });
        }
      } catch (error) {
        console.error('Error fetching VIP status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVipStatus();
  }, [userId]);

  return { ...vipStatus, loading };
};
