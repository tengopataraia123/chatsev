import { useState } from 'react';
import { Users, Eye, MapPin, Calendar, Clock } from 'lucide-react';
import { Profile } from '@/types';
import StyledUsername from '@/components/username/StyledUsername';
import { BioDisplay, BioEditor } from '@/components/bio';
import { formatDistanceToNow, format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface ProfileInfoCardProps {
  profile: Profile | null;
  userRole: string | null;
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  visitorsCount: number;
  isOwnProfile: boolean;
  relationshipStatus?: {
    status: string;
    partnerUsername?: string;
    partnerId?: string;
  } | null;
  onShowVisitors?: () => void;
  onShowSubscribers?: () => void;
  onShowFriends?: () => void;
  onPartnerClick?: (partnerId: string) => void;
}

const ProfileInfoCard = ({
  profile,
  userRole,
  followersCount,
  followingCount,
  friendsCount,
  visitorsCount,
  isOwnProfile,
  relationshipStatus,
  onShowVisitors,
  onShowSubscribers,
  onShowFriends,
  onPartnerClick,
}: ProfileInfoCardProps) => {
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

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return null;
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 5) return 'ონლაინ';
    if (diffMins < 60) return `${diffMins} წუთის წინ`;

    // Compare calendar dates in local timezone
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));

    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');

    if (dayDiff === 0) return `დღეს ${hours}:${mins}`;
    if (dayDiff === 1) return `გუშინ ${hours}:${mins}`;
    if (dayDiff < 7) return `${dayDiff} დღის წინ`;
    
    return format(date, 'd MMM yyyy', { locale: ka });
  };

  const getRelationshipLabel = (status: string) => {
    const labels: Record<string, string> = {
      'single': 'თავისუფალია',
      'in_relationship': 'ურთიერთობაშია',
      'engaged': 'დანიშნულია',
      'married': 'დაქორწინებულია',
      'complicated': 'რთულია',
      'separated': 'დაშორებულია',
      'divorced': 'განქორწინებულია',
      'secret': 'საიდუმლო',
      'prefer_not_say': 'არ სურს თქმა',
    };
    return labels[status] || status;
  };

  const getRelationshipEmoji = (status: string) => {
    const emojis: Record<string, string> = {
      'single': '💚',
      'in_relationship': '❤️',
      'engaged': '💍',
      'married': '💍',
      'complicated': '💔',
      'separated': '💜',
      'divorced': '💜',
      'secret': '🤫',
    };
    return emojis[status] || '💜';
  };

  const roleLabel = getRoleLabel(userRole);

  return (
    <div className="pt-20 sm:pt-24 px-4 sm:px-6 pb-4 w-full max-w-full overflow-hidden text-center">
      {/* Username - centered under avatar */}
      <div className="flex justify-center">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
          <StyledUsername 
            username={profile?.username || 'მომხმარებელი'} 
            userId={profile?.user_id || ''} 
            className="text-xl sm:text-2xl font-bold"
          />
        </h1>
      </div>

      {/* Age & Gender - centered below username */}
      {(profile?.age || genderInfo || roleLabel) && (
        <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
          {profile?.age && (
            <span className="text-sm text-muted-foreground/70">
              {profile.age} წლის
            </span>
          )}
          {genderInfo && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              genderInfo.color === 'text-blue-500' 
                ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' 
                : 'bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/20'
            }`}>
              {genderInfo.icon} {genderInfo.label}
            </span>
          )}
          {roleLabel && (
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${getRoleBadgeColor(userRole)}`}>
              {roleLabel}
            </span>
          )}
        </div>
      )}

      {/* Personal Info - City, Last Visit, Registration, Relationship */}
      <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-muted-foreground/60">
        {(profile as any)?.city && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{(profile as any).city}</span>
          </div>
        )}
        
        {(profile as any)?.last_seen && (
          <div 
            className="flex items-center gap-1"
            title={format(new Date((profile as any).last_seen), 'd MMMM yyyy, HH:mm', { locale: ka })}
          >
            <Clock className="w-3 h-3" />
            <span>{formatLastSeen((profile as any).last_seen)}</span>
          </div>
        )}
        
        {profile?.created_at && (
          <div 
            className="flex items-center gap-1"
            title={format(new Date(profile.created_at), 'd MMMM yyyy', { locale: ka })}
          >
            <Calendar className="w-3 h-3" />
            <span>რეგ: {format(new Date(profile.created_at), 'd MMM yyyy', { locale: ka })}</span>
          </div>
        )}

        {relationshipStatus && relationshipStatus.status !== 'prefer_not_say' && (
          <div className="flex items-center gap-1">
            <span className="text-xs">{getRelationshipEmoji(relationshipStatus.status)}</span>
            <span>{getRelationshipLabel(relationshipStatus.status)}</span>
            {relationshipStatus.partnerUsername && relationshipStatus.partnerId && (
              <button 
                onClick={() => onPartnerClick?.(relationshipStatus.partnerId!)}
                className="text-primary hover:underline font-medium transition-colors"
              >
                {relationshipStatus.partnerUsername}-სთან
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bio Section */}
      {profile?.user_id && (
        <div className="mt-4">
          <BioDisplay 
            userId={profile.user_id} 
            isOwnProfile={isOwnProfile}
            onEdit={() => setShowBioEditor(true)}
          />
        </div>
      )}

      {/* Stats Row */}
      <div className="mt-4 mx-auto max-w-[280px] flex items-stretch justify-center bg-secondary/20 rounded-2xl p-1">
        <button 
          onClick={onShowFriends}
          className="flex-1 flex flex-col items-center py-2 rounded-xl hover:bg-secondary/50 active:scale-[0.97] transition-all"
        >
          <span className="text-base font-bold text-foreground leading-tight">{friendsCount}</span>
          <span className="text-muted-foreground/50 text-[10px] mt-0.5">მეგობარი</span>
        </button>
        
        <button 
          onClick={onShowSubscribers}
          className="flex-1 flex flex-col items-center py-2 rounded-xl hover:bg-secondary/50 active:scale-[0.97] transition-all"
        >
          <span className="text-base font-bold text-foreground leading-tight">{followersCount}</span>
          <span className="text-muted-foreground/50 text-[10px] mt-0.5">Followers</span>
        </button>
        
        <button 
          onClick={onShowSubscribers}
          className="flex-1 flex flex-col items-center py-2 rounded-xl hover:bg-secondary/50 active:scale-[0.97] transition-all"
        >
          <span className="text-base font-bold text-foreground leading-tight">{followingCount}</span>
          <span className="text-muted-foreground/50 text-[10px] mt-0.5">Following</span>
        </button>
        
        {isOwnProfile && (
          <button 
            onClick={onShowVisitors}
            className="flex-1 flex flex-col items-center py-2 rounded-xl hover:bg-secondary/50 active:scale-[0.97] transition-all"
          >
            <span className="text-base font-bold text-foreground leading-tight">{visitorsCount}</span>
            <span className="text-muted-foreground/50 text-[10px] mt-0.5 flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />
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

export default ProfileInfoCard;
