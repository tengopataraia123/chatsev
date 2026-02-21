import { useState, useMemo } from 'react';
import { X, Search, Gift, Send, Sparkles, Lock, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useGiftsCatalog, useSendGift, usePointsWallet, GiftCatalogItem } from '@/hooks/useGifts';
import { cn } from '@/lib/utils';

interface GiftPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverUserId: string;
  receiverUsername: string;
  onGiftSent?: () => void;
}

const GiftPickerModal = ({ isOpen, onClose, receiverUserId, receiverUsername, onGiftSent }: GiftPickerModalProps) => {
  const { gifts, loading } = useGiftsCatalog();
  const { sendGift, sending } = useSendGift();
  const { wallet, refetch: refetchWallet } = usePointsWallet();
  const [selectedGift, setSelectedGift] = useState<GiftCatalogItem | null>(null);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showConfetti, setShowConfetti] = useState(false);

  const filteredGifts = useMemo(() => {
    let filtered = gifts;
    if (category !== 'all') {
      filtered = filtered.filter(g => g.category === category);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => g.name_ka.toLowerCase().includes(q) || g.emoji.includes(q));
    }
    return filtered;
  }, [gifts, category, searchQuery]);

  const handleSend = async () => {
    if (!selectedGift) return;
    const result = await sendGift(receiverUserId, selectedGift.id, message, isAnonymous);
    if (result && !result.error) {
      setShowConfetti(true);
      refetchWallet();
      setTimeout(() => {
        setShowConfetti(false);
        setSelectedGift(null);
        setMessage('');
        setIsAnonymous(false);
        onGiftSent?.();
        onClose();
      }, 1500);
    }
  };

  const canAfford = (price: number) => wallet.balance_points >= price;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="relative pb-2">
          <button onClick={onClose} className="absolute right-4 top-4 p-1 rounded-full hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
          <DrawerTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-primary" />
            საჩუქრის გაგზავნა
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            აირჩიე საჩუქარი {receiverUsername}-სთვის
          </DrawerDescription>
        </DrawerHeader>

        {/* Points balance bar */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">თქვენი ქულები:</span>
            <span className="text-sm font-bold">{wallet.balance_points}</span>
          </div>
        </div>

        {showConfetti && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 animate-fade-in">
            <div className="text-center animate-scale-in">
              <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-3 animate-pulse" />
              <p className="text-xl font-bold">საჩუქარი გაიგზავნა! ✨</p>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 overflow-y-auto max-h-[65vh]">
          {selectedGift ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                <span className="text-5xl animate-scale-in">{selectedGift.emoji}</span>
                <div>
                  <p className="font-semibold text-lg">{selectedGift.name_ka}</p>
                  <p className="text-sm text-muted-foreground">
                    ფასი: {selectedGift.price_coins} ქულა
                  </p>
                  {selectedGift.price_coins > 0 && (
                    <p className="text-xs text-muted-foreground">
                      დაგრჩებათ: {wallet.balance_points - selectedGift.price_coins} ქულა
                    </p>
                  )}
                </div>
              </div>

              <Textarea
                placeholder="მცირე შეტყობინება (არასავალდებულო)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                className="resize-none"
                rows={2}
              />

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 rounded accent-primary"
                />
                <span className="text-sm">ანონიმურად გაგზავნა</span>
              </label>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedGift(null)} className="flex-1 min-h-[48px]">
                  უკან
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !canAfford(selectedGift.price_coins)}
                  className="flex-1 min-h-[48px] gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'იგზავნება...' : !canAfford(selectedGift.price_coins) ? 'ქულები არ გყოფნით' : 'გაგზავნა'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ძებნა საჩუქრებში…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Tabs value={category} onValueChange={setCategory} className="mb-3">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="all">ყველა</TabsTrigger>
                  <TabsTrigger value="girls">👧 გოგო</TabsTrigger>
                  <TabsTrigger value="boys">👦 ბიჭი</TabsTrigger>
                  <TabsTrigger value="neutral">⭐</TabsTrigger>
                </TabsList>
              </Tabs>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredGifts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">საჩუქრები ვერ მოიძებნა</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {filteredGifts.map((gift) => {
                    const affordable = canAfford(gift.price_coins);
                    return (
                      <button
                        key={gift.id}
                        onClick={() => affordable && setSelectedGift(gift)}
                        disabled={!affordable}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-transparent relative",
                          "transition-all duration-200 min-h-[100px] justify-center",
                          affordable
                            ? "hover:border-primary/50 hover:bg-primary/5 active:scale-95"
                            : "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {!affordable && (
                          <Lock className="absolute top-1 right-1 w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="text-3xl sm:text-4xl">{gift.emoji}</span>
                        <span className="text-xs text-center leading-tight line-clamp-1">{gift.name_ka}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Coins className="w-3 h-3 text-yellow-500" />
                          {gift.price_coins}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default GiftPickerModal;
