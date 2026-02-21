import { useState } from 'react';
import { Users, Eye } from 'lucide-react';
import { Profile } from '@/types';
import StyledUsername from '@/components/username/StyledUsername';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BioDisplay, BioEditor } from '@/components/bio';

interface ProfileInfoProps {
  profile: Profile | null;
  userRole: string | null;
  followersCount: number;
  followingCount: number;
  friendsCount?: number;
  visitorsCount?: number;
  isOwnProfile: boolean;
  onShowVisitors?: () => void;
  onShowSubscribers?: () => void;
  friends?: { id: string; avatar_url: string | null; username: string }[];
}

const ProfileInfo = ({
  profile,
  userRole,
  followersCount,
  followingCount,
  friendsCount = 0,
  visitorsCount = 0,
  isOwnProfile,
  onShowVisitors,
  onShowSubscribers,
  friends = [],
}: ProfileInfoProps) => {
  const [showBioEditor, setShowBioEditor] = useState(false);

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'სუპერ ადმინი';
      case 'admin': return 'ადმინისტრატორი';
      case 'moderator': return 'მოდერატორი';
      default: return null;
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'bg-red-500/20 text-red-500';
      case 'admin': return 'bg-amber-500/20 text-amber-500';
      case 'moderator': return 'bg-blue-500/20 text-blue-500';
      default: return '';
    }
  };

  const getGenderDisplay = (gender: string | undefined) => {
    switch (gender) {
      case 'male': return { icon: '♂', color: 'text-blue-500', label: 'ბიჭი' };
      case 'female': return { icon: '♀', color: 'text-pink-500', label: 'გოგო' };
      default: return null;
    }
  };

  const genderInfo = getGenderDisplay((profile as any)?.gender);

  const roleLabel = getRoleLabel(userRole);

  return (
    <div className="pt-16 sm:pt-20 px-3 sm:px-8 pb-4 w-full max-w-full overflow-hidden text-center">
      {/* Name and Role - Centered */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap justify-center">
          <StyledUsername 
            username={profile?.username || 'მომხმარებელი'} 
            userId={profile?.user_id || ''} 
            className="text-xl sm:text-2xl font-bold"
          />
          {genderInfo && (
            <span className={`text-lg ${genderInfo.color}`} title={genderInfo.label}>
              {genderInfo.icon}
            </span>
          )}
          {profile?.age && (
            <span className="text-base sm:text-lg text-muted-foreground font-normal">
              {profile.age} წლის
            </span>
          )}
        </h1>
        {roleLabel && (
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
            {roleLabel}
          </span>
        )}
      </div>

      {/* Bio Section - Centered */}
      {profile?.user_id && (
        <div className="mt-3">
          <BioDisplay 
            userId={profile.user_id} 
            isOwnProfile={isOwnProfile}
            onEdit={() => setShowBioEditor(true)}
          />
        </div>
      )}

      {/* Stats Row - Centered */}
      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6 text-sm">
        <button 
          onClick={onShowSubscribers}
          className="flex flex-col items-center hover:text-primary transition-colors"
        >
          <span className="text-lg font-bold text-foreground">{friendsCount}</span>
          <span className="text-muted-foreground text-xs">მეგობარი</span>
        </button>
        <button 
          onClick={onShowSubscribers}
          className="flex flex-col items-center hover:text-primary transition-colors"
        >
          <span className="text-lg font-bold text-foreground">{followersCount}</span>
          <span className="text-muted-foreground text-xs">Followers</span>
        </button>
        <button 
          onClick={onShowSubscribers}
          className="flex flex-col items-center hover:text-primary transition-colors"
        >
          <span className="text-lg font-bold text-foreground">{followingCount}</span>
          <span className="text-muted-foreground text-xs">Following</span>
        </button>
        {isOwnProfile && (
          <button 
            onClick={onShowVisitors}
            className="flex flex-col items-center hover:text-primary transition-colors"
          >
            <span className="text-lg font-bold text-foreground">{visitorsCount}</span>
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" />
              ვიზიტორი
            </span>
          </button>
        )}
      </div>

      {/* Bio Editor Modal */}
      <BioEditor 
        isOpen={showBioEditor} 
        onClose={() => setShowBioEditor(false)} 
      />
    </div>
  );
};

export default ProfileInfo;
