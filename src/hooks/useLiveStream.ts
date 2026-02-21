import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface LiveStream {
  id: string;
  host_id: string;
  title: string;
  status: 'prelive' | 'live' | 'paused' | 'ended';
  stream_type: 'single' | 'multi';
  min_participants: number;
  viewer_count: number;
  like_count: number;
  reaction_count: number;
  thumbnail_url: string | null;
  is_pinned: boolean;
  slow_mode_seconds: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  host_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface LiveParticipant {
  id: string;
  live_id: string;
  user_id: string;
  role: 'host' | 'guest';
  status: 'invited' | 'requested' | 'approved' | 'rejected' | 'ignored' | 'connected' | 'disconnected' | 'left';
  is_muted: boolean;
  is_camera_off: boolean;
  position: number;
  joined_at: string | null;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface LiveComment {
  id: string;
  live_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface LiveInvite {
  id: string;
  live_id: string;
  from_user_id: string;
  to_user_id: string;
  invite_type: 'invite' | 'request';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'ignored';
  expires_at: string;
  created_at: string;
  from_profile?: {
    username: string;
    avatar_url: string | null;
  };
  to_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export const useLiveStream = (liveId?: string) => {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [pendingInvites, setPendingInvites] = useState<LiveInvite[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LiveInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [lastCommentTime, setLastCommentTime] = useState<number>(0);
  const [lastReactionTime, setLastReactionTime] = useState<number>(0);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch stream data
  const fetchStream = useCallback(async () => {
    if (!liveId) return;
    
    const { data, error } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', liveId)
      .single();

    if (error) {
      console.error('Error fetching stream:', error);
      return;
    }

    // Fetch host profile
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('user_id', data.host_id)
      .single();

    setStream({
      ...data,
      host_profile: hostProfile || undefined,
    } as LiveStream);

    setIsHost(data.host_id === user?.id);
  }, [liveId, user?.id]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!liveId) return;

    const { data, error } = await supabase
      .from('live_participants')
      .select('*')
      .eq('live_id', liveId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

    // Fetch profiles for participants
    const userIds = data.map(p => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setParticipants(data.map(p => ({
      ...p,
      profile: profileMap.get(p.user_id),
    })) as LiveParticipant[]);
  }, [liveId]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!liveId) return;

    const { data, error } = await supabase
      .from('live_comments')
      .select('*')
      .eq('live_id', liveId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    // Fetch profiles
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setComments(data.map(c => ({
      ...c,
      profile: profileMap.get(c.user_id),
    })) as LiveComment[]);
  }, [liveId]);

  // Fetch pending invites/requests
  const fetchInvites = useCallback(async () => {
    if (!liveId || !user) return;

    // Fetch invites TO current user
    const { data: invites } = await supabase
      .from('live_invites')
      .select('*')
      .eq('live_id', liveId)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    // Fetch user profiles for invites
    if (invites && invites.length > 0) {
      const fromUserIds = invites.map(i => i.from_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', fromUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      setPendingInvites(invites.map(i => ({
        ...i,
        from_profile: profileMap.get(i.from_user_id),
      })) as LiveInvite[]);
    } else {
      setPendingInvites([]);
    }

    // Always try to fetch requests if user is the host
    // Also check using liveId by fetching stream data directly to avoid timing issues
    const { data: streamData } = await supabase
      .from('live_streams')
      .select('host_id')
      .eq('id', liveId)
      .single();
    
    const isCurrentUserHost = streamData?.host_id === user.id;
    
    if (isCurrentUserHost) {
      const { data: requests } = await supabase
        .from('live_invites')
        .select('*')
        .eq('live_id', liveId)
        .eq('invite_type', 'request')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      console.log('Fetched pending requests for host:', requests?.length || 0);

      if (requests && requests.length > 0) {
        const fromUserIds = requests.map(r => r.from_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', fromUserIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        setPendingRequests(requests.map(r => ({
          ...r,
          from_profile: profileMap.get(r.from_user_id),
        })) as LiveInvite[]);
      } else {
        setPendingRequests([]);
      }
    }
  }, [liveId, user]);

  // Create a new live stream and go live immediately
  const createLiveStream = async (title: string, streamType: 'single' | 'multi' = 'multi') => {
    if (!user) {
      toast({ title: 'შედით სისტემაში', variant: 'destructive' });
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          host_id: user.id,
          title,
          stream_type: streamType,
          min_participants: 1, // Host can start alone, guests join and screen splits (max 4)
          status: 'live', // Go live immediately
          started_at: new Date().toISOString(),
          is_pinned: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as participant
      await supabase.from('live_participants').insert({
        live_id: data.id,
        user_id: user.id,
        role: 'host',
        status: 'connected',
        position: 0,
        joined_at: new Date().toISOString(),
      });

      // Send notifications to online users
      await sendLiveStartNotificationsForId(data.id, title);

      toast({ title: 'ლაივი დაიწყო! 🎥' });
      return data.id;
    } catch (error) {
      console.error('Error creating live stream:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to send notifications with a specific live ID
  const sendLiveStartNotificationsForId = async (liveStreamId: string, title: string) => {
    if (!user || !profile) return;

    try {
      const gracePeriodMinutes = 15;
      const cutoffTime = new Date(Date.now() - gracePeriodMinutes * 60 * 1000).toISOString();

      const { data: onlineUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .gt('last_seen', cutoffTime)
        .neq('user_id', user.id)
        .limit(1000);

      if (!onlineUsers || onlineUsers.length === 0) return;

      const notifications = onlineUsers.map(u => ({
        user_id: u.user_id,
        from_user_id: user.id,
        type: 'live_started',
        message: `${profile.username} არის ლაივში`,
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (error) {
      console.error('Error sending live notifications:', error);
    }
  };

  // Start live (can start with any number of participants, guests can join later)
  const startLive = async () => {
    if (!liveId || !isHost) return false;

    try {
      const { error } = await supabase
        .from('live_streams')
        .update({ 
          status: 'live', 
          started_at: new Date().toISOString(),
          is_pinned: true,
        })
        .eq('id', liveId);

      if (error) throw error;

      // Send notifications to online users
      await sendLiveStartNotifications();

      toast({ title: 'ლაივი დაიწყო! 🎥' });
      return true;
    } catch (error) {
      console.error('Error starting live:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
      return false;
    }
  };

  // Send notifications to online users when live starts
  const sendLiveStartNotifications = async () => {
    if (!user || !profile || !liveId) return;

    try {
      // Get online users (using grace period logic)
      const gracePeriodMinutes = 15; // Default grace period
      const cutoffTime = new Date(Date.now() - gracePeriodMinutes * 60 * 1000).toISOString();

      const { data: onlineUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .gt('last_seen', cutoffTime)
        .neq('user_id', user.id)
        .limit(1000);

      if (!onlineUsers || onlineUsers.length === 0) return;

      // Create notifications for all online users
      const notifications = onlineUsers.map(u => ({
        user_id: u.user_id,
        from_user_id: user.id,
        type: 'live_started',
        message: `${profile.username} არის ლაივში`,
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (error) {
      console.error('Error sending live notifications:', error);
    }
  };

  // End live
  const endLive = async () => {
    if (!liveId || !isHost) return;

    try {
      await supabase
        .from('live_streams')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          is_pinned: false,
        })
        .eq('id', liveId);

      // Clean up live_started notifications for this stream
      if (user) {
        await supabase
          .from('notifications')
          .delete()
          .eq('from_user_id', user.id)
          .eq('type', 'live_started');
      }

      toast({ title: 'ლაივი დასრულდა' });
    } catch (error) {
      console.error('Error ending live:', error);
    }
  };

  // Invite user to join
  const inviteUser = async (userId: string) => {
    if (!liveId || !user) return;

    try {
      await supabase.from('live_invites').insert({
        live_id: liveId,
        from_user_id: user.id,
        to_user_id: userId,
        invite_type: 'invite',
        expires_at: new Date(Date.now() + 60000).toISOString(),
      });

      toast({ title: 'მოწვევა გაიგზავნა' });
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };

  // Request to join (from viewer)
  const requestToJoin = async () => {
    if (!liveId || !user || !stream) return;

    try {
      await supabase.from('live_invites').insert({
        live_id: liveId,
        from_user_id: user.id,
        to_user_id: stream.host_id,
        invite_type: 'request',
        expires_at: new Date(Date.now() + 120000).toISOString(),
      });

      toast({ title: 'მოთხოვნა გაიგზავნა' });
    } catch (error) {
      console.error('Error requesting to join:', error);
    }
  };

  // Respond to invite/request
  const respondToInvite = async (inviteId: string, response: 'accepted' | 'declined' | 'ignored') => {
    if (!user) return;

    try {
      await supabase
        .from('live_invites')
        .update({ 
          status: response, 
          responded_at: new Date().toISOString() 
        })
        .eq('id', inviteId);

      if (response === 'accepted' && liveId) {
        // Add user as participant
        const nextPosition = participants.length;
        await supabase.from('live_participants').upsert({
          live_id: liveId,
          user_id: user.id,
          role: 'guest',
          status: 'approved',
          position: nextPosition,
        });
      }

      toast({ 
        title: response === 'accepted' ? 'მოწვევა მიღებულია' : 
               response === 'declined' ? 'მოწვევა უარყოფილია' : 
               'იგნორირებულია' 
      });
    } catch (error) {
      console.error('Error responding to invite:', error);
    }
  };

  // Approve join request (host only)
  const approveRequest = async (inviteId: string, userId: string) => {
    if (!liveId || !isHost) return;

    try {
      await supabase
        .from('live_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', inviteId);

      const nextPosition = participants.length;
      await supabase.from('live_participants').upsert({
        live_id: liveId,
        user_id: userId,
        role: 'guest',
        status: 'approved',
        position: nextPosition,
      });

      toast({ title: 'მოთხოვნა დამტკიცდა' });
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  // Join as viewer
  const joinAsViewer = async () => {
    if (!liveId || !user) return;

    try {
      await supabase.from('live_viewers').upsert({
        live_id: liveId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        left_at: null,
      });
    } catch (error) {
      console.error('Error joining as viewer:', error);
    }
  };

  // Leave as viewer
  const leaveAsViewer = async () => {
    if (!liveId || !user) return;

    try {
      await supabase
        .from('live_viewers')
        .update({ left_at: new Date().toISOString() })
        .eq('live_id', liveId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error leaving as viewer:', error);
    }
  };

  // Send comment (with rate limiting)
  const sendComment = async (content: string) => {
    if (!liveId || !user) return;

    const now = Date.now();
    const slowModeMs = (stream?.slow_mode_seconds || 2) * 1000;
    
    if (now - lastCommentTime < slowModeMs) {
      toast({ 
        title: `დაელოდეთ ${Math.ceil((slowModeMs - (now - lastCommentTime)) / 1000)} წამი`,
        variant: 'destructive'
      });
      return;
    }

    try {
      await supabase.from('live_comments').insert({
        live_id: liveId,
        user_id: user.id,
        content,
      });
      setLastCommentTime(now);
    } catch (error) {
      console.error('Error sending comment:', error);
    }
  };

  // Send reaction (with rate limiting)
  const sendReaction = async (reactionType: string) => {
    if (!liveId || !user) return;

    const now = Date.now();
    if (now - lastReactionTime < 500) return; // 500ms cooldown

    try {
      await supabase.from('live_reactions').insert({
        live_id: liveId,
        user_id: user.id,
        reaction_type: reactionType,
      });
      setLastReactionTime(now);
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  // Pin comment (host only)
  const pinComment = async (commentId: string) => {
    if (!isHost) return;

    try {
      // Unpin all other comments first
      await supabase
        .from('live_comments')
        .update({ is_pinned: false })
        .eq('live_id', liveId);

      // Pin the selected comment
      await supabase
        .from('live_comments')
        .update({ is_pinned: true })
        .eq('id', commentId);
    } catch (error) {
      console.error('Error pinning comment:', error);
    }
  };

  // Delete comment (host/mod)
  const deleteComment = async (commentId: string) => {
    try {
      await supabase
        .from('live_comments')
        .update({ is_deleted: true })
        .eq('id', commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Mute user from chat (host)
  const muteUserChat = async (userId: string, minutes: number = 10) => {
    if (!liveId || !isHost) return;

    try {
      await supabase
        .from('live_viewers')
        .update({ 
          is_muted_chat: true,
          muted_until: new Date(Date.now() + minutes * 60000).toISOString(),
        })
        .eq('live_id', liveId)
        .eq('user_id', userId);

      toast({ title: 'მომხმარებელი დამუტდა' });
    } catch (error) {
      console.error('Error muting user:', error);
    }
  };

  // Block user from live (host)
  const blockUserFromLive = async (userId: string) => {
    if (!liveId || !isHost) return;

    try {
      await supabase
        .from('live_viewers')
        .update({ is_blocked: true })
        .eq('live_id', liveId)
        .eq('user_id', userId);

      toast({ title: 'მომხმარებელი დაბლოკდა' });
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  // Kick participant (host)
  const kickParticipant = async (userId: string) => {
    if (!liveId || !isHost) return;

    try {
      await supabase
        .from('live_participants')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .eq('live_id', liveId)
        .eq('user_id', userId);

      toast({ title: 'მონაწილე გაძევებულია' });
    } catch (error) {
      console.error('Error kicking participant:', error);
    }
  };

  // Toggle slow mode
  const setSlowMode = async (seconds: number) => {
    if (!liveId || !isHost) return;

    try {
      await supabase
        .from('live_streams')
        .update({ slow_mode_seconds: seconds })
        .eq('id', liveId);
    } catch (error) {
      console.error('Error setting slow mode:', error);
    }
  };

  // Set up realtime subscriptions
  useEffect(() => {
    if (!liveId) return;

    fetchStream();
    fetchParticipants();
    fetchComments();
    fetchInvites();

    // Subscribe to stream changes
    const streamChannel = supabase
      .channel(`live-stream-${liveId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_streams',
        filter: `id=eq.${liveId}`
      }, () => fetchStream())
      .subscribe();

    // Subscribe to participants changes
    const participantsChannel = supabase
      .channel(`live-participants-${liveId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_participants',
        filter: `live_id=eq.${liveId}`
      }, () => fetchParticipants())
      .subscribe();

    // Subscribe to comments
    const commentsChannel = supabase
      .channel(`live-comments-${liveId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_comments',
        filter: `live_id=eq.${liveId}`
      }, async (payload) => {
        const newComment = payload.new as any;
        // Fetch profile for new comment
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('user_id', newComment.user_id)
          .single();
        
        setComments(prev => [...prev.slice(-99), {
          ...newComment,
          profile,
        }]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'live_comments',
        filter: `live_id=eq.${liveId}`
      }, () => fetchComments())
      .subscribe();

    // Subscribe to invites
    const invitesChannel = supabase
      .channel(`live-invites-${liveId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_invites',
        filter: `live_id=eq.${liveId}`
      }, () => fetchInvites())
      .subscribe();

    return () => {
      supabase.removeChannel(streamChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(invitesChannel);
    };
  }, [liveId, fetchStream, fetchParticipants, fetchComments, fetchInvites]);

  return {
    stream,
    participants,
    comments,
    pendingInvites,
    pendingRequests,
    loading,
    isHost,
    createLiveStream,
    startLive,
    endLive,
    inviteUser,
    requestToJoin,
    respondToInvite,
    approveRequest,
    joinAsViewer,
    leaveAsViewer,
    sendComment,
    sendReaction,
    pinComment,
    deleteComment,
    muteUserChat,
    blockUserFromLive,
    kickParticipant,
    setSlowMode,
    fetchStream,
  };
};

// Hook to get all active live streams
export const useActiveLiveStreams = () => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('id, host_id, title, status, stream_type, viewer_count, like_count, reaction_count, thumbnail_url, is_pinned, created_at, started_at')
        .in('status', ['prelive', 'live'])
        .order('viewer_count', { ascending: false })
        .limit(20); // Limit for performance

      if (error) throw error;

      if (!data || data.length === 0) {
        setStreams([]);
        setLoading(false);
        return;
      }

      // Fetch host profiles and check if they are banned
      const hostIds = [...new Set(data.map(s => s.host_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_site_banned')
        .in('user_id', hostIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Filter out streams from banned users only - keep streams if profile not found or not banned
      const filteredStreams = data.filter(s => {
        const profile = profileMap.get(s.host_id);
        // Only filter out if profile exists AND is banned
        return !profile?.is_site_banned;
      });

      setStreams(filteredStreams.map(s => {
        const profile = profileMap.get(s.host_id);
        return {
          ...s,
          host_profile: profile ? { username: profile.username, avatar_url: profile.avatar_url } : undefined,
        };
      }) as LiveStream[]);
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();

    // Subscribe to live streams changes
    const channel = supabase
      .channel('active-live-streams')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_streams'
      }, () => fetchStreams())
      .subscribe();

    // Also subscribe to profile changes (for ban status)
    const profileChannel = supabase
      .channel('live-streams-profile-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles'
      }, () => fetchStreams())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(profileChannel);
    };
  }, [fetchStreams]);

  return { streams, loading, refetch: fetchStreams };
};

// Helper function to end all live streams for a user (call when banning)
export const endUserLiveStreams = async (userId: string) => {
  try {
    await supabase
      .from('live_streams')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        is_pinned: false,
      })
      .eq('host_id', userId)
      .in('status', ['prelive', 'live']);
    
    // Clean up live_started notifications for this user
    await supabase
      .from('notifications')
      .delete()
      .eq('from_user_id', userId)
      .eq('type', 'live_started');
    
    return true;
  } catch (error) {
    console.error('Error ending user live streams:', error);
    return false;
  }
};

// Admin function to force end any live stream
export const adminEndLiveStream = async (liveId: string) => {
  try {
    await supabase
      .from('live_streams')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        is_pinned: false,
        is_saved: false,
      })
      .eq('id', liveId);
    
    return true;
  } catch (error) {
    console.error('Error force ending live stream:', error);
    return false;
  }
};
