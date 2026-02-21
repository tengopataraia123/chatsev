import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type RelationshipStatusType = 
  | 'single' 
  | 'in_relationship' 
  | 'engaged' 
  | 'married' 
  | 'complicated' 
  | 'separated' 
  | 'divorced' 
  | 'widowed' 
  | 'secret';

export type RelationshipPrivacyLevel = 'public' | 'friends' | 'only_me';

export interface RelationshipStatus {
  id: string;
  user_id: string;
  status: RelationshipStatusType;
  partner_id: string | null;
  privacy_level: RelationshipPrivacyLevel;
  hide_partner_name: boolean;
  relationship_started_at: string | null;
  created_at: string;
  updated_at: string;
  partner_profile?: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface RelationshipRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  proposed_status: RelationshipStatusType;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  responded_at: string | null;
  created_at: string;
  sender_profile?: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  };
  receiver_profile?: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  };
}

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatusType, string> = {
  single: 'თავისუფალია',
  in_relationship: 'ურთიერთობაშია',
  engaged: 'ნიშნიანია',
  married: 'დაქორწინებულია',
  complicated: 'რთულია',
  separated: 'დაშორებულია',
  divorced: 'განქორწინებულია',
  widowed: 'დაქვრივებულია', // kept for backwards compatibility
  secret: 'საიდუმლო'
};

// Status options available for user selection (excluding widowed)
export const SELECTABLE_STATUS_OPTIONS: RelationshipStatusType[] = [
  'single', 'in_relationship', 'engaged', 'married', 'complicated', 
  'separated', 'divorced', 'secret'
];

export const PRIVACY_LABELS: Record<RelationshipPrivacyLevel, string> = {
  public: 'ყველასთვის',
  friends: 'მეგობრებისთვის',
  only_me: 'მხოლოდ მე'
};

export const useRelationshipStatus = (targetUserId?: string) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [myStatus, setMyStatus] = useState<RelationshipStatus | null>(null);
  const [targetStatus, setTargetStatus] = useState<RelationshipStatus | null>(null);
  const [pendingRequests, setPendingRequests] = useState<RelationshipRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<RelationshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUserId = session?.user?.id;

  const fetchMyStatus = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('relationship_statuses')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.partner_id) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .eq('user_id', data.partner_id)
          .single();
        
        setMyStatus({ ...data, partner_profile: partnerProfile } as RelationshipStatus);
      } else {
        setMyStatus(data as RelationshipStatus);
      }
    } catch (error) {
      console.error('Error fetching my relationship status:', error);
    }
  }, [currentUserId]);

  const fetchTargetStatus = useCallback(async () => {
    if (!targetUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('relationship_statuses')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.partner_id) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .eq('user_id', data.partner_id)
          .single();
        
        setTargetStatus({ ...data, partner_profile: partnerProfile } as RelationshipStatus);
      } else {
        setTargetStatus(data as RelationshipStatus);
      }
    } catch (error) {
      console.error('Error fetching target relationship status:', error);
    }
  }, [targetUserId]);

  const fetchPendingRequests = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('relationship_requests')
        .select('*')
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch sender profiles
      if (data && data.length > 0) {
        const senderIds = data.map(r => r.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', senderIds);
        
        const requestsWithProfiles = data.map(request => ({
          ...request,
          sender_profile: profiles?.find(p => p.user_id === request.sender_id)
        }));
        
        setPendingRequests(requestsWithProfiles as RelationshipRequest[]);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  }, [currentUserId]);

  const fetchSentRequests = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('relationship_requests')
        .select('*')
        .eq('sender_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch receiver profiles
      if (data && data.length > 0) {
        const receiverIds = data.map(r => r.receiver_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', receiverIds);
        
        const requestsWithProfiles = data.map(request => ({
          ...request,
          receiver_profile: profiles?.find(p => p.user_id === request.receiver_id)
        }));
        
        setSentRequests(requestsWithProfiles as RelationshipRequest[]);
      } else {
        setSentRequests([]);
      }
    } catch (error) {
      console.error('Error fetching sent requests:', error);
    }
  }, [currentUserId]);

  const sendProposal = async (receiverId: string, proposedStatus: RelationshipStatusType, message?: string) => {
    if (!currentUserId) return false;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('relationship_requests')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          proposed_status: proposedStatus,
          message: message || null
        });
      
      if (error) throw error;
      
      // Create notification for receiver
      await supabase.from('notifications').insert({
        user_id: receiverId,
        from_user_id: currentUserId,
        type: 'relationship_proposal',
        message: 'თქვენ მიიღეთ ურთიერთობის შეთავაზება'
      });
      
      toast({
        title: 'წარმატება',
        description: 'ურთიერთობის შეთავაზება გაიგზავნა'
      });
      
      await fetchSentRequests();
      return true;
    } catch (error: any) {
      console.error('Error sending proposal:', error);
      toast({
        title: 'შეცდომა',
        description: error.message || 'შეთავაზება ვერ გაიგზავნა',
        variant: 'destructive'
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('accept_relationship_request', {
        request_id: requestId
      });
      
      if (error) throw error;
      
      toast({
        title: 'წარმატება',
        description: 'ურთიერთობა დადასტურდა'
      });
      
      await Promise.all([fetchMyStatus(), fetchPendingRequests()]);
      return true;
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast({
        title: 'შეცდომა',
        description: error.message || 'დადასტურება ვერ მოხერხდა',
        variant: 'destructive'
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('reject_relationship_request', {
        request_id: requestId
      });
      
      if (error) throw error;
      
      toast({
        title: 'წარმატება',
        description: 'შეთავაზება უარყოფილია'
      });
      
      await fetchPendingRequests();
      return true;
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'შეცდომა',
        description: error.message || 'უარყოფა ვერ მოხერხდა',
        variant: 'destructive'
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async (requestId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('relationship_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('sender_id', currentUserId);
      
      if (error) throw error;
      
      toast({
        title: 'წარმატება',
        description: 'შეთავაზება გაუქმდა'
      });
      
      await fetchSentRequests();
      return true;
    } catch (error: any) {
      console.error('Error canceling request:', error);
      toast({
        title: 'შეცდომა',
        description: error.message || 'გაუქმება ვერ მოხერხდა',
        variant: 'destructive'
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const endRelationship = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('end_relationship');
      
      if (error) throw error;
      
      toast({
        title: 'წარმატება',
        description: 'ურთიერთობა დასრულდა'
      });
      
      await fetchMyStatus();
      return true;
    } catch (error: any) {
      console.error('Error ending relationship:', error);
      toast({
        title: 'შეცდომა',
        description: error.message || 'დასრულება ვერ მოხერხდა',
        variant: 'destructive'
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async (status: RelationshipStatusType) => {
    if (!currentUserId) return false;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('relationship_statuses')
        .upsert({
          user_id: currentUserId,
          status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      toast({
        title: 'წარმატება',
        description: 'სტატუსი განახლდა'
      });
      
      await fetchMyStatus();
      return true;
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'შეცდომა',
        description: error.message || 'სტატუსი ვერ განახლდა',
        variant: 'destructive'
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updatePrivacy = async (privacyLevel: RelationshipPrivacyLevel, hidePartnerName: boolean) => {
    if (!currentUserId) return false;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('relationship_statuses')
        .upsert({
          user_id: currentUserId,
          privacy_level: privacyLevel,
          hide_partner_name: hidePartnerName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      toast({
        title: 'წარმატება',
        description: 'კონფიდენციალურობა განახლდა'
      });
      
      await fetchMyStatus();
      return true;
    } catch (error: any) {
      console.error('Error updating privacy:', error);
      toast({
        title: 'შეცდომა',
        description: error.message || 'კონფიდენციალურობა ვერ განახლდა',
        variant: 'destructive'
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Check if can propose to target user
  const canPropose = useCallback(() => {
    if (!currentUserId || !targetUserId) return false;
    if (currentUserId === targetUserId) return false;
    
    // Check if I already have a partner
    if (myStatus?.partner_id) return false;
    
    // Check if target already has a partner
    if (targetStatus?.partner_id) return false;
    
    // Check if there's already a pending request
    const hasPendingToTarget = sentRequests.some(r => r.receiver_id === targetUserId);
    const hasPendingFromTarget = pendingRequests.some(r => r.sender_id === targetUserId);
    
    return !hasPendingToTarget && !hasPendingFromTarget;
  }, [currentUserId, targetUserId, myStatus, targetStatus, sentRequests, pendingRequests]);

  // Get pending request from target user
  const getPendingFromTarget = useCallback(() => {
    if (!targetUserId) return null;
    return pendingRequests.find(r => r.sender_id === targetUserId) || null;
  }, [targetUserId, pendingRequests]);

  // Get pending request to target user
  const getPendingToTarget = useCallback(() => {
    if (!targetUserId) return null;
    return sentRequests.find(r => r.receiver_id === targetUserId) || null;
  }, [targetUserId, sentRequests]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyStatus(),
        fetchTargetStatus(),
        fetchPendingRequests(),
        fetchSentRequests()
      ]);
      setLoading(false);
    };
    
    fetchAll();
  }, [fetchMyStatus, fetchTargetStatus, fetchPendingRequests, fetchSentRequests]);

  // Subscribe to realtime updates for requests
  useEffect(() => {
    if (!currentUserId) return;
    
    const channel = supabase
      .channel('relationship_requests_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationship_requests',
          filter: `receiver_id=eq.${currentUserId}`
        },
        () => {
          fetchPendingRequests();
          fetchMyStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationship_requests',
          filter: `sender_id=eq.${currentUserId}`
        },
        () => {
          fetchSentRequests();
          fetchMyStatus();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchPendingRequests, fetchSentRequests, fetchMyStatus]);

  return {
    myStatus,
    targetStatus,
    pendingRequests,
    sentRequests,
    loading,
    actionLoading,
    sendProposal,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    endRelationship,
    updateStatus,
    updatePrivacy,
    canPropose: canPropose(),
    getPendingFromTarget: getPendingFromTarget(),
    getPendingToTarget: getPendingToTarget(),
    refetch: () => Promise.all([fetchMyStatus(), fetchTargetStatus(), fetchPendingRequests(), fetchSentRequests()])
  };
};
