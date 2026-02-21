import { MessageSquare, UserPlus, UserMinus, UserCheck, EyeOff, Eye, Settings, Ban, Gift, Heart, HeartCrack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shouldShowIgnoreButton, canSiteBan } from '@/utils/rbacUtils';
import { useState } from 'react';
import { useUserGifts, UserGift } from '@/hooks/useGifts';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';

interface ProfileActionButtonsV2Props {
  isOwnProfile: boolean;
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'received';
  isIgnored: boolean;
  isFollowing?: boolean;
  isAdmin?: boolean;
  viewerRole?: string | null;
  targetRole?: string | null;
  profileUserId?: string;
  onMessage: () => void;
  onFriendAction: () => void;
  onFollow?: () => void;
  onIgnoreToggle: () => void;
  onSettings: () => void;
  onSiteBlock?: () => void;
  onGift?: () => void;
  onRelationshipProposal?: () => void;
  showRelationshipButton?: boolean;
  onEndRelationship?: () => void;
  isPartner?: boolean;
}

const ProfileActionButtonsV2 = ({
  isOwnProfile,
  friendshipStatus,
  isIgnored,
  isFollowing = false,
  isAdmin = false,
  viewerRole,
  targetRole,
  profileUserId,
  onMessage,
  onFriendAction,
  onFollow,
  onIgnoreToggle,
  onSettings,
  onSiteBlock,
  onGift,
  onRelationshipProposal,
  showRelationshipButton = false,
  onEndRelationship,
  isPartner = false,
}: ProfileActionButtonsV2Props) => {
  const { receivedGifts } = useUserGifts(profileUserId);
  const [showGiftsDrawer, setShowGiftsDrawer] = useState(false);
  
  // RBAC: Check if ignore button should be visible based on role hierarchy
  const canShowIgnoreButton = shouldShowIgnoreButton(viewerRole, targetRole);
  
  // RBAC: Check if site block button should be visible
  const canShowSiteBlock = isAdmin && onSiteBlock && canSiteBan(viewerRole, targetRole);

  const giftCount = receivedGifts.length;
  const giftsDrawer = (
    <Drawer open={showGiftsDrawer} onOpenChange={(open) => !open && setShowGiftsDrawer(false)}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="flex items-center justify-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-primary" />
            საჩუქრები
          </DrawerTitle>
          <DrawerDescription className="text-2xl font-bold text-foreground mt-1">
            {giftCount}
          </DrawerDescription>
          <p className="text-xs text-muted-foreground">მიღებული საჩუქარი</p>
        </DrawerHeader>

        {onGift && (
          <div className="px-4 pb-3 flex justify-center">
            <Button
              onClick={() => { setShowGiftsDrawer(false); onGift(); }}
              className="rounded-2xl px-6 h-10 text-[13px] shadow-none active:scale-[0.97] transition-transform"
            >
              <Gift className="w-4 h-4 mr-1.5" />
              საჩუქრის გაგზავნა
            </Button>
          </div>
        )}

        <div className="px-4 pb-6 overflow-y-auto max-h-[55vh] space-y-2">
          {receivedGifts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">საჩუქრები ჯერ არ მიღებულა</p>
          ) : (
            receivedGifts.map((ug) => (
              <GiftListItem key={ug.id} gift={ug} />
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );

  const GiftButton = ({ asIcon = false }: { asIcon?: boolean }) => (
    <Button
      variant="outline"
      onClick={() => setShowGiftsDrawer(true)}
      size={asIcon ? "icon" : "default"}
      className={asIcon ? "min-h-[44px] min-w-[44px] flex-shrink-0 relative" : "flex items-center gap-2 min-h-[44px] relative"}
      title="საჩუქრები"
    >
      <Gift className="w-5 h-5 text-pink-500" />
      {!asIcon && <span>საჩუქრები</span>}
      {giftCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {giftCount}
        </span>
      )}
    </Button>
  );

  // Own profile - show only settings icon + edit shortcut
  if (isOwnProfile) {
    return (
      <>
        <div className="flex items-center justify-center gap-3 mt-4 sm:mt-6 px-4">
          <Button 
            variant="outline" 
            onClick={onSettings}
            className="flex items-center gap-2 min-h-[44px]"
          >
            <Settings className="w-5 h-5" />
            <span>პროფილის რედაქტირება</span>
          </Button>
          <GiftButton />
        </div>
        {giftsDrawer}
      </>
    );
  }

  const getFriendButtonContent = () => {
    switch (friendshipStatus) {
      case 'accepted':
        return { icon: <UserCheck className="w-4 h-4" />, text: 'მეგობრები', variant: 'secondary' as const };
      case 'pending':
        return { icon: <UserMinus className="w-4 h-4" />, text: 'გაუქმება', variant: 'outline' as const };
      case 'received':
        return { icon: <UserPlus className="w-4 h-4" />, text: 'დადასტურება', variant: 'default' as const };
      default:
        return { icon: <UserPlus className="w-4 h-4" />, text: 'დამეგობრება', variant: 'default' as const };
    }
  };

  const friendBtn = getFriendButtonContent();

  return (
    <>
      <div className="flex flex-col items-center gap-2 mt-5 sm:mt-6 px-4">
        {/* Row 1: Primary Actions - centered */}
        <div className="flex items-center gap-2 justify-center">
          <Button 
            onClick={onMessage}
            className="flex items-center justify-center gap-1.5 h-11 rounded-2xl text-[12px] font-medium shadow-none active:scale-[0.97] transition-transform px-4 min-w-0"
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">შეტყობინება</span>
          </Button>
          
          <Button 
            variant={friendBtn.variant}
            onClick={onFriendAction}
            className="flex items-center justify-center gap-1.5 h-11 rounded-2xl text-[12px] font-medium shadow-none active:scale-[0.97] transition-transform px-4 min-w-0"
          >
            {friendBtn.icon}
            <span className="whitespace-nowrap">{friendBtn.text}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowGiftsDrawer(true)}
            size="icon"
            className="h-11 w-11 flex-shrink-0 rounded-2xl shadow-none active:scale-[0.97] transition-transform"
            title="საჩუქრები"
          >
            <Gift className="w-5 h-5 text-pink-500" />
          </Button>
        </div>

        {/* Row 2: Follow + Ignore + Settings */}
        <div className="flex items-center gap-2 justify-center">
          {onFollow && (
            <Button
              variant={isFollowing ? 'outline' : 'secondary'}
              onClick={onFollow}
              className="flex items-center justify-center gap-1.5 h-10 rounded-2xl text-[13px] font-medium shadow-none active:scale-[0.97] transition-transform px-5"
            >
              {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
            </Button>
          )}

          {canShowIgnoreButton && (
            <Button 
              variant={isIgnored ? 'destructive' : 'outline'}
              onClick={onIgnoreToggle}
              className="flex items-center justify-center gap-1.5 h-10 rounded-2xl text-[13px] shadow-none active:scale-[0.97] transition-transform px-4"
            >
              {isIgnored ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>იგნორის მოხსნა</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>დაიგნორება</span>
                </>
              )}
            </Button>
          )}
          
          <Button 
            variant="secondary"
            size="icon"
            onClick={onSettings}
            className="h-10 w-10 rounded-2xl shadow-none active:scale-[0.97] transition-transform"
            title="პარამეტრები"
          >
            <Settings className="w-4.5 h-4.5" />
          </Button>
        </div>

        {/* Relationship proposal */}
        {showRelationshipButton && onRelationshipProposal && (
          <Button 
            variant="outline"
            onClick={onRelationshipProposal}
            className="flex items-center justify-center gap-2 h-10 rounded-2xl text-[13px] shadow-none border-rose-500/20 text-rose-400 hover:bg-rose-500/10 active:scale-[0.97] transition-transform"
          >
            <Heart className="w-4 h-4" />
            <span>შეთავაზება</span>
          </Button>
        )}

        {/* End relationship button - shown on partner's profile */}
        {isPartner && onEndRelationship && (
          <Button 
            variant="outline"
            onClick={onEndRelationship}
            className="flex items-center justify-center gap-2 h-10 rounded-2xl text-[13px] shadow-none border-destructive/20 text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-transform"
          >
            <HeartCrack className="w-4 h-4" />
            <span>ურთიერთობის შეწყვეტა</span>
          </Button>
        )}

        {/* Row 3: Admin */}
        {canShowSiteBlock && (
          <Button 
            variant="destructive"
            onClick={onSiteBlock}
            className="flex items-center justify-center gap-2 h-10 rounded-2xl text-[13px] shadow-none opacity-80 hover:opacity-100 active:scale-[0.97] transition-all mt-1"
          >
            <Ban className="w-4 h-4" />
            <span>საიტზე ბლოკირება</span>
          </Button>
        )}
      </div>
      {giftsDrawer}
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

export default ProfileActionButtonsV2;
