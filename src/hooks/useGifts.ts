import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface GiftCatalogItem {
  id: string;
  name_ka: string;
  name_en: string | null;
  category: 'girls' | 'boys' | 'neutral';
  price_coins: number;
  emoji: string;
  media_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface UserGift {
  id: string;
  gift_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  message: string | null;
  is_anonymous: boolean;
  created_at: string;
  gift?: GiftCatalogItem;
  sender_profile?: { username: string; avatar_url: string | null } | null;
  receiver_profile?: { username: string; avatar_url: string | null } | null;
}

export interface PointsWallet {
  balance_points: number;
  total_earned: number;
  total_spent: number;
}

// ── Points Wallet Hook ──
export const usePointsWallet = () => {
  const { session } = useAuth();
  const [wallet, setWallet] = useState<PointsWallet>({ balance_points: 0, total_earned: 0, total_spent: 0 });
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }

    const { data } = await (supabase as any)
      .from('user_points_wallet')
      .select('balance_points, total_earned, total_spent')
      .eq('user_id', session.user.id)
      .single();

    if (data) {
      setWallet(data as PointsWallet);
    }
    setLoading(false);
  }, [session?.user?.id]);

  // Claim daily login bonus
  const claimDailyLogin = useCallback(async () => {
    if (!session?.user?.id) return null;
    const { data } = await (supabase.rpc as any)('claim_daily_login_points', { p_user_id: session.user.id });
    if (data && (data as any).success) {
      setWallet(prev => ({ ...prev, balance_points: (data as any).new_balance }));
    }
    return data;
  }, [session?.user?.id]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // Auto-claim daily login points on first load
  useEffect(() => {
    if (!session?.user?.id || loading) return;
    const key = `daily_points_${session.user.id}_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    claimDailyLogin().then(() => fetchWallet());
  }, [session?.user?.id, loading, claimDailyLogin, fetchWallet]);

  return { wallet, loading, refetch: fetchWallet, claimDailyLogin };
};

// ── Gifts Catalog Hook ──
export const useGiftsCatalog = () => {
  const [gifts, setGifts] = useState<GiftCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = useCallback(async () => {
    const { data, error } = await supabase
      .from('gifts_catalog')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      setGifts(data as unknown as GiftCatalogItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  return { gifts, loading, refetch: fetchCatalog };
};

// ── User Gifts Hook (received) ──
export const useUserGifts = (userId: string | undefined) => {
  const [receivedGifts, setReceivedGifts] = useState<UserGift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceivedGifts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('user_gifts')
      .select('*')
      .eq('receiver_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      const giftIds = [...new Set(data.map((g: any) => g.gift_id))];
      const senderIds = [...new Set(data.filter((g: any) => !g.is_anonymous).map((g: any) => g.sender_user_id))];

      const [giftsRes, profilesRes] = await Promise.all([
        giftIds.length > 0
          ? supabase.from('gifts_catalog').select('*').in('id', giftIds)
          : { data: [] },
        senderIds.length > 0
          ? supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', senderIds)
          : { data: [] },
      ]);

      const giftsMap = new Map((giftsRes.data || []).map((g: any) => [g.id, g]));
      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

      const enriched: UserGift[] = data.map((ug: any) => ({
        ...ug,
        gift: giftsMap.get(ug.gift_id) || undefined,
        sender_profile: ug.is_anonymous ? null : profilesMap.get(ug.sender_user_id) || null,
      }));

      setReceivedGifts(enriched);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchReceivedGifts(); }, [fetchReceivedGifts]);

  return { receivedGifts, loading, refetch: fetchReceivedGifts };
};

// ── Sent Gifts Hook ──
export const useSentGifts = () => {
  const { session } = useAuth();
  const [sentGifts, setSentGifts] = useState<UserGift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSentGifts = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    const { data } = await supabase
      .from('user_gifts')
      .select('*')
      .eq('sender_user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      const giftIds = [...new Set(data.map((g: any) => g.gift_id))];
      const receiverIds = [...new Set(data.map((g: any) => g.receiver_user_id))];

      const [giftsRes, profilesRes] = await Promise.all([
        giftIds.length > 0
          ? supabase.from('gifts_catalog').select('*').in('id', giftIds)
          : { data: [] },
        receiverIds.length > 0
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', receiverIds)
          : { data: [] },
      ]);

      const giftsMap = new Map((giftsRes.data || []).map((g: any) => [g.id, g]));
      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

      setSentGifts(data.map((ug: any) => ({
        ...ug,
        gift: giftsMap.get(ug.gift_id) || undefined,
        receiver_profile: profilesMap.get(ug.receiver_user_id) || null,
      })));
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { fetchSentGifts(); }, [fetchSentGifts]);

  return { sentGifts, loading, refetch: fetchSentGifts };
};

// ── Send Gift with Points ──
export const useSendGift = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const sendGift = async (receiverUserId: string, giftId: string, message?: string, isAnonymous = false) => {
    if (!session?.user?.id) {
      toast({ title: 'შეცდომა', description: 'გთხოვთ გაიაროთ ავტორიზაცია', variant: 'destructive' });
      return null;
    }

    if (session.user.id === receiverUserId) {
      toast({ title: 'შეცდომა', description: 'საკუთარი თავისთვის საჩუქრის გაგზავნა შეუძლებელია', variant: 'destructive' });
      return null;
    }

    setSending(true);
    try {
      const { data, error } = await (supabase.rpc as any)('send_gift_with_points', {
        p_sender_id: session.user.id,
        p_receiver_id: receiverUserId,
        p_gift_id: giftId,
        p_message: message?.trim() || null,
        p_is_anonymous: isAnonymous,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        if (result?.error === 'insufficient_points') {
          toast({
            title: 'ქულები არ გყოფნით 💰',
            description: `საჭიროა ${result.price} ქულა, თქვენ გაქვთ ${result.balance}`,
            variant: 'destructive'
          });
          return { error: 'insufficient_points', balance: result.balance, price: result.price };
        }
        throw new Error(result?.error || 'unknown error');
      }

      toast({ title: 'საჩუქარი გაიგზავნა ✅', description: `დაიხარჯა ${result.points_spent} ქულა` });
      return result;
    } catch (error: any) {
      console.error('Error sending gift:', error);
      toast({ title: 'შეცდომა', description: 'საჩუქრის გაგზავნა ვერ მოხერხდა', variant: 'destructive' });
      return null;
    } finally {
      setSending(false);
    }
  };

  return { sendGift, sending };
};
