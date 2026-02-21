import { Heart, Lock, Users, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RelationshipStatus, RELATIONSHIP_STATUS_LABELS, PRIVACY_LABELS } from '@/hooks/useRelationshipStatus';
import { Badge } from '@/components/ui/badge';

interface RelationshipStatusDisplayProps {
  status: RelationshipStatus | null;
  isOwnProfile: boolean;
  showPrivacy?: boolean;
}

const RelationshipStatusDisplay = ({ 
  status, 
  isOwnProfile,
  showPrivacy = false 
}: RelationshipStatusDisplayProps) => {
  const navigate = useNavigate();

  if (!status) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Heart className="w-5 h-5" />
        <span>ურთიერთობის სტატუსი: მითითებული არ არის</span>
      </div>
    );
  }

  // If privacy is only_me and it's not own profile, don't show
  if (status.privacy_level === 'only_me' && !isOwnProfile) {
    return null;
  }

  const statusLabel = RELATIONSHIP_STATUS_LABELS[status.status] || 'უცნობი';
  const hasPartner = status.partner_id && status.partner_profile;
  const showPartnerName = hasPartner && !status.hide_partner_name;

  const getStatusIcon = () => {
    switch (status.status) {
      case 'married':
      case 'engaged':
        return '💍';
      case 'in_relationship':
        return '❤️';
      case 'complicated':
        return '💔';
      case 'single':
        return '💚';
      case 'secret':
        return '🤫';
      default:
        return '💜';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'married':
      case 'engaged':
        return 'bg-pink-500/20 text-pink-500 border-pink-500/30';
      case 'in_relationship':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'complicated':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'single':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'secret':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const handlePartnerClick = () => {
    if (showPartnerName && status.partner_profile) {
      navigate(`/profile/${status.partner_profile.user_id}`);
    }
  };

  const getPrivacyIcon = () => {
    switch (status.privacy_level) {
      case 'public':
        return <Eye className="w-3 h-3" />;
      case 'friends':
        return <Users className="w-3 h-3" />;
      case 'only_me':
        return <Lock className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Heart className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div className="flex flex-wrap items-center gap-2">
        <Badge 
          variant="outline" 
          className={`${getStatusColor()} flex items-center gap-1.5 px-3 py-1`}
        >
          <span>{getStatusIcon()}</span>
          <span className="font-medium">{statusLabel}</span>
        </Badge>
        
        {showPartnerName && status.partner_profile && (
          <>
            <span className="text-muted-foreground">—</span>
            <button
              onClick={handlePartnerClick}
              className="flex items-center gap-2 hover:underline text-primary font-medium"
            >
              {status.partner_profile.avatar_url ? (
                <img 
                  src={status.partner_profile.avatar_url} 
                  alt={status.partner_profile.username}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                  {status.partner_profile.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <span>{status.partner_profile.username}</span>
            </button>
          </>
        )}
        
        {hasPartner && status.hide_partner_name && (
          <span className="text-muted-foreground text-sm">(პარტნიორი დამალულია)</span>
        )}
        
        {showPrivacy && isOwnProfile && (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            {getPrivacyIcon()}
            <span>{PRIVACY_LABELS[status.privacy_level]}</span>
          </Badge>
        )}
      </div>
    </div>
  );
};

export default RelationshipStatusDisplay;
