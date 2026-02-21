import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Mail, Check, X, CheckCircle, XCircle, Radio, Camera, Eye, BarChart3, Star, Search, ArrowLeft, Trash2, Loader2, Gamepad2, Gift, Flag, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Ban, HeartHandshake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getReactionEmoji } from '@/components/reactions/ReactionPicker';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { logAdminAction } from '@/hooks/useAdminActionLog';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
// Game invites removed
const GAME_NAMES: Record<string, string> = {};

type NotificationType = 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'message' | 'follow' | 'group_chat_reply' | 'group_chat_reaction' | 'group_chat_mention' | 'private_group_message' | 'content_approved' | 'content_rejected' | 'ignore' | 'reaction' | 'post_reaction' | 'live_started' | 'story_expired' | 'story_comment' | 'story_reaction' | 'relationship_proposal' | 'relationship_accepted' | 'relationship_rejected' | 'relationship_ended' | 'reel_like' | 'reel_comment' | 'friend_post' | 'friend_photo' | 'friend_video' | 'friend_story' | 'friend_reel' | 'friend_avatar_change' | 'friend_cover_change' | 'friend_poll' | 'friend_quiz' | 'group_invite' | 'group_join_request' | 'group_post' | 'group_member_joined' | 'group_invite_accepted' | 'group_request_approved' | 'dating_match' | 'dating_like' | 'dating_super_like' | 'dating_message' | 'game_friend_request' | 'game_friend_accepted' | 'game_friend_declined' | 'game_invite' | 'game_invite_accepted' | 'game_invite_declined' | 'gift_received';

interface Notification {
  id: string;
  type: NotificationType;
  from_user_id: string;
  post_id?: string | null;
  message?: string | null;
  content?: string | null;
  related_id?: string | null;
  related_type?: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string;
    avatar_url: string | null;
  };
  post_preview?: string | null;
}

interface NotificationsFullPageProps {
  onBack?: () => void;
  onUserClick?: (userId: string) => void;
  onGroupChatNavigate?: (messageId: string, username?: string, roomType?: string) => void;
  onCreateStory?: () => void;
  onReelClick?: (reelId: string) => void;
  onPostClick?: (postId: string) => void;
  onStoryClick?: (userId: string) => void;
  onPollClick?: (pollId: string) => void;
  onQuizClick?: (quizId: string) => void;
  onVideoClick?: (videoId: string) => void;
  onDatingClick?: (tab?: 'discover' | 'matches' | 'likes') => void;
  onCountChange?: () => void;
  initialNotifications?: Notification[];
  onGameInviteAccepted?: (roomId: string, gameType: string) => void;
}

const NotificationsFullPage = memo(({ 
  onBack,
  onUserClick, 
  onGroupChatNavigate, 
  onCreateStory, 
  onReelClick, 
  onPostClick, 
  onStoryClick, 
  onPollClick, 
  onQuizClick, 
  onVideoClick, 
  onDatingClick,
  onCountChange,
  initialNotifications,
  onGameInviteAccepted
}: NotificationsFullPageProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications || []);
  const [isLoading, setIsLoading] = useState(!initialNotifications || initialNotifications.length === 0);
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);

  const isSuperAdmin = userRole === 'super_admin';

  // Delete confirm dialog states
  const [deleteReportDialogOpen, setDeleteReportDialogOpen] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Reports state for super admins
  interface Report {
    id: string;
    reporter_user_id: string;
    reported_user_id: string;
    content_type: string;
    content_id: string;
    reason_type: string | null;
    reason_text: string;
    status: string;
    created_at: string;
    content_preview: string | null;
    reviewed_by_admin_id: string | null;
    reviewed_at: string | null;
    admin_notes: string | null;
    reporter?: { username: string; avatar_url: string | null };
    reported?: { username: string; avatar_url: string | null };
    reviewer?: { username: string; avatar_url: string | null } | null;
  }

  const STATUS_LABELS: Record<string, string> = {
    new: 'ახალი',
    reviewing: 'განხილვაშია',
    resolved: 'დასრულებული',
    dismissed: 'უარყოფილი',
  };

  const handleReportAction = async (reportId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const report = reports.find(r => r.id === reportId);
      const { error } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          reviewed_by_admin_id: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
      
      // Log admin action
      await logAdminAction({
        actionType: newStatus === 'resolved' ? 'approve' : 'reject',
        actionCategory: 'report',
        targetUserId: report?.reported_user_id,
        targetContentId: reportId,
        targetContentType: 'report',
        description: `საჩივარი ${STATUS_LABELS[newStatus]}: ${report?.reason_text?.substring(0, 50) || ''}`,
      });

      toast({ title: `საჩივარი ${STATUS_LABELS[newStatus] || newStatus}` });
      fetchReports();
      onCountChange?.();
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const openDeleteReportDialog = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteReportId(reportId);
    setDeleteReportDialogOpen(true);
  };

  const confirmDeleteReport = async () => {
    if (!user || !deleteReportId) return;
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', deleteReportId);

      if (error) throw error;
      toast({ title: 'საჩივარი წაიშალა' });
      setReports(prev => prev.filter(r => r.id !== deleteReportId));
      onCountChange?.();
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
    setDeleteReportId(null);
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const REASON_TYPE_LABELS: Record<string, string> = {
    spam: 'სპამი',
    harassment: 'შეურაცხყოფა',
    inappropriate: 'შეუფერებელი',
    fraud: 'თაღლითობა',
    violence: 'ძალადობა',
    other: 'სხვა',
  };

  const CONTENT_TYPE_LABELS: Record<string, string> = {
    private_message: 'პირადი შეტყობინება',
    group_message: 'ჯგუფური შეტყობინება',
    post: 'პოსტი',
    photo: 'ფოტო',
    video: 'ვიდეო',
    story: 'სთორი',
    comment: 'კომენტარი',
    reel: 'რილსი',
    profile: 'პროფილი',
    live_comment: 'ლაივის კომენტარი',
  };

  const fetchReports = useCallback(async () => {
    if (!isSuperAdmin) return;
    setReportsLoading(true);
    try {
      // Fetch new + recently reviewed reports (last 24h reviewed ones)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) {
        setReportsLoading(false);
        return;
      }

      // Separate: new reports first, then recently reviewed
      const newReports = data.filter(r => r.status === 'new');
      const reviewedRecent = data.filter(r => r.status !== 'new' && r.reviewed_at && 
        (Date.now() - new Date(r.reviewed_at).getTime()) < 24 * 60 * 60 * 1000
      );
      const combinedReports = [...newReports, ...reviewedRecent];

      const userIds = [...new Set(combinedReports.flatMap(r => [r.reporter_user_id, r.reported_user_id, r.reviewed_by_admin_id].filter(Boolean)))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      const enriched = combinedReports.map(r => ({
        ...r,
        reporter: profileMap.get(r.reporter_user_id),
        reported: profileMap.get(r.reported_user_id),
        reviewer: r.reviewed_by_admin_id ? profileMap.get(r.reviewed_by_admin_id) : null,
      }));

      if (isMounted.current) setReports(enriched);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      if (isMounted.current) setReportsLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    isMounted.current = true;
    
    if (!user) return;

    // Only fetch if no initial data
    if (!initialNotifications || initialNotifications.length === 0) {
      fetchNotifications();
    } else {
      setIsLoading(false);
    }

    // Fetch reports for super admins
    if (isSuperAdmin) {
      fetchReports();
    }

    // Subscribe to all notification events
    const channel = supabase
      .channel(`notifications-fullpage-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          if (!isMounted.current) return;
          lastFetchTime.current = 0; // Reset debounce
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          lastFetchTime.current = 0;
          fetchNotifications();
        }
      });

    // Subscribe to reports for super admins
    let reportsChannel: any = null;
    if (isSuperAdmin) {
      reportsChannel = supabase
        .channel(`reports-fullpage-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports'
          },
          () => {
            if (isMounted.current) fetchReports();
          }
        )
        .subscribe();
    }

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      if (reportsChannel) supabase.removeChannel(reportsChannel);
    };
  }, [user, isSuperAdmin, fetchReports]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    const now = Date.now();
    if (now - lastFetchTime.current < 500) return;
    lastFetchTime.current = now;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !isMounted.current) {
        if (isMounted.current) setIsLoading(false);
        return;
      }

      const fromUserIds = [...new Set(data?.map(n => n.from_user_id) || [])];
      
      let profileMap = new Map<string, any>();
      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', fromUserIds);

        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      // Fetch post previews for like/reaction notifications
      const postIds = [...new Set(data?.filter(n => n.post_id && ['like', 'post_reaction', 'comment', 'reel_like', 'reel_comment'].includes(n.type)).map(n => n.post_id!) || [])];
      let postMap = new Map<string, string>();
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content')
          .in('id', postIds);
        postMap = new Map(posts?.map(p => [p.id, p.content?.replace(/\[group:[^\]]*\]\n?/g, '').substring(0, 60) || '']) || []);
      }

      if (!isMounted.current) return;

      const notificationsWithUsers: Notification[] = data?.map(n => ({
        ...n,
        type: n.type as NotificationType,
        from_user: profileMap.get(n.from_user_id),
        post_preview: n.post_id ? postMap.get(n.post_id) || null : null,
      })) || [];

      setNotifications(notificationsWithUsers);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (isMounted.current) setIsLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.is_read) return; // Already read
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    
    // Notify parent to update count
    onCountChange?.();
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      setNotifications([]);
      toast({ title: 'ნოტიფიკაციები წაიშალა' });
      
      // Notify parent to update count
      onCountChange?.();
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: 'ყველა წაკითხულადაა მონიშნული' });
      
      // Notify parent to update count
      onCountChange?.();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleAcceptFriend = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      // The friend request was sent by fromUserId to me (current user)
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('requester_id', fromUserId)
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error accepting friend request:', error);
        toast({ title: 'შეცდომა', variant: 'destructive' });
        return;
      }

      await supabase.from('notifications').insert({
        user_id: fromUserId,
        from_user_id: user.id,
        type: 'friend_accept'
      });

      await markAsRead(notificationId);
      toast({ title: 'მეგობრობა დადასტურდა!' });
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting friend:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleRejectFriend = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      // Delete the pending request (fromUserId sent to me)
      await supabase
        .from('friendships')
        .delete()
        .eq('requester_id', fromUserId)
        .eq('addressee_id', user.id);

      await supabase.from('notifications').delete().eq('id', notificationId);
      toast({ title: 'მოთხოვნა უარყოფილია' });
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting friend:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Group invite handlers removed - groups module deleted

  const handleAcceptRelationship = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const { data: request, error: fetchError } = await supabase
        .from('relationship_requests')
        .select('id')
        .eq('sender_id', fromUserId)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!request) {
        toast({ title: 'შეთავაზება ვერ მოიძებნა', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.rpc('accept_relationship_request', {
        request_id: request.id
      });

      if (error) throw error;

      await markAsRead(notificationId);
      toast({ title: 'ურთიერთობა დადასტურდა! 💕' });
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting relationship:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleRejectRelationship = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const { data: request, error: fetchError } = await supabase
        .from('relationship_requests')
        .select('id')
        .eq('sender_id', fromUserId)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!request) {
        toast({ title: 'შეთავაზება ვერ მოიძებნა', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.rpc('reject_relationship_request', {
        request_id: request.id
      });

      if (error) throw error;

      await supabase.from('notifications').delete().eq('id', notificationId);
      toast({ title: 'შეთავაზება უარყოფილია' });
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting relationship:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Handle accepting game friend request
  const handleAcceptGameFriend = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const { data: request } = await supabase
        .from('game_friends')
        .select('id')
        .eq('requester_id', fromUserId)
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!request) {
        toast({ title: 'მოთხოვნა ვერ მოიძებნა', variant: 'destructive' });
        return;
      }

      await supabase
        .from('game_friends')
        .update({ status: 'active', accepted_at: new Date().toISOString() })
        .eq('id', request.id);

      await supabase.from('notifications').insert({
        user_id: fromUserId,
        from_user_id: user.id,
        type: 'game_friend_accepted',
        content: 'დაეთანხმა თამაშის მეგობრობას'
      });

      await markAsRead(notificationId);
      toast({ title: '🎮 თამაშის მეგობრობა დადასტურდა!' });
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting game friend:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleRejectGameFriend = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await supabase
        .from('game_friends')
        .update({ status: 'declined' })
        .eq('requester_id', fromUserId)
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      await supabase.from('notifications').insert({
        user_id: fromUserId,
        from_user_id: user.id,
        type: 'game_friend_declined',
        content: 'უარყო თამაშის მეგობრობა'
      });

      await supabase.from('notifications').delete().eq('id', notificationId);
      toast({ title: 'მოთხოვნა უარყოფილია' });
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting game friend:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleAcceptGameInvite = async (notificationId: string, notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const roomId = notification.related_id;
      if (!roomId) {
        toast({ title: 'ოთახი ვერ მოიძებნა', variant: 'destructive' });
        return;
      }

      const { data: invite } = await supabase
        .from('game_invites')
        .select('*')
        .eq('room_id', roomId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!invite) {
        toast({ title: 'მოწვევა ვერ მოიძებნა ან ვადა გავიდა', variant: 'destructive' });
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        await supabase.from('game_invites').update({ status: 'expired' }).eq('id', invite.id);
        toast({ title: 'მოწვევის ვადა გავიდა', variant: 'destructive' });
        return;
      }

      await supabase.from('game_invites').update({ status: 'accepted' }).eq('id', invite.id);

      await supabase.from('notifications').insert({
        user_id: notification.from_user_id,
        from_user_id: user.id,
        type: 'game_invite_accepted',
        content: `დათანხმდა ${GAME_NAMES[invite.game_type] || invite.game_type} თამაშის მოწვევას`
      });

      await markAsRead(notificationId);
      toast({ title: '🎲 მოწვევა მიღებულია!' });
      
      if (onGameInviteAccepted) {
        onGameInviteAccepted(roomId, invite.game_type);
      }
      
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting game invite:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleRejectGameInvite = async (notificationId: string, notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const roomId = notification.related_id;
      
      if (roomId) {
        const { data: invite } = await supabase
          .from('game_invites')
          .select('game_type')
          .eq('room_id', roomId)
          .eq('to_user_id', user.id)
          .maybeSingle();

        await supabase
          .from('game_invites')
          .update({ status: 'declined' })
          .eq('room_id', roomId)
          .eq('to_user_id', user.id);

        await supabase.from('notifications').insert({
          user_id: notification.from_user_id,
          from_user_id: user.id,
          type: 'game_invite_declined',
          content: `უარყო ${GAME_NAMES[invite?.game_type || ''] || ''} თამაშის მოწვევა`
        });
      }

      await supabase.from('notifications').delete().eq('id', notificationId);
      toast({ title: 'მოწვევა უარყოფილია' });
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting game invite:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-green-500 fill-green-500" />;
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'friend_accept':
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'message':
        return <Mail className="w-5 h-5 text-primary" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-purple-500" />;
      case 'group_chat_reply':
        return <MessageCircle className="w-5 h-5 text-orange-500 fill-orange-500" />;
      case 'group_chat_reaction':
      case 'reaction':
      case 'post_reaction':
        return <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />;
      case 'group_chat_mention':
        return <MessageCircle className="w-5 h-5 text-cyan-500 fill-cyan-500" />;
      case 'private_group_message':
        return <Mail className="w-5 h-5 text-amber-500" />;
      case 'content_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'content_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'ignore':
        return <Ban className="w-5 h-5 text-red-500" />;
      case 'live_started':
        return <Radio className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'story_expired':
        return <Eye className="w-5 h-5 text-purple-500" />;
      case 'relationship_proposal':
        return <HeartHandshake className="w-5 h-5 text-pink-500" />;
      case 'relationship_accepted':
      case 'relationship_ended':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'relationship_rejected':
        return <X className="w-5 h-5 text-red-500" />;
      case 'reel_like':
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'reel_comment':
        return <MessageCircle className="w-5 h-5 text-blue-500 fill-blue-500" />;
      case 'story_comment':
        return <MessageCircle className="w-5 h-5 text-purple-500 fill-purple-500" />;
      case 'story_reaction':
        return <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />;
      case 'group_join_request':
        return <UserPlus className="w-5 h-5 text-amber-500" />;
      case 'friend_post':
        return <MessageCircle className="w-5 h-5 text-primary fill-primary" />;
      case 'friend_photo':
        return <Camera className="w-5 h-5 text-green-500" />;
      case 'friend_video':
        return <Radio className="w-5 h-5 text-purple-500" />;
      case 'friend_story':
        return <Eye className="w-5 h-5 text-pink-500" />;
      case 'friend_reel':
        return <Radio className="w-5 h-5 text-orange-500" />;
      case 'friend_avatar_change':
        return <Camera className="w-5 h-5 text-blue-500" />;
      case 'friend_cover_change':
        return <Camera className="w-5 h-5 text-purple-500" />;
      case 'friend_poll':
        return <BarChart3 className="w-5 h-5 text-cyan-500" />;
      case 'friend_quiz':
        return <Star className="w-5 h-5 text-amber-500" />;
      case 'dating_match':
        return <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />;
      case 'dating_like':
        return <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />;
      case 'dating_super_like':
        return <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
      case 'dating_message':
        return <MessageCircle className="w-5 h-5 text-pink-500 fill-pink-500" />;
      case 'game_friend_request':
      case 'game_friend_accepted':
      case 'game_friend_declined':
        return <Gamepad2 className="w-5 h-5 text-emerald-500" />;
      case 'game_invite':
      case 'game_invite_accepted':
      case 'game_invite_declined':
        return <Gamepad2 className="w-5 h-5 text-blue-500" />;
      case 'gift_received':
        return <Gift className="w-5 h-5 text-pink-500" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const parseGroupChatMessage = (msg: string | null | undefined): { messageId: string; content: string } | null => {
    if (!msg || !msg.includes('|')) return null;
    const [messageId, ...contentParts] = msg.split('|');
    return { messageId, content: contentParts.join('|') };
  };

  // Extract GIF URLs from message content like [GIF:url]
  const extractGifsFromContent = (content: string): { text: string; gifs: string[] } => {
    const gifRegex = /\[GIF:(https?:\/\/[^\]]+)\]/g;
    const gifs: string[] = [];
    let match;
    while ((match = gifRegex.exec(content)) !== null) {
      gifs.push(match[1]);
    }
    const text = content.replace(gifRegex, '').trim();
    return { text, gifs };
  };

  const getNotificationText = (notification: Notification) => {
    const username = notification.from_user?.username || 'მომხმარებელი';
    
    switch (notification.type) {
      case 'like':
        return { username, text: 'მოიწონა თქვენი პოსტი', content: notification.post_preview || undefined, isReply: false };
      case 'comment':
        return { username, text: 'დააკომენტარა თქვენი პოსტი', content: notification.message || notification.post_preview || undefined, isReply: false };
      case 'reel_like':
        return { username, text: 'მოიწონა თქვენი Reel', content: notification.post_preview || undefined, isReply: false };
      case 'reel_comment':
        return { username, text: 'დააკომენტარა თქვენი Reel', content: notification.message, isReply: false };
      case 'friend_request':
        return { username, text: 'გთხოვთ მეგობრობას', isReply: false };
      case 'friend_accept':
        return { username, text: 'მიიღო თქვენი მეგობრობის მოთხოვნა', isReply: false };
      case 'message':
        return { username, text: 'გამოგიგზავნათ შეტყობინება', isReply: false };
      case 'follow':
        return { username, text: 'started following you', isReply: false };
      case 'group_chat_reply': {
        const parsed = parseGroupChatMessage(notification.message);
        const rawContent = parsed?.content || '';
        const { text: cleanText, gifs } = extractGifsFromContent(rawContent);
        const roomName = notification.content || 'ჯგუფურ ჩატში';
        return { username, text: `(${roomName})`, content: cleanText, gifs, isReply: true };
      }
      case 'group_chat_reaction': {
        const parts = notification.message?.split('|') || [];
        let reactionEmoji = '👍';
        let rawContent = '';
        
        if (parts.length >= 3) {
          reactionEmoji = getReactionEmoji(parts[1]);
          rawContent = parts.slice(2).join('|');
        } else if (parts.length === 2) {
          reactionEmoji = getReactionEmoji(parts[0]);
          rawContent = parts[1];
        }
        
        const { text: cleanText, gifs } = extractGifsFromContent(rawContent);
        const roomName = notification.content || 'ჯგუფურ ჩატში';
        return { username, text: `${reactionEmoji} მოახდინა რეაგირება (${roomName})`, content: cleanText, gifs, isReply: false };
      }
      case 'group_chat_mention': {
        const parsed = parseGroupChatMessage(notification.message);
        const rawContent = parsed?.content || '';
        const { text: cleanText, gifs } = extractGifsFromContent(rawContent);
        const roomName = notification.content || 'ჯგუფურ ჩატში';
        return { username, text: `მოგნიშნათ (${roomName})`, content: cleanText, gifs, isReply: false };
      }
      case 'private_group_message': {
        const parsed = parseGroupChatMessage(notification.message);
        const rawContent = parsed?.content || '';
        const { text: cleanText, gifs } = extractGifsFromContent(rawContent);
        const roomName = notification.content || 'ჯგუფურ ჩატში';
        return { username, text: `პირადი შეტყობინება (${roomName})`, content: cleanText, gifs, isReply: false };
      }
      case 'story_comment':
        return { username, text: 'დააკომენტარა თქვენი სთორი', content: notification.content, isReply: false };
      case 'story_reaction':
        return { username, text: `მოახდინა რეაგირება თქვენს სთორიზე ${notification.message || ''}`, isReply: false };
      case 'content_approved':
        return { username, text: 'თქვენი კონტენტი დამტკიცებულია ✅', isReply: false };
      case 'content_rejected':
        return { username, text: 'თქვენი კონტენტი უარყოფილია', content: notification.content, isReply: false };
      case 'story_expired':
        return { username, text: 'თქვენი სთორის ვადა ამოიწურა', isReply: false };
      case 'relationship_proposal':
        return { username, text: 'გთავაზობთ ურთიერთობას 💕', isReply: false };
      case 'relationship_accepted':
        return { username, text: 'ურთიერთობა დადასტურდა! 💕', isReply: false };
      case 'relationship_rejected':
        return { username, text: 'უარყო ურთიერთობის შეთავაზება', isReply: false };
      case 'relationship_ended':
        return { username, text: 'ურთიერთობა დასრულდა', isReply: false };
      case 'group_join_request':
        return { username, text: 'ითხოვს ჯგუფში გაწევრიანებას', isReply: false };
      case 'friend_post':
        return { username, text: 'გააზიარა ახალი პოსტი', isReply: false };
      case 'friend_photo':
        return { username, text: 'დაამატა ახალი ფოტო', isReply: false };
      case 'friend_video':
        return { username, text: 'დაამატა ახალი ვიდეო', isReply: false };
      case 'friend_story':
        return { username, text: 'დაამატა ახალი სთორი', isReply: false };
      case 'friend_reel':
        return { username, text: 'დაამატა ახალი Reel', isReply: false };
      case 'friend_poll':
        return { username, text: 'შექმნა ახალი გამოკითხვა', isReply: false };
      case 'friend_quiz':
        return { username, text: 'შექმნა ახალი ქვიზი', isReply: false };
      case 'group_invite':
        return { username, text: notification.content || 'გიწვევს ჯგუფში', isReply: false };
      case 'dating_match':
        return { username, text: '🎉 ახალი მატჩი გაცნობაში!', isReply: false };
      case 'dating_like':
        return { username, text: '💕 მოგეწონეთ გაცნობაში', isReply: false };
      case 'dating_super_like':
        return { username, text: '⭐ მოგცათ სუპერ ლაიქი!', isReply: false };
      case 'dating_message':
        return { username, text: '💬 შეტყობინება გაცნობაში', isReply: false };
      case 'game_friend_request':
        return { username, text: `🎮 ${notification.content || 'გიგზავნის თამაშის მეგობრობის მოთხოვნას'}`, isReply: false };
      case 'game_friend_accepted':
        return { username, text: `🎮 ${notification.content || 'დაგთანხმდა თამაშის მეგობრობაზე!'}`, isReply: false };
      case 'game_friend_declined':
        return { username, text: `🎮 ${notification.content || 'უარყო თამაშის მეგობრობა'}`, isReply: false };
      case 'game_invite':
        return { username, text: `🎲 ${notification.content || 'გიწვევს თამაშზე'}`, isReply: false };
      case 'game_invite_accepted':
        return { username, text: `🎲 ${notification.content || 'დათანხმდა თამაშის მოწვევას!'}`, isReply: false };
      case 'game_invite_declined':
        return { username, text: `🎲 ${notification.content || 'უარყო თამაშის მოწვევა'}`, isReply: false };
      case 'gift_received':
        return { username, text: notification.message || 'გამოგიგზავნათ საჩუქარი 🎁', isReply: false };
      case 'reaction':
      case 'post_reaction': {
        const reactionType = notification.message || notification.content || '';
        const emoji = getReactionEmoji(reactionType);
        return { username, text: `${emoji} მოახდინა რეაგირება თქვენს პოსტზე`, content: notification.post_preview || undefined, isReply: false };
      }
      default:
        return { username, text: notification.message || 'ახალი შეტყობინება', isReply: false };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ახლახანს';
    if (diffMins < 60) return `${diffMins} წთ`;
    if (diffHours < 24) return `${diffHours} სთ`;
    return `${diffDays} დღე`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if ((notification.type === 'like' || notification.type === 'comment' || notification.type === 'post_reaction' || notification.type === 'reaction') && notification.post_id) {
      if (onPostClick) onPostClick(notification.post_id);
      return;
    }
    
    if ((notification.type === 'reel_like' || notification.type === 'reel_comment' || notification.type === 'friend_reel') && notification.post_id) {
      if (onReelClick) onReelClick(notification.post_id);
      return;
    }
    
    if (notification.type === 'friend_post' && notification.post_id) {
      if (onPostClick) onPostClick(notification.post_id);
      return;
    }
    
    if (notification.type === 'friend_photo' && notification.post_id) {
      if (onPostClick) onPostClick(notification.post_id);
      return;
    }
    
    if (notification.type === 'friend_video' && notification.post_id) {
      if (onVideoClick) onVideoClick(notification.post_id);
      else if (onPostClick) onPostClick(notification.post_id);
      return;
    }
    
    if (notification.type === 'friend_story' && notification.from_user_id) {
      if (onStoryClick) onStoryClick(notification.from_user_id);
      return;
    }
    
    if (notification.type === 'friend_poll' && notification.post_id) {
      if (onPollClick) onPollClick(notification.post_id);
      return;
    }
    
    if (notification.type === 'friend_quiz' && notification.post_id) {
      if (onQuizClick) onQuizClick(notification.post_id);
      return;
    }
    
    if (notification.type === 'friend_avatar_change' || notification.type === 'friend_cover_change') {
      if (onUserClick && notification.from_user_id) onUserClick(notification.from_user_id);
      return;
    }
    
    if ((notification.type === 'group_chat_reply' || notification.type === 'group_chat_reaction' || notification.type === 'group_chat_mention' || notification.type === 'private_group_message') && notification.message) {
      if (onGroupChatNavigate) {
        const messageId = notification.message.split('|')[0];
        const username = notification.from_user?.username;
        const roomType = notification.related_type || 'gossip';
        onGroupChatNavigate(messageId, username, roomType);
      }
      return;
    }
    
    if (notification.type === 'story_expired') {
      if (onCreateStory) onCreateStory();
      return;
    }
    
    // Story reaction - navigate to story
    if (notification.type === 'story_reaction' || notification.type === 'story_comment') {
      if (onStoryClick && notification.from_user_id) onStoryClick(notification.from_user_id);
      return;
    }
    
    if (notification.type === 'relationship_proposal' || notification.type === 'relationship_accepted' ||
        notification.type === 'relationship_rejected' || notification.type === 'relationship_ended') {
      if (onUserClick && notification.from_user_id) onUserClick(notification.from_user_id);
      return;
    }
    
    if (notification.type === 'dating_match' || notification.type === 'dating_message') {
      if (onDatingClick) onDatingClick('matches');
      return;
    }
    
    if (notification.type === 'dating_like' || notification.type === 'dating_super_like') {
      if (onDatingClick) onDatingClick('likes');
      return;
    }
    
    // Gift received - navigate to own profile (where gifts drawer is)
    if (notification.type === 'gift_received') {
      if (onUserClick && user?.id) onUserClick(user.id);
      return;
    }
    
    if (onUserClick && notification.from_user_id) {
      onUserClick(notification.from_user_id);
    }
  };

  // Separate new (unread) and earlier (read) notifications
  const newNotifications = notifications.filter(n => !n.is_read);
  const earlierNotifications = notifications.filter(n => n.is_read);

  const renderNotificationItem = (notification: Notification) => {
    const result = getNotificationText(notification) as { 
      username: string; 
      text: string; 
      content?: string;
      gifs?: string[];
      isReply?: boolean;
    };
    const { username, text, content, gifs, isReply } = result;
    
    return (
      <div
        key={notification.id}
        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors relative ${
          !notification.is_read 
            ? 'bg-primary/10 border-l-4 border-l-primary' 
            : 'bg-transparent'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        {/* Unread indicator dot */}
        {!notification.is_read && (
          <div className="absolute top-3 right-3 w-3 h-3 bg-primary rounded-full animate-pulse" />
        )}
        
        <div className="relative flex-shrink-0">
          <Avatar className="w-14 h-14">
            <AvatarImage src={notification.from_user?.avatar_url || ''} />
            <AvatarFallback className="text-lg">
              {notification.from_user?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-1 border-2 border-card">
            {getNotificationIcon(notification.type)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-bold">{username}</span>
            <span className="text-foreground"> {text}</span>
          </p>
          
          {/* Show reply label for group_chat_reply */}
          {isReply && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-500 rounded-full">
              პასუხი
            </span>
          )}
          
          {/* Show message content */}
          {content && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              „{content}"
            </p>
          )}
          
          {/* Show GIF images */}
          {gifs && gifs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {gifs.slice(0, 2).map((gifUrl, index) => (
                <img 
                  key={index}
                  src={gifUrl} 
                  alt="GIF" 
                  className="max-w-[80px] max-h-[60px] rounded-lg object-cover"
                  loading="lazy"
                />
              ))}
              {gifs.length > 2 && (
                <span className="text-xs text-muted-foreground self-end">+{gifs.length - 2}</span>
              )}
            </div>
          )}
          
          <span className="text-xs text-muted-foreground block mt-1">
            {getTimeAgo(notification.created_at)}
          </span>
          
          {/* Action buttons for specific notification types */}
          {notification.type === 'friend_request' && !notification.is_read && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="h-8 flex-1 bg-primary hover:bg-primary/90 text-xs"
                onClick={(e) => handleAcceptFriend(notification.id, notification.from_user_id, e)}
              >
                <Check className="w-4 h-4 mr-1" />
                დადასტურება
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 flex-1 text-xs"
                onClick={(e) => handleRejectFriend(notification.id, notification.from_user_id, e)}
              >
                <X className="w-4 h-4 mr-1" />
                წაშლა
              </Button>
            </div>
          )}
          
          {/* Group invite handlers removed - groups module deleted */}
          
          {notification.type === 'relationship_proposal' && !notification.is_read && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="h-8 flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs"
                onClick={(e) => handleAcceptRelationship(notification.id, notification.from_user_id, e)}
              >
                <Heart className="w-4 h-4 mr-1" />
                თანხმობა
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 flex-1 text-xs"
                onClick={(e) => handleRejectRelationship(notification.id, notification.from_user_id, e)}
              >
                <X className="w-4 h-4 mr-1" />
                უარი
              </Button>
            </div>
          )}
          
          {notification.type === 'story_expired' && (
            <Button
              size="sm"
              className="h-8 mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs"
              onClick={(e) => {
                e.stopPropagation();
                if (onCreateStory) onCreateStory();
              }}
            >
              <Camera className="w-4 h-4 mr-1" />
              ახალი სთორი
            </Button>
          )}
          
          {notification.type === 'game_friend_request' && !notification.is_read && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="h-8 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                onClick={(e) => handleAcceptGameFriend(notification.id, notification.from_user_id, e)}
              >
                <Check className="w-4 h-4 mr-1" />
                დავთანხმდე
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 flex-1 text-xs"
                onClick={(e) => handleRejectGameFriend(notification.id, notification.from_user_id, e)}
              >
                <X className="w-4 h-4 mr-1" />
                უარყოფა
              </Button>
            </div>
          )}
          
          {notification.type === 'game_invite' && !notification.is_read && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="h-8 flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                onClick={(e) => handleAcceptGameInvite(notification.id, notification, e)}
              >
                <Check className="w-4 h-4 mr-1" />
                შევიდე თამაშში
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 flex-1 text-xs"
                onClick={(e) => handleRejectGameInvite(notification.id, notification, e)}
              >
                <X className="w-4 h-4 mr-1" />
                უარყოფა
              </Button>
            </div>
          )}
        </div>
        
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-background z-[60] flex flex-col" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div 
        className="flex-none flex items-center justify-between px-4 py-3 border-b border-border bg-card"
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
          )}
          <h1 className="text-xl font-bold">ცნობები</h1>
        </div>
        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <>
              <button 
                onClick={markAllAsRead}
                className="p-2 hover:bg-secondary rounded-full"
                title="ყველა წაკითხულად"
              >
                <Check className="w-5 h-5 text-foreground" />
              </button>
              <button 
                onClick={() => setClearAllDialogOpen(true)}
                className="p-2 hover:bg-secondary rounded-full"
                title="გასუფთავება"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={{ paddingBottom: '24px' }}>
          {/* Reports section for super admins */}
          {isSuperAdmin && reports.length > 0 && (
            <div>
              <h2 className="px-4 py-2 text-sm font-semibold text-destructive bg-destructive/10 flex items-center gap-2">
                <Flag className="w-4 h-4" />
                საჩივრები
                <Badge variant="destructive" className="ml-auto text-[10px] h-5">
                  {reports.filter(r => r.status === 'new').length} ახალი
                </Badge>
              </h2>
              {reports.map((report) => {
                const isReviewed = report.status !== 'new';
                return (
                  <div
                    key={report.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors ${
                      isReviewed 
                        ? 'bg-muted/30 opacity-70' 
                        : 'bg-destructive/5 hover:bg-destructive/10'
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Reporter (who filed) */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>მომჩივანი:</span>
                        <button
                          className="font-semibold text-foreground hover:text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick?.(report.reporter_user_id);
                            onBack?.();
                          }}
                        >
                          {report.reporter?.username || 'უცნობი'}
                        </button>
                      </div>
                      {/* Reported (violator) */}
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        <span className="text-destructive font-medium">დამრღვევი:</span>
                        <button
                          className="font-bold text-destructive hover:text-destructive/80 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick?.(report.reported_user_id);
                            onBack?.();
                          }}
                        >
                          {report.reported?.username || 'უცნობი'}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {CONTENT_TYPE_LABELS[report.content_type] || report.content_type}
                        </Badge>
                        {report.reason_type && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {REASON_TYPE_LABELS[report.reason_type] || report.reason_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {report.reason_text}
                      </p>
                      
                      {/* Reviewed status indicator */}
                      {isReviewed && report.reviewer && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 w-fit">
                          <Check className="w-3 h-3" />
                          <span>განიხილა: <strong>{report.reviewer.username}</strong></span>
                          <span>• {STATUS_LABELS[report.status] || report.status}</span>
                        </div>
                      )}
                      {isReviewed && !report.reviewer && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 w-fit">
                          <Check className="w-3 h-3" />
                          <span>უკვე განხილულია • {STATUS_LABELS[report.status] || report.status}</span>
                        </div>
                      )}
                      
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {format(new Date(report.created_at), 'dd MMM, HH:mm', { locale: ka })}
                      </p>
                      
                      {/* Action buttons - only for new/unreviewed reports */}
                      {!isReviewed && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-6 text-[10px] px-2"
                            onClick={(e) => handleReportAction(report.id, 'resolved', e)}
                          >
                            <Check className="w-3 h-3 mr-0.5" />
                            დასრულება
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 text-[10px] px-2"
                            onClick={(e) => handleReportAction(report.id, 'dismissed', e)}
                          >
                            <X className="w-3 h-3 mr-0.5" />
                            უარყოფა
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                            onClick={(e) => openDeleteReportDialog(report.id, e)}
                          >
                            <Trash2 className="w-3 h-3 mr-0.5" />
                            წაშლა
                          </Button>
                        </div>
                      )}
                      {/* Delete button for reviewed reports too */}
                      {isReviewed && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-destructive"
                            onClick={(e) => openDeleteReportDialog(report.id, e)}
                          >
                            <Trash2 className="w-3 h-3 mr-0.5" />
                            წაშლა
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isLoading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-sm">იტვირთება...</p>
            </div>
          ) : notifications.length === 0 && reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">შეტყობინებები არ არის</p>
            </div>
          ) : notifications.length > 0 ? (
            <>
              {/* New notifications */}
              {newNotifications.length > 0 && (
                <div>
                  <h2 className="px-4 py-2 text-sm font-semibold text-foreground bg-secondary/30">
                    ახალი
                  </h2>
                  {newNotifications.map(renderNotificationItem)}
                </div>
              )}
              
              {/* Earlier notifications */}
              {earlierNotifications.length > 0 && (
                <div>
                  <h2 className="px-4 py-2 text-sm font-semibold text-foreground bg-secondary/30">
                    უფრო ადრინდელი
                  </h2>
                  {earlierNotifications.map(renderNotificationItem)}
                </div>
              )}
            </>
          ) : null}
        </div>
      </ScrollArea>

      <DeleteConfirmDialog
        open={deleteReportDialogOpen}
        onOpenChange={setDeleteReportDialogOpen}
        onConfirm={confirmDeleteReport}
        title="საჩივრის წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ამ საჩივრის წაშლა? ეს ქმედება ვერ გაუქმდება."
        confirmText="წაშლა"
        cancelText="გაუქმება"
      />

      <DeleteConfirmDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        onConfirm={clearAllNotifications}
        title="ნოტიფიკაციების წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ყველა ნოტიფიკაციის წაშლა? ეს ქმედება ვერ გაუქმდება."
        confirmText="წაშლა"
        cancelText="გაუქმება"
      />
    </div>,
    document.body
  );
});

NotificationsFullPage.displayName = 'NotificationsFullPage';

export default NotificationsFullPage;
