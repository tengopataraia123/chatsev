import { Gift } from 'lucide-react';
import { useUserGifts, UserGift } from '@/hooks/useGifts';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useState } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';

interface ProfileGiftsSectionProps {
  userId: string;
}

const ProfileGiftsSection = ({ userId }: ProfileGiftsSectionProps) => {
  const { receivedGifts, loading } = useUserGifts(userId);
  const [showAll, setShowAll] = useState(false);

  if (loading || receivedGifts.length === 0) return null;

  const previewGifts = receivedGifts.slice(0, 6);

  return (
    <>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-primary" />
            საჩუქრები
            <span className="text-muted-foreground font-normal">({receivedGifts.length})</span>
          </h3>
          {receivedGifts.length > 6 && (
            <button onClick={() => setShowAll(true)} className="text-xs text-primary hover:underline">
              ყველას ნახვა
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {previewGifts.map((ug) => (
            <div
              key={ug.id}
              className="flex items-center gap-1 bg-secondary/60 rounded-full px-2.5 py-1 text-sm"
              title={`${ug.gift?.name_ka || 'საჩუქარი'} - ${ug.is_anonymous ? 'ანონიმური' : ug.sender_profile?.username || '?'}`}
            >
              <span className="text-lg">{ug.gift?.emoji || '🎁'}</span>
              {!ug.is_anonymous && ug.sender_profile && (
                <span className="text-xs text-muted-foreground max-w-[60px] truncate">
                  {ug.sender_profile.username}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All gifts drawer */}
      <Drawer open={showAll} onOpenChange={(open) => !open && setShowAll(false)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              მიღებული საჩუქრები ({receivedGifts.length})
            </DrawerTitle>
            <DrawerDescription>ყველა მიღებული საჩუქარი</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto max-h-[65vh] space-y-2">
            {receivedGifts.map((ug) => (
              <GiftListItem key={ug.id} gift={ug} />
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

const GiftListItem = ({ gift }: { gift: UserGift }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors cursor-pointer"
      onClick={() => gift.message && setExpanded(!expanded)}
    >
      <span className="text-3xl flex-shrink-0">{gift.gift?.emoji || '🎁'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{gift.gift?.name_ka || 'საჩუქარი'}</p>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(gift.created_at), { addSuffix: true, locale: ka })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {gift.is_anonymous ? '🎭 ანონიმური' : gift.sender_profile?.username || 'უცნობი'}
        </p>
        {expanded && gift.message && (
          <p className="text-sm mt-1 p-2 bg-background/60 rounded-lg animate-fade-in">
            {gift.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileGiftsSection;
