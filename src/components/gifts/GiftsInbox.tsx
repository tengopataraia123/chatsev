import { useState, useMemo } from 'react';
import { ArrowLeft, Gift, Send as SendIcon, BarChart3, Coins, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUserGifts, useSentGifts, usePointsWallet, UserGift } from '@/hooks/useGifts';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface GiftsInboxProps {
  onClose: () => void;
  highlightGiftId?: string;
}

const GiftsInbox = ({ onClose, highlightGiftId }: GiftsInboxProps) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { receivedGifts, loading: loadingReceived } = useUserGifts(userId);
  const { sentGifts, loading: loadingSent } = useSentGifts();
  const { wallet } = usePointsWallet();
  const [activeTab, setActiveTab] = useState('received');
  const [expandedSender, setExpandedSender] = useState<string | null>(null);

  // Per-sender breakdown
  const senderBreakdown = useMemo(() => {
    const map = new Map<string, { username: string; avatar_url: string | null; count: number; totalPoints: number }>();
    receivedGifts.forEach(g => {
      const key = g.is_anonymous ? '__anonymous__' : g.sender_user_id;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.totalPoints += g.gift?.price_coins || 0;
      } else {
        map.set(key, {
          username: g.is_anonymous ? 'ანონიმური' : g.sender_profile?.username || 'უცნობი',
          avatar_url: g.is_anonymous ? null : g.sender_profile?.avatar_url || null,
          count: 1,
          totalPoints: g.gift?.price_coins || 0,
        });
      }
    });
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [receivedGifts]);

  const totalReceivedValue = useMemo(() =>
    receivedGifts.reduce((sum, g) => sum + (g.gift?.price_coins || 0), 0),
    [receivedGifts]
  );

  const uniqueSenders = useMemo(() => senderBreakdown.length, [senderBreakdown]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              ჩემი საჩუქრები
            </h1>
          </div>
          <div className="flex items-center gap-1 bg-secondary/60 rounded-full px-3 py-1">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold">{wallet.balance_points}</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-around px-4 pb-3 text-center">
          <div>
            <p className="text-lg font-bold">{receivedGifts.length}</p>
            <p className="text-xs text-muted-foreground">მიღებული</p>
          </div>
          <div>
            <p className="text-lg font-bold">{sentGifts.length}</p>
            <p className="text-xs text-muted-foreground">გაგზავნილი</p>
          </div>
          <div>
            <p className="text-lg font-bold">{uniqueSenders}</p>
            <p className="text-xs text-muted-foreground">მჩუქებელი</p>
          </div>
          <div>
            <p className="text-lg font-bold">{totalReceivedValue}</p>
            <p className="text-xs text-muted-foreground">ქულა ჯამი</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="received">მიღებული</TabsTrigger>
            <TabsTrigger value="sent">გაგზავნილი</TabsTrigger>
            <TabsTrigger value="senders">ვინ მაჩუქა</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
        {activeTab === 'received' && (
          loadingReceived ? (
            <LoadingState />
          ) : receivedGifts.length === 0 ? (
            <EmptyState text="საჩუქრები ჯერ არ მიგიღიათ" />
          ) : (
            receivedGifts.map(g => (
              <GiftItem
                key={g.id}
                gift={g}
                type="received"
                highlighted={g.id === highlightGiftId}
              />
            ))
          )
        )}

        {activeTab === 'sent' && (
          loadingSent ? (
            <LoadingState />
          ) : sentGifts.length === 0 ? (
            <EmptyState text="საჩუქრები ჯერ არ გაგიგზავნიათ" />
          ) : (
            sentGifts.map(g => (
              <GiftItem key={g.id} gift={g} type="sent" />
            ))
          )
        )}

        {activeTab === 'senders' && (
          senderBreakdown.length === 0 ? (
            <EmptyState text="მჩუქებელი არ არის" />
          ) : (
            senderBreakdown.map(([key, data]) => (
              <button
                key={key}
                onClick={() => setExpandedSender(expandedSender === key ? null : key)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {data.avatar_url ? (
                    <img src={data.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">{key === '__anonymous__' ? '🎭' : data.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{data.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.count} საჩუქარი · {data.totalPoints} ქულა
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))
          )
        )}
      </div>
    </div>
  );
};

const GiftItem = ({ gift, type, highlighted }: { gift: UserGift; type: 'received' | 'sent'; highlighted?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const personProfile = type === 'received' ? gift.sender_profile : gift.receiver_profile;
  const personName = gift.is_anonymous && type === 'received'
    ? '🎭 ანონიმური'
    : personProfile?.username || 'უცნობი';

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
        highlighted ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary/60'
      }`}
      onClick={() => gift.message && setExpanded(!expanded)}
    >
      <span className="text-3xl flex-shrink-0">{gift.gift?.emoji || '🎁'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{gift.gift?.name_ka || 'საჩუქარი'}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-0.5">
            <Coins className="w-3 h-3 text-yellow-500" />
            {gift.gift?.price_coins || 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {type === 'received' ? 'გამგზავნი' : 'მიმღები'}: {personName}
          </p>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(gift.created_at), { addSuffix: true, locale: ka })}
          </span>
        </div>
        {expanded && gift.message && (
          <p className="text-sm mt-1 p-2 bg-background/60 rounded-lg animate-fade-in">
            {gift.message}
          </p>
        )}
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
    <Gift className="w-12 h-12 mb-3 opacity-30" />
    <p>{text}</p>
  </div>
);

export default GiftsInbox;
