import { useState } from 'react';
import { Heart, Settings, Send, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRelationshipStatus, RELATIONSHIP_STATUS_LABELS } from '@/hooks/useRelationshipStatus';
import RelationshipStatusDisplay from './RelationshipStatusDisplay';
import RelationshipProposalModal from './RelationshipProposalModal';
import RelationshipSettingsModal from './RelationshipSettingsModal';

interface RelationshipSectionProps {
  targetUserId: string;
  targetUsername: string;
  isOwnProfile: boolean;
}

const RelationshipSection = ({ 
  targetUserId, 
  targetUsername,
  isOwnProfile 
}: RelationshipSectionProps) => {
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const {
    myStatus,
    targetStatus,
    loading,
    actionLoading,
    canPropose,
    getPendingFromTarget,
    getPendingToTarget,
    sendProposal,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    endRelationship,
    updateStatus,
    updatePrivacy
  } = useRelationshipStatus(targetUserId);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-muted-foreground animate-pulse" />
          <div className="h-5 w-48 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  const displayStatus = isOwnProfile ? myStatus : targetStatus;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 bg-red-500/5 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          ურთიერთობის სტატუსი
        </h3>
        
        {isOwnProfile && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowSettingsModal(true)}
            className="gap-1"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">პარამეტრები</span>
          </Button>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        {/* Status Display */}
        <RelationshipStatusDisplay 
          status={displayStatus} 
          isOwnProfile={isOwnProfile}
          showPrivacy={isOwnProfile}
        />
        
        {/* Pending Request FROM Target (I need to respond) */}
        {!isOwnProfile && getPendingFromTarget && (
          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="font-semibold">{targetUsername}</span> 
              გთავაზობთ ურთიერთობას
              <Badge variant="secondary">
                {RELATIONSHIP_STATUS_LABELS[getPendingFromTarget.proposed_status]}
              </Badge>
            </p>
            
            {getPendingFromTarget.message && (
              <p className="text-sm text-muted-foreground mb-3 italic">
                "{getPendingFromTarget.message}"
              </p>
            )}
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => acceptRequest(getPendingFromTarget.id)}
                disabled={actionLoading}
                className="gap-1"
              >
                <Check className="w-4 h-4" />
                დადასტურება
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => rejectRequest(getPendingFromTarget.id)}
                disabled={actionLoading}
                className="gap-1"
              >
                <X className="w-4 h-4" />
                უარყოფა
              </Button>
            </div>
          </div>
        )}
        
        {/* Pending Request TO Target (waiting for response) */}
        {!isOwnProfile && getPendingToTarget && (
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              ელოდება დადასტურებას
              <Badge variant="secondary">
                {RELATIONSHIP_STATUS_LABELS[getPendingToTarget.proposed_status]}
              </Badge>
            </p>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => cancelRequest(getPendingToTarget.id)}
              disabled={actionLoading}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              შეთავაზების გაუქმება
            </Button>
          </div>
        )}
        
        {/* Proposal Button */}
        {!isOwnProfile && canPropose && !getPendingFromTarget && !getPendingToTarget && (
          <Button 
            variant="outline"
            onClick={() => setShowProposalModal(true)}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            ურთიერთობის შეთავაზება
          </Button>
        )}
      </div>

      {/* Proposal Modal */}
      <RelationshipProposalModal
        isOpen={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        onSend={(status, message) => sendProposal(targetUserId, status, message)}
        targetUsername={targetUsername}
        loading={actionLoading}
      />

      {/* Settings Modal */}
      <RelationshipSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentStatus={myStatus}
        onUpdateStatus={updateStatus}
        onUpdatePrivacy={updatePrivacy}
        onEndRelationship={endRelationship}
        loading={actionLoading}
      />
    </div>
  );
};

export default RelationshipSection;
