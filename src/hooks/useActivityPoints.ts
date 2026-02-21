import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserPoints {
  total_points: number;
  balance_points: number;
  total_earned: number;
  total_spent: number;
}

export interface PointHistoryItem {
  id: string;
  action: string;
  points: number;
  created_at: string;
}

const LEVEL_THRESHOLDS = [0, 50, 200, 400, 700, 1000, 1500, 2000, 3000, 5000];

export const getLevelProgress = (points: number, level: number) => {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 1000;
  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return { progress: Math.min(Math.max(progress, 0), 100), nextThreshold };
};

export const getLevelFromPoints = (points: number): number => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
};

export const POINT_VALUES: Record<string, { label: string; points: number; icon: string }> = {
  post: { label: 'პოსტის დამატება', points: 10, icon: '📝' },
  comment: { label: 'კომენტარი', points: 5, icon: '💬' },
  like_given: { label: 'ლაიქის დადება', points: 2, icon: '❤️' },
  like_received: { label: 'ლაიქის მიღება', points: 2, icon: '👍' },
  follower: { label: 'ახალი მიმდევარი', points: 3, icon: '👥' },
  story: { label: 'სტორის დამატება', points: 5, icon: '📸' },
  video: { label: 'ვიდეოს გაზიარება', points: 8, icon: '🎥' },
  blog: { label: 'ბლოგის დაწერა', points: 15, icon: '📖' },
  game: { label: 'თამაშში მონაწილეობა', points: 10, icon: '🎮' },
};

export const SPENDING_OPTIONS = [
  { id: 'gift_basic', label: 'ჩვეულებრივი საჩუქარი', cost: 5, icon: '🎁' },
  { id: 'gift_premium', label: 'პრემიუმ საჩუქარი', cost: 15, icon: '💎' },
  { id: 'gift_super', label: 'სუპერ საჩუქარი', cost: 30, icon: '👑' },
  { id: 'gift_legendary', label: 'ლეგენდარული საჩუქარი', cost: 50, icon: '🏆' },
];

export const useActivityPoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [history, setHistory] = useState<PointHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchPoints = async () => {
      const { data } = await (supabase as any)
        .from('user_points_wallet')
        .select('balance_points, total_earned, total_spent')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setPoints({
        total_points: data?.balance_points ?? 0,
        balance_points: data?.balance_points ?? 0,
        total_earned: data?.total_earned ?? 0,
        total_spent: data?.total_spent ?? 0,
      });
      setLoading(false);
    };

    fetchPoints();

    const channel = supabase
      .channel('user-points')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_points_wallet',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchPoints();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchHistory = async (limit = 50) => {
    if (!user) return;
    const { data } = await supabase
      .from('activity_points_log')
      .select('id, action, points, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (data) setHistory(data);
  };

  return { points, history, loading, fetchHistory };
};
