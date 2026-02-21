import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PendingApprovalScreenProps {
  onSignOut: () => void;
  onRefresh: () => Promise<void>;
  t: { pending: string; pendingApproval: string; logout: string };
}

const PendingApprovalScreen = ({ onSignOut, onRefresh, t }: PendingApprovalScreenProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Real-time listener for approval OR rejection
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('pending-approval-watch')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new && (payload.new as any).is_approved === true) {
            // Profile approved! Refresh to enter site
            await onRefresh();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'site_bans',
        },
        async (payload) => {
          // If a ban was inserted for this user, sign them out
          if (payload.new && (payload.new as any).user_id === user.id) {
            await supabase.auth.signOut({ scope: 'local' });
            onSignOut();
          }
        }
      )
      .subscribe();

    // Also check immediately if already banned
    const checkBanned = async () => {
      const { data } = await supabase
        .from('site_bans')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .limit(1);
      
      if (data && data.length > 0) {
        await supabase.auth.signOut({ scope: 'local' });
        onSignOut();
      }
    };
    checkBanned();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onRefresh, onSignOut]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [onRefresh]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 text-center border border-border">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t.pending}</h1>
        <p className="text-muted-foreground mb-6">
          {t.pendingApproval}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            განახლება
          </button>
          <button
            onClick={onSignOut}
            className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalScreen;
