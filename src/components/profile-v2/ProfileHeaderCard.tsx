import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Profile } from '@/types';
import { cn } from '@/lib/utils';
import AvatarUploaderModal from './AvatarUploaderModal';
import AvatarViewerModal from '@/components/shared/AvatarViewerModal';
import OwnerAvatarFrame from '@/components/ui/owner-avatar-frame';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import defaultCover from '@/assets/default-cover.jpg';

interface ProfileHeaderCardProps {
  profile: Profile | null;
  isOwnProfile: boolean;
  isSuperAdmin: boolean;
  uploadingAvatar: boolean;
  uploadingCover: boolean;
  onAvatarUpload: (file: File) => Promise<void>;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarClick?: () => void;
  onCoverClick?: () => void;
  onNavigateToAIAvatar?: () => void;
}

// Check if URL is a video
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.wmv', '.ogv'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
};

// Get initials from username
const getInitials = (username: string | null | undefined): string => {
  if (!username) return '?';
  return username.charAt(0).toUpperCase();
};

const ProfileHeaderCard = ({
  profile,
  isOwnProfile,
  isSuperAdmin,
  uploadingAvatar,
  uploadingCover,
  onAvatarUpload,
  onCoverUpload,
  onAvatarClick,
  onCoverClick,
  onNavigateToAIAvatar,
}: ProfileHeaderCardProps) => {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const canEdit = isOwnProfile || isSuperAdmin;
  const hasAvatar = !!profile?.avatar_url;
  const isVideo = isVideoUrl(profile?.avatar_url);

  // Avatar click opens viewer for everyone (if has avatar), or uploader for owner
  const handleAvatarClick = () => {
    if (hasAvatar) {
      setShowAvatarViewer(true);
    } else if (canEdit) {
      // No avatar - open uploader modal for owner
      setShowAvatarModal(true);
    }
  };

  const handleAvatarSave = async (file: File) => {
    await onAvatarUpload(file);
    setShowAvatarModal(false);
  };

  const hasCover = !!(profile as any)?.cover_url;
  const isCoverVideo = isVideoUrl((profile as any)?.cover_url);

  return (
    <>
      {/* Cover Photo/Video */}
      <div className="relative">
        <div 
          className={`h-36 sm:h-48 md:h-56 relative overflow-hidden rounded-b-3xl ${hasCover ? 'cursor-pointer' : ''}`}
          onClick={() => hasCover && onCoverClick?.()}
        >
          {hasCover ? (
            isCoverVideo ? (
              <video 
                src={(profile as any).cover_url} 
                className="w-full h-full object-cover hover:brightness-95 hover:scale-[1.02] transition-all duration-500"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            ) : (
              <img 
                src={(profile as any).cover_url} 
                alt="Cover" 
                className="w-full h-full object-cover hover:brightness-95 hover:scale-[1.02] transition-all duration-500"
              />
            )
          ) : (
            <img 
              src={defaultCover} 
              alt="ChatSev.com" 
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Cover Edit Button */}
          {canEdit && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={onCoverUpload}
                className="hidden"
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  coverInputRef.current?.click();
                }}
                disabled={uploadingCover}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-card/95 backdrop-blur-md rounded-xl flex items-center gap-2 text-foreground text-xs font-medium hover:bg-card active:scale-95 transition-all shadow-lg disabled:opacity-50 border border-border/30"
              >
                {uploadingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">შეცვლა</span>
              </button>
            </>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="absolute -bottom-14 sm:-bottom-16 left-1/2 transform -translate-x-1/2">
          <OwnerAvatarFrame username={profile?.username} userId={profile?.id}>
            <div 
              className={cn(
                "relative rounded-full overflow-hidden",
                hasAvatar ? 'cursor-pointer' : ''
              )}
              onClick={handleAvatarClick}
            >
              {/* Video Avatar */}
              {isVideo && profile?.avatar_url ? (
                <div className="w-[112px] h-[112px] sm:w-[144px] sm:h-[144px] rounded-full overflow-hidden border-4 border-card shadow-2xl bg-muted ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                  <video 
                    src={profile.avatar_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                </div>
              ) : (
                /* Static Image Avatar */
                <Avatar className="w-[112px] h-[112px] sm:w-[144px] sm:h-[144px] border-4 border-card shadow-2xl ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                  <AvatarImage 
                    src={profile?.avatar_url || undefined} 
                    alt={profile?.username || 'User avatar'} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-2xl sm:text-3xl">
                    {getInitials(profile?.username)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              {/* Hover overlay - shows on all profiles with avatar */}
              {hasAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center">
                  {/* Empty - just darkens on hover to indicate clickability */}
                </div>
              )}
            </div>
          </OwnerAvatarFrame>
          
          {/* Avatar Edit Button - only for own profile */}
          {canEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowAvatarModal(true);
              }}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 border-2 border-card z-20"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Avatar Uploader Modal */}
      <AvatarUploaderModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleAvatarSave}
        currentAvatar={profile?.avatar_url}
        uploading={uploadingAvatar}
        onNavigateToAIAvatar={onNavigateToAIAvatar}
      />

      {/* Avatar Viewer Modal */}
      {profile?.avatar_url && (
        <AvatarViewerModal
          isOpen={showAvatarViewer}
          onClose={() => setShowAvatarViewer(false)}
          mediaUrl={profile.avatar_url}
          userId={profile.id || ''}
          username={profile.username || ''}
          isVideo={isVideo}
          onDelete={() => {
            setShowAvatarViewer(false);
            // Trigger page refresh to show updated avatar state
            window.location.reload();
          }}
        />
      )}
    </>
  );
};

export default ProfileHeaderCard;
