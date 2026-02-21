import { Check, X, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RelationshipRequest, 
  RELATIONSHIP_STATUS_LABELS 
} from '@/hooks/useRelationshipStatus';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface RelationshipRequestCardProps {
  request: RelationshipRequest;
  type: 'received' | 'sent';
  onAccept?: (requestId: string) => Promise<boolean>;
  onReject?: (requestId: string) => Promise<boolean>;
  onCancel?: (requestId: string) => Promise<boolean>;
  loading?: boolean;
}

const RelationshipRequestCard = ({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  loading = false
}: RelationshipRequestCardProps) => {
  const navigate = useNavigate();
  
  const profile = type === 'received' ? request.sender_profile : request.receiver_profile;
  const statusLabel = RELATIONSHIP_STATUS_LABELS[request.proposed_status];
  
  const timeAgo = formatDistanceToNow(new Date(request.created_at), {
    addSuffix: true,
    locale: ka
  });

  const getStatusEmoji = () => {
    switch (request.proposed_status) {
      case 'married':
        return '💍';
      case 'engaged':
        return '💎';
      case 'in_relationship':
        return '❤️';
      case 'complicated':
        return '💔';
      default:
        return '💜';
    }
  };

  const handleProfileClick = () => {
    if (profile?.user_id) {
      navigate(`/profile/${profile.user_id}`);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <button 
            onClick={handleProfileClick}
            className="flex-shrink-0"
          >
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url}
                alt={profile.username}
                className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold hover:bg-primary/30 transition-colors">
                {profile?.username?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={handleProfileClick}
                className="font-medium hover:underline"
              >
                {profile?.username || 'მომხმარებელი'}
              </button>
              
              {type === 'received' ? (
                <span className="text-sm text-muted-foreground">
                  გთავაზობთ ურთიერთობას
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  ელოდება დადასტურებას
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{getStatusEmoji()}</span>
                <span>{statusLabel}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
            
            {request.message && (
              <p className="mt-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg p-2">
                "{request.message}"
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {type === 'received' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => onAccept?.(request.id)}
                    disabled={loading}
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" />
                    დადასტურება
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onReject?.(request.id)}
                    disabled={loading}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    უარყოფა
                  </Button>
                </>
              )}
              
              {type === 'sent' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onCancel?.(request.id)}
                  disabled={loading}
                  className="gap-1"
                >
                  <X className="w-4 h-4" />
                  გაუქმება
                </Button>
              )}
            </div>
          </div>

          {/* Heart Icon */}
          <Heart className="w-5 h-5 text-red-500 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};

export default RelationshipRequestCard;
