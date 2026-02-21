import { 
  Edit3, Settings, MessageSquare, UserPlus, UserMinus, 
  UserCheck, MoreHorizontal, Ban, Flag, Shield, Eye, Unlock, Trash2, BadgeCheck, BadgeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { shouldShowIgnoreButton, canSiteBan } from '@/utils/rbacUtils';

interface ProfileActionsProps {
  isOwnProfile: boolean;
  isFollowing: boolean;
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'received';
  isBlocked: boolean;
  canMessage: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAllowedInspector?: boolean;
  userSiteBanned: boolean;
  isVerified?: boolean;
  targetUserId?: string;
  viewerRole?: string | null;
  targetRole?: string | null;
  onEditProfile: () => void;
  onSettings?: () => void;
  onFollow: () => void;
  onFriendRequest: () => void;
  onMessage?: () => void;
  onBlock: () => void;
  onReport?: () => void;
  onSiteBan?: () => void;
  onSiteUnban?: () => void;
  
  onInspectMessages?: () => void;
  onDeleteUser?: () => void;
  onVerify?: () => void;
  onUnverify?: () => void;
}

const ProfileActions = ({
  isOwnProfile,
  isFollowing,
  friendshipStatus,
  isBlocked,
  canMessage,
  isAdmin,
  isSuperAdmin,
  isAllowedInspector,
  userSiteBanned,
  isVerified,
  targetUserId,
  viewerRole,
  targetRole,
  onEditProfile,
  onSettings,
  onFollow,
  onFriendRequest,
  onMessage,
  onBlock,
  onReport,
  onSiteBan,
  onSiteUnban,
  
  onInspectMessages,
  onDeleteUser,
  onVerify,
  onUnverify,
}: ProfileActionsProps) => {
  // RBAC: Check if ignore/block button should be visible
  const canShowIgnoreButton = shouldShowIgnoreButton(viewerRole, targetRole);
  
  // RBAC: Check if site ban/unban should be visible
  const canShowSiteBan = canSiteBan(viewerRole, targetRole);
  // For own profile, only show settings button (profile editing moved to main menu)
  if (isOwnProfile) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {onSettings && (
          <Button variant="secondary" onClick={onSettings} className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            პარამეტრები
          </Button>
        )}
      </div>
    );
  }

  const getFriendButtonText = () => {
    switch (friendshipStatus) {
      case 'accepted': return 'მეგობრები';
      case 'pending': return 'გაგზავნილია';
      case 'received': return 'დადასტურება';
      default: return 'დამეგობრება';
    }
  };

  const getFriendButtonIcon = () => {
    switch (friendshipStatus) {
      case 'accepted': return <UserCheck className="w-4 h-4" />;
      case 'pending': return <UserMinus className="w-4 h-4" />;
      case 'received': return <UserPlus className="w-4 h-4" />;
      default: return <UserPlus className="w-4 h-4" />;
    }
  };

  const getFriendButtonVariant = () => {
    switch (friendshipStatus) {
      case 'accepted': return 'secondary' as const;
      case 'pending': return 'outline' as const;
      case 'received': return 'default' as const;
      default: return 'default' as const;
    }
  };

  return (
    <div className="w-full overflow-hidden">
      <style>{`
        .profile-actions-scroll {
          display: flex;
          gap: 0.5rem;
          padding-bottom: 0.5rem;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          touch-action: pan-x;
          overscroll-behavior-x: contain;
          -ms-overflow-style: none;
          scrollbar-width: none;
          white-space: nowrap;
          width: 100%;
          max-width: 100vw;
        }
        .profile-actions-scroll::-webkit-scrollbar { display: none; height: 0; width: 0; }
        @media (max-width: 768px) {
          .profile-actions-scroll button {
            min-height: 44px;
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
        }
      `}</style>
      <div className="profile-actions-scroll">
      {/* Message Button - PRIMARY ACTION - First position for visibility */}
      {targetUserId && (
        <Button 
          variant="default"
          onClick={() => {
            console.log('[ProfileActions] Message button clicked for userId:', targetUserId);
            if (onMessage) {
              onMessage();
            }
          }}
          className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
        >
          <MessageSquare className="w-4 h-4" />
          შეტყობინება
        </Button>
      )}

      {/* Friend Button */}
      <Button 
        onClick={onFriendRequest}
        variant={getFriendButtonVariant()}
        className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
      >
        {getFriendButtonIcon()}
        {getFriendButtonText()}
      </Button>

      {/* Follow Button */}
      <Button 
        variant={isFollowing ? 'outline' : 'secondary'}
        onClick={onFollow}
        className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
      >
        {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
        {isFollowing ? 'გამოწერილია' : 'გამოწერა'}
      </Button>


      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* RBAC: Only show block/ignore if allowed by role hierarchy */}
          {canShowIgnoreButton && (
            <DropdownMenuItem onClick={onBlock} className={isBlocked ? 'text-red-500' : ''}>
              <Ban className="w-4 h-4 mr-2" />
              {isBlocked ? 'იგნორის მოხსნა' : 'დაიგნორება'}
            </DropdownMenuItem>
          )}
          
          {onReport && (
            <DropdownMenuItem onClick={onReport}>
              <Flag className="w-4 h-4 mr-2" />
              რეპორტი
            </DropdownMenuItem>
          )}

          {/* Admin Actions - RBAC controlled */}
          {isAdmin && canShowSiteBan && (
            <>
              <DropdownMenuSeparator />
              {userSiteBanned ? (
                isSuperAdmin && onSiteUnban && (
                  <DropdownMenuItem onClick={onSiteUnban} className="text-green-500">
                    <Unlock className="w-4 h-4 mr-2" />
                    საიტზე განბლოკვა
                  </DropdownMenuItem>
                )
              ) : (
                onSiteBan && (
                  <DropdownMenuItem onClick={onSiteBan} className="text-red-500">
                    <Shield className="w-4 h-4 mr-2" />
                    საიტზე დაბლოკვა
                  </DropdownMenuItem>
                )
              )}
            </>
          )}

      {/* Super Admin Actions */}
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              
              {/* Verify/Unverify - Super Admin Only */}
              {isVerified ? (
                onUnverify && (
                  <DropdownMenuItem onClick={onUnverify} className="text-orange-500">
                    <BadgeX className="w-4 h-4 mr-2" />
                    ვერიფიკაციის მოხსნა
                  </DropdownMenuItem>
                )
              ) : (
                onVerify && (
                  <DropdownMenuItem onClick={onVerify} className="text-emerald-500">
                    <BadgeCheck className="w-4 h-4 mr-2" />
                    ვერიფიკაცია
                  </DropdownMenuItem>
                )
              )}
              
              <DropdownMenuItem onClick={onEditProfile} className="text-amber-500">
                <Edit3 className="w-4 h-4 mr-2" />
                პროფილის რედაქტირება
              </DropdownMenuItem>
              {/* Only CHEGE and P ი კ ა S ო can see messaging functions */}
              {isAllowedInspector && onInspectMessages && (
                <DropdownMenuItem onClick={onInspectMessages} className="text-amber-500">
                  <Eye className="w-4 h-4 mr-2" />
                  პირადი მიმოწერა (ინსპექცია)
                </DropdownMenuItem>
              )}
              {onDeleteUser && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDeleteUser} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    მომხმარებლის წაშლა
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );
};

export default ProfileActions;
