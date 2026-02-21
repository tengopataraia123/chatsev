import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import ProfilePhotoViewer from '@/components/profile/ProfilePhotoViewer';
import GenderAvatar from '@/components/shared/GenderAvatar';
import { Profile } from '@/types';
import defaultCover from '@/assets/default-cover.jpg';
import AvatarUploaderModal from '@/components/profile-v2/AvatarUploaderModal';

interface ProfileHeaderProps {
  profile: Profile | null;
  isOwnProfile: boolean;
  isSuperAdmin: boolean;
  uploadingAvatar: boolean;
  uploadingCover: boolean;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileUpdate?: () => void;
  onAvatarFileUpload?: (file: File) => Promise<void>;
}

const ProfileHeader = ({
  profile,
  isOwnProfile,
  isSuperAdmin,
  uploadingAvatar,
  uploadingCover,
  onAvatarUpload,
  onCoverUpload,
  onProfileUpdate,
  onAvatarFileUpload,
}: ProfileHeaderProps) => {
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showCoverViewer, setShowCoverViewer] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const canEdit = isOwnProfile || isSuperAdmin;

  const handleAvatarClick = () => {
    if (canEdit && onAvatarFileUpload) {
      setShowAvatarModal(true);
    } else if (profile?.avatar_url) {
      setShowAvatarViewer(true);
    }
  };

  const handleAvatarSave = async (file: File) => {
    if (onAvatarFileUpload) {
      await onAvatarFileUpload(file);
      setShowAvatarModal(false);
    }
  };

  return (
    <>
      {/* Cover Photo - Compact height for mobile */}
      <div className="relative">
        <div 
          className={`h-32 sm:h-44 md:h-52 relative overflow-hidden rounded-b-2xl ${(profile as any)?.cover_url ? 'cursor-pointer' : ''}`}
          onClick={() => (profile as any)?.cover_url && setShowCoverViewer(true)}
        >
        {(profile as any)?.cover_url ? (
            <img 
              src={(profile as any).cover_url} 
              alt="Cover" 
              className="w-full h-full object-cover hover:brightness-95 transition-all"
            />
          ) : (
            <img 
              src={defaultCover} 
              alt="ChatSev.com - social networking" 
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Cover Edit Button */}
          {canEdit && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={onCoverUpload}
                className="hidden"
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  coverInputRef.current?.click();
                }}
                disabled={uploadingCover}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-lg flex items-center gap-2 text-foreground text-xs font-medium hover:bg-card transition-colors shadow-lg disabled:opacity-50"
              >
                {uploadingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">ფოტოს შეცვლა</span>
              </button>
            </>
          )}
        </div>

        {/* Profile Avatar - CENTERED, NEVER cuts face (object-contain) */}
        <div className="absolute -bottom-14 sm:-bottom-16 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <div 
              className={`w-[112px] h-[112px] sm:w-[140px] sm:h-[140px] md:w-[160px] md:h-[160px] rounded-full border-4 border-card overflow-hidden bg-muted shadow-xl ${canEdit || profile?.avatar_url ? 'cursor-pointer' : ''}`}
              onClick={handleAvatarClick}
              style={{ aspectRatio: '1/1' }}
            >
              {profile?.avatar_url ? (
                // Use object-contain to NEVER cut the face/head
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username} 
                  className="w-full h-full object-contain bg-card"
                />
              ) : (
                <GenderAvatar 
                  gender={(profile as any)?.gender}
                  username={profile?.username}
                  className="w-full h-full"
                />
              )}
              
              {/* Hover overlay for edit */}
              {canEdit && (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            
            {/* Avatar Edit Button */}
            {canEdit && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAvatarFileUpload) {
                    setShowAvatarModal(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-9 h-9 sm:w-10 sm:h-10 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 border-2 border-card"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary-foreground" />
                ) : (
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                )}
              </button>
            )}
            
            {/* Hidden file input for legacy mode */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Avatar Uploader Modal - Smart fit, no cropping */}
      {onAvatarFileUpload && (
        <AvatarUploaderModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onSave={handleAvatarSave}
          currentAvatar={profile?.avatar_url}
          uploading={uploadingAvatar}
        />
      )}

      {/* Avatar Photo Viewer with menu */}
      {showAvatarViewer && profile?.avatar_url && (
        <ProfilePhotoViewer 
          imageUrl={profile.avatar_url}
          photoType="avatar"
          userId={profile.user_id}
          username={profile.username}
          isOwnProfile={isOwnProfile}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowAvatarViewer(false)}
          onPhotoDeleted={onProfileUpdate}
        />
      )}

      {/* Cover Photo Viewer with menu */}
      {showCoverViewer && (profile as any)?.cover_url && (
        <ProfilePhotoViewer 
          imageUrl={(profile as any).cover_url}
          photoType="cover"
          userId={profile!.user_id}
          username={profile?.username}
          isOwnProfile={isOwnProfile}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowCoverViewer(false)}
          onPhotoDeleted={onProfileUpdate}
        />
      )}
    </>
  );
};

export default ProfileHeader;
