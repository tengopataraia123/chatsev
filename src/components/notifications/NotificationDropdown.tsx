import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Mail, Check, X, Volume2, VolumeX, CheckCircle, XCircle, Radio, Camera, Eye, Trash2, HeartHandshake, BarChart3, Star, Gamepad2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';
import { getReactionEmoji } from '@/components/reactions/ReactionPicker';
// Game invites removed
const GAME_NAMES: Record<string, string> = {};

type NotificationType = 'like' | 'comment' | 'friend_request' | 'friend_accept' | 'message' | 'follow' | 'group_chat_reply' | 'group_chat_reaction' | 'group_chat_mention' | 'private_group_message' | 'content_approved' | 'content_rejected' | 'ignore' | 'reaction' | 'post_reaction' | 'live_started' | 'story_expired' | 'story_comment' | 'story_reaction' | 'relationship_proposal' | 'relationship_accepted' | 'relationship_rejected' | 'relationship_ended' | 'reel_like' | 'reel_comment' | 'friend_post' | 'friend_photo' | 'friend_video' | 'friend_story' | 'friend_reel' | 'friend_avatar_change' | 'friend_cover_change' | 'friend_poll' | 'friend_quiz' | 'group_invite' | 'group_join_request' | 'group_post' | 'group_member_joined' | 'group_invite_accepted' | 'group_request_approved' | 'dating_match' | 'dating_like' | 'dating_super_like' | 'dating_message' | 'game_friend_request' | 'game_friend_accepted' | 'game_friend_declined' | 'game_invite' | 'game_invite_accepted' | 'game_invite_declined';

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
}

interface NotificationDropdownProps {
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
  onGameInviteAccepted?: (roomId: string, gameType: string) => void;
}

const NotificationDropdown = memo(({ onUserClick, onGroupChatNavigate, onCreateStory, onReelClick, onPostClick, onStoryClick, onPollClick, onQuizClick, onVideoClick, onDatingClick, onGameInviteAccepted }: NotificationDropdownProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { permission, isSupported, requestPermission, sendNotification } = usePushNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);

  // Get notification text for push notification
  const getNotificationTextForPush = useCallback((type: NotificationType, username: string): string => {
    switch (type) {
      case 'like':
        return `${username} მოიწონა თქვენი პოსტი`;
      case 'comment':
        return `${username} დააკომენტარა თქვენი პოსტი`;
      case 'reel_like':
        return `${username} მოიწონა თქვენი Reel`;
      case 'reel_comment':
        return `${username} დააკომენტარა თქვენი Reel`;
      case 'friend_request':
        return `${username} გთხოვთ მეგობრობას`;
      case 'friend_accept':
        return `${username} მიიღო თქვენი მეგობრობის მოთხოვნა`;
      case 'message':
        return `${username} გამოგიგზავნათ შეტყობინება`;
      case 'follow':
        return `${username} started following you`;
      case 'group_chat_reply':
        return `${username} გიპასუხათ ჯგუფურ ჩატში`;
      case 'group_chat_reaction':
        return `${username} მოახდინა რეაგირება თქვენს შეტყობინებაზე`;
      case 'group_chat_mention':
        return `${username} მოგნიშნათ ჯგუფურ ჩატში`;
      case 'private_group_message':
        return `${username} გამოგიგზავნათ პირადი შეტყობინება`;
      case 'content_approved':
        return 'თქვენი კონტენტი დადასტურდა!';
      case 'content_rejected':
        return 'თქვენი კონტენტი უარყოფილია';
      case 'ignore':
        return `${username} დაგაიგნორათ`;
      case 'live_started':
        return `${username} არის ლაივში`;
      case 'story_expired':
        return 'თქვენს სთორის ვადა ამოიწურა';
      case 'story_comment':
        return `${username} დააკომენტარა თქვენი სთორი`;
      case 'story_reaction':
        return `${username} მოახდინა რეაგირება თქვენს სთორიზე`;
      case 'relationship_proposal':
        return `${username} გთავაზობთ ურთიერთობას`;
      case 'relationship_accepted':
        return 'ურთიერთობა დადასტურდა';
      case 'relationship_rejected':
        return 'ურთიერთობის შეთავაზება უარყოფილია';
      case 'relationship_ended':
        return 'ურთიერთობა დასრულდა';
      case 'friend_post':
        return `თქვენმა მეგობარმა ${username} დაამატა ახალი პოსტი`;
      case 'friend_photo':
        return `თქვენმა მეგობარმა ${username} დაამატა ახალი ფოტო`;
      case 'friend_video':
        return `თქვენმა მეგობარმა ${username} დაამატა ახალი ვიდეო`;
      case 'friend_story':
        return `თქვენმა მეგობარმა ${username} დაამატა ახალი სთორი`;
      case 'friend_reel':
        return `თქვენმა მეგობარმა ${username} დაამატა ახალი Reel`;
      case 'friend_avatar_change':
        return `თქვენმა მეგობარმა ${username} შეცვალა პროფილის ფოტო`;
      case 'friend_cover_change':
        return `თქვენმა მეგობარმა ${username} შეცვალა ფონის სურათი`;
      case 'friend_poll':
        return `თქვენმა მეგობარმა ${username} შექმნა ახალი გამოკითხვა`;
      case 'friend_quiz':
        return `თქვენმა მეგობარმა ${username} შექმნა ახალი ქვიზი`;
      case 'group_invite':
        return `${username} გიწვევს ჯგუფში`;
      case 'group_join_request':
        return `${username} ითხოვს გაწევრიანებას თქვენს ჯგუფში`;
      case 'group_post':
        return `${username} დაამატა პოსტი თქვენს ჯგუფში`;
      case 'group_member_joined':
        return `${username} შეუერთდა თქვენს ჯგუფს`;
      case 'group_invite_accepted':
        return `${username} მიიღო თქვენი მოწვევა ჯგუფში`;
      case 'group_request_approved':
        return `თქვენი მოთხოვნა ჯგუფში გაწევრიანებისთვის დამტკიცდა`;
      case 'dating_match':
        return `🎉 ${username} - ახალი მატჩი გაცნობაში!`;
      case 'dating_like':
        return `💕 ${username} მოგეწონეთ გაცნობაში`;
      case 'dating_super_like':
        return `⭐ ${username} მოგცათ სუპერ ლაიქი!`;
      case 'dating_message':
        return `💬 ${username} გამოგიგზავნათ შეტყობინება გაცნობაში`;
      case 'game_friend_request':
        return `🎮 ${username} გიგზავნის თამაშის მეგობრობის მოთხოვნას`;
      case 'game_friend_accepted':
        return `🎮 ${username} დაგთანხმდა თამაშის მეგობრობაზე!`;
      case 'game_friend_declined':
        return `🎮 ${username} უარყო თამაშის მეგობრობა`;
      case 'game_invite':
        return `🎲 ${username} გიწვევს თამაშზე`;
      case 'game_invite_accepted':
        return `🎲 ${username} დათანხმდა თამაშის მოწვევას!`;
      case 'game_invite_declined':
        return `🎲 ${username} უარყო თამაშის მოწვევა`;
      default:
        return 'ახალი შეტყობინება';
    }
  }, []);

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
        toast({ title: 'შეცდომა მეგობრობის დადასტურებისას', variant: 'destructive' });
        return;
      }

      // Send notification to requester
      await supabase.from('notifications').insert({
        user_id: fromUserId,
        from_user_id: user.id,
        type: 'friend_accept'
      });

      // Mark notification as read
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

      // Mark notification as read and remove
      await supabase.from('notifications').delete().eq('id', notificationId);
      
      toast({ title: 'მოთხოვნა უარყოფილია' });
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting friend:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Group invite handlers removed - groups module deleted

  // Handle accepting relationship proposal
  const handleAcceptRelationship = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      // Find the pending relationship request from this user
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

      // Accept the relationship request using RPC
      const { error } = await supabase.rpc('accept_relationship_request', {
        request_id: request.id
      });

      if (error) throw error;

      // Mark notification as read
      await markAsRead(notificationId);
      
      toast({ title: 'ურთიერთობა დადასტურდა! 💕' });
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting relationship:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Handle rejecting relationship proposal
  const handleRejectRelationship = async (notificationId: string, fromUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      // Find the pending relationship request from this user
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

      // Reject the relationship request using RPC
      const { error } = await supabase.rpc('reject_relationship_request', {
        request_id: request.id
      });

      if (error) throw error;

      // Delete notification
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
      // Find the pending game friend request
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

      // Accept the request
      await supabase
        .from('game_friends')
        .update({ status: 'active', accepted_at: new Date().toISOString() })
        .eq('id', request.id);

      // Send notification to requester
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

  // Handle rejecting game friend request
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

      // Notify requester
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

  // Handle accepting game invite
  const handleAcceptGameInvite = async (notificationId: string, notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const roomId = notification.related_id;
      if (!roomId) {
        toast({ title: 'ოთახი ვერ მოიძებნა', variant: 'destructive' });
        return;
      }

      // Find the invite
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

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        await supabase.from('game_invites').update({ status: 'expired' }).eq('id', invite.id);
        toast({ title: 'მოწვევის ვადა გავიდა', variant: 'destructive' });
        return;
      }

      // Accept invite
      await supabase.from('game_invites').update({ status: 'accepted' }).eq('id', invite.id);

      // Notify inviter
      await supabase.from('notifications').insert({
        user_id: notification.from_user_id,
        from_user_id: user.id,
        type: 'game_invite_accepted',
        content: `დათანხმდა ${GAME_NAMES[invite.game_type] || invite.game_type} თამაშის მოწვევას`
      });

      await markAsRead(notificationId);
      toast({ title: '🎲 მოწვევა მიღებულია!' });
      
      // Navigate to game room
      if (onGameInviteAccepted) {
        onGameInviteAccepted(roomId, invite.game_type);
      }
      
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting game invite:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Handle rejecting game invite
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

        // Notify inviter
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

  useEffect(() => {
    isMounted.current = true;
    
    if (!user) return;

    fetchNotifications();

    // Subscribe to all notification events
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          if (!isMounted.current) return;
          
          // Refetch on any change
          lastFetchTime.current = 0; // Reset debounce
          fetchNotifications();
          
          // Send browser push notification only on INSERT
          if (payload.eventType === 'INSERT' && permission === 'granted' && payload.new) {
            const newNotif = payload.new as any;
            // Fetch the sender's username
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', newNotif.from_user_id)
              .single();
            
            const username = senderProfile?.username || 'მომხმარებელი';
            const notifText = getNotificationTextForPush(newNotif.type as NotificationType, username);
            
            sendNotification('PIKASO', {
              body: notifText,
              tag: `notification-${newNotif.id}`,
              icon: '/favicon.ico'
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          lastFetchTime.current = 0;
          fetchNotifications();
        }
      });

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, permission, getNotificationTextForPush, sendNotification]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    // Debounce - don't fetch more than once per 500ms
    const now = Date.now();
    if (now - lastFetchTime.current < 500) return;
    lastFetchTime.current = now;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !isMounted.current) {
        return;
      }

      // Fetch user profiles for notifications
      const fromUserIds = [...new Set(data?.map(n => n.from_user_id) || [])];
      
      let profileMap = new Map<string, any>();
      if (fromUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', fromUserIds);

        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      if (!isMounted.current) return;

      const notificationsWithUsers: Notification[] = data?.map(n => ({
        ...n,
        type: n.type as NotificationType,
        from_user: profileMap.get(n.from_user_id)
      })) || [];

      setNotifications(notificationsWithUsers);
      setUnreadCount(notificationsWithUsers.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    setNotifications([]);
    setUnreadCount(0);
    toast({ title: 'ნოტიფიკაციები წაიშალა' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'friend_accept':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'message':
        return <Mail className="w-4 h-4 text-primary" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'group_chat_reply':
        return <MessageCircle className="w-4 h-4 text-orange-500" />;
      case 'group_chat_reaction':
      case 'reaction':
      case 'post_reaction':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'group_chat_mention':
        return <MessageCircle className="w-4 h-4 text-cyan-500" />;
      case 'private_group_message':
        return <Mail className="w-4 h-4 text-amber-500" />;
      case 'content_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'content_rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'ignore':
        return <Ban className="w-4 h-4 text-red-500" />;
      case 'live_started':
        return <Radio className="w-4 h-4 text-red-500 animate-pulse" />;
      case 'story_expired':
        return <Eye className="w-4 h-4 text-purple-500" />;
      case 'relationship_proposal':
        return <HeartHandshake className="w-4 h-4 text-pink-500" />;
      case 'relationship_accepted':
      case 'relationship_ended':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'relationship_rejected':
        return <X className="w-4 h-4 text-red-500" />;
      case 'reel_like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'reel_comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'story_comment':
        return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case 'story_reaction':
        return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
      case 'friend_post':
        return <MessageCircle className="w-4 h-4 text-primary" />;
      case 'friend_photo':
        return <Camera className="w-4 h-4 text-green-500" />;
      case 'friend_video':
        return <Radio className="w-4 h-4 text-purple-500" />;
      case 'friend_story':
        return <Eye className="w-4 h-4 text-pink-500" />;
      case 'friend_reel':
        return <Radio className="w-4 h-4 text-orange-500" />;
      case 'friend_avatar_change':
        return <Camera className="w-4 h-4 text-blue-500" />;
      case 'friend_cover_change':
        return <Camera className="w-4 h-4 text-purple-500" />;
      case 'friend_poll':
        return <BarChart3 className="w-4 h-4 text-cyan-500" />;
      case 'friend_quiz':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'dating_match':
        return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
      case 'dating_like':
        return <Heart className="w-4 h-4 text-pink-400" />;
      case 'dating_super_like':
        return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
      case 'dating_message':
        return <MessageCircle className="w-4 h-4 text-pink-500" />;
      case 'game_friend_request':
      case 'game_friend_accepted':
      case 'game_friend_declined':
        return <Gamepad2 className="w-4 h-4 text-emerald-500" />;
      case 'game_invite':
      case 'game_invite_accepted':
      case 'game_invite_declined':
        return <Gamepad2 className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Parse message content for group chat notifications (format: messageId|messageContent)
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
        return `${username} მოიწონა თქვენი პოსტი`;
      case 'comment':
        return `${username} დააკომენტარა თქვენი პოსტი`;
      case 'reel_like':
        return notification.message || `${username} მოიწონა თქვენი Reel`;
      case 'reel_comment': {
        // Format: comment content in message
        const content = notification.message || '';
        return { username, text: `დააკომენტარა თქვენი Reel`, content, isReply: false };
      }
      case 'friend_request':
        return `${username} გთხოვთ მეგობრობას`;
      case 'friend_accept':
        return `${username} მიიღო თქვენი მეგობრობის მოთხოვნა`;
      case 'message':
        return `${username} გამოგიგზავნათ შეტყობინება`;
      case 'follow':
        return `${username} started following you`;
      case 'group_chat_reply': {
        const parsed = parseGroupChatMessage(notification.message);
        const rawContent = parsed?.content || '';
        const { text: cleanText, gifs } = extractGifsFromContent(rawContent);
        const roomName = notification.content || 'ჯგუფურ ჩატში';
        return { username, text: `(${roomName})`, content: cleanText, gifs, isReply: true };
      }
      case 'group_chat_reaction': {
        // New format: messageId|reactionType|messageContent
        // Old format: reactionType|messageContent
        const parts = notification.message?.split('|') || [];
        let reactionEmoji = '👍';
        let rawContent = '';
        
        if (parts.length >= 3) {
          // New format with messageId
          reactionEmoji = getReactionEmoji(parts[1]);
          rawContent = parts.slice(2).join('|');
        } else if (parts.length === 2) {
          // Old format without messageId
          reactionEmoji = getReactionEmoji(parts[0]);
          rawContent = parts[1];
        }
        
        const { text: cleanText, gifs } = extractGifsFromContent(rawContent);
        const roomName = notification.content || 'ჯგუფურ ჩატში';
        return { username, text: `${reactionEmoji} მოახდინა რეაგირება (${roomName})`, content: cleanText, gifs, isReply: false };
      }
      case 'reaction':
      case 'post_reaction': {
        // Format: reactionType|messageContent
        const parsed = parseGroupChatMessage(notification.message);
        const reactionEmoji = parsed?.messageId ? getReactionEmoji(parsed.messageId) : '👍';
        return `${username} ${reactionEmoji} მოახდინა რეაგირება თქვენს შეტყობინებაზე`;
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
        return { username, text: `გამოგიგზავნათ პირადი შეტყობინება (${roomName})`, content: cleanText, gifs, isReply: false };
      }
      case 'content_approved':
        return notification.message || 'თქვენი კონტენტი დადასტურდა!';
      case 'content_rejected':
        return notification.message || 'თქვენი კონტენტი უარყოფილია';
      case 'ignore':
        return notification.message || 'მომხმარებელმა დაგაიგნორათ';
      case 'live_started':
        return notification.message || `${username} არის ლაივში`;
      case 'story_expired':
        return notification.message || 'თქვენს სთორის ვადა ამოიწურა';
      case 'story_comment': {
        const content = notification.content || '';
        return { username, text: `დააკომენტარა თქვენი სთორი`, content };
      }
      case 'story_reaction':
        return notification.message || `${username} მოახდინა რეაგირება თქვენს სთორიზე`;
      case 'relationship_proposal':
        return notification.message || `${username} გთავაზობთ ურთიერთობას`;
      case 'relationship_accepted':
        return notification.message || 'ურთიერთობა დადასტურდა';
      case 'relationship_rejected':
        return notification.message || 'ურთიერთობის შეთავაზება უარყოფილია';
      case 'relationship_ended':
        return notification.message || 'ურთიერთობა დასრულდა';
      case 'friend_post':
        return notification.message || `თქვენმა მეგობარმა ${username} დაამატა ახალი პოსტი`;
      case 'friend_photo':
        return notification.message || `თქვენმა მეგობარმა ${username} დაამატა ახალი ფოტო`;
      case 'friend_video':
        return notification.message || `თქვენმა მეგობარმა ${username} დაამატა ახალი ვიდეო`;
      case 'friend_story':
        return notification.message || `თქვენმა მეგობარმა ${username} დაამატა ახალი სთორი`;
      case 'friend_reel':
        return notification.message || `თქვენმა მეგობარმა ${username} დაამატა ახალი Reel`;
      case 'friend_avatar_change':
        return notification.message || `თქვენმა მეგობარმა ${username} შეცვალა პროფილის ფოტო`;
      case 'friend_cover_change':
        return notification.message || `თქვენმა მეგობარმა ${username} შეცვალა ფონის სურათი`;
      case 'friend_poll':
        return notification.message || `თქვენმა მეგობარმა ${username} შექმნა ახალი გამოკითხვა`;
      case 'friend_quiz':
        return notification.message || `თქვენმა მეგობარმა ${username} შექმნა ახალი ქვიზი`;
      case 'group_invite':
        return notification.content || notification.message || `${username} გიწვევს ჯგუფში`;
      case 'group_join_request':
        return notification.content || notification.message || `${username} ითხოვს გაწევრიანებას თქვენს ჯგუფში`;
      case 'group_post':
        return notification.content || notification.message || `${username} დაამატა პოსტი თქვენს ჯგუფში`;
      case 'group_member_joined':
        return notification.content || notification.message || `${username} შეუერთდა თქვენს ჯგუფს`;
      case 'group_invite_accepted':
        return notification.content || notification.message || `${username} მიიღო თქვენი მოწვევა ჯგუფში`;
      case 'group_request_approved':
        return notification.content || notification.message || `თქვენი მოთხოვნა ჯგუფში გაწევრიანებისთვის დამტკიცდა`;
      case 'dating_match':
        return notification.message || `🎉 ახალი მატჩი! თქვენ და ${username} დაემთხვით!`;
      case 'dating_like':
        return notification.message || `💕 ${username} მოგეწონეთ გაცნობაში`;
      case 'dating_super_like':
        return notification.message || `⭐ ${username} მოგცათ სუპერ ლაიქი!`;
      case 'dating_message':
        return notification.message || `💬 ${username} გამოგიგზავნათ შეტყობინება გაცნობაში`;
      case 'game_friend_request':
        return `🎮 ${username} ${notification.content || 'გიგზავნის თამაშის მეგობრობის მოთხოვნას'}`;
      case 'game_friend_accepted':
        return `🎮 ${username} ${notification.content || 'დაგთანხმდა თამაშის მეგობრობაზე!'}`;
      case 'game_friend_declined':
        return `🎮 ${username} ${notification.content || 'უარყო თამაშის მეგობრობა'}`;
      case 'game_invite':
        return `🎲 ${username} ${notification.content || 'გიწვევს თამაშზე'}`;
      case 'game_invite_accepted':
        return `🎲 ${username} ${notification.content || 'დათანხმდა თამაშის მოწვევას!'}`;
      case 'game_invite_declined':
        return `🎲 ${username} ${notification.content || 'უარყო თამაშის მოწვევა'}`;
      default:
        return notification.message || 'ახალი შეტყობინება';
    }
  };

  // Render notification content with special handling for group chat notifications
  const renderNotificationContent = (notification: Notification) => {
    const result = getNotificationText(notification);
    
    // Check if it's a group chat notification with rich content
    if (typeof result === 'object' && 'username' in result) {
      const { username, text, content, gifs, isReply } = result as { 
        username: string; 
        text: string; 
        content?: string; 
        gifs?: string[]; 
        isReply?: boolean;
      };
      
      return (
        <div className="text-sm text-foreground">
          <span className="text-red-500 font-bold">{username}</span>
          <span> {text}</span>
          
          {/* Show reply label for group_chat_reply */}
          {isReply && (
            <span className="inline-block ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-500 rounded-full">
              პასუხი
            </span>
          )}
          
          {/* Show message content */}
          {content && (
            <p className="text-muted-foreground mt-0.5 break-words whitespace-pre-wrap line-clamp-2">
              „{content}"
            </p>
          )}
          
          {/* Show GIF images */}
          {gifs && gifs.length > 0 && (
            <div className="flex gap-1 mt-1">
              {gifs.slice(0, 1).map((gifUrl, index) => (
                <img 
                  key={index}
                  src={gifUrl} 
                  alt="GIF" 
                  className="max-w-[60px] max-h-[45px] rounded object-cover"
                  loading="lazy"
                />
              ))}
              {gifs.length > 1 && (
                <span className="text-xs text-muted-foreground self-end">+{gifs.length - 1}</span>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // Default text rendering
    return (
      <p className="text-sm text-foreground line-clamp-2">
        {result as string}
      </p>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ახლახანს';
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    return `${diffDays} დღის წინ`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Handle like/comment notifications on posts - navigate to the post
    if ((notification.type === 'like' || notification.type === 'comment' || notification.type === 'post_reaction' || notification.type === 'reaction') && notification.post_id) {
      if (onPostClick) {
        onPostClick(notification.post_id);
      }
      setIsOpen(false);
      return;
    }
    
    // Handle reel notifications - navigate to the reel
    if ((notification.type === 'reel_like' || notification.type === 'reel_comment' || notification.type === 'friend_reel') && notification.post_id) {
      if (onReelClick) {
        onReelClick(notification.post_id);
      }
      setIsOpen(false);
      return;
    }
    
    // Handle friend activity notifications - navigate to actual content
    if (notification.type === 'friend_post' && notification.post_id) {
      if (onPostClick) {
        onPostClick(notification.post_id);
      }
      setIsOpen(false);
      return;
    }
    
    if (notification.type === 'friend_photo' && notification.post_id) {
      if (onPostClick) {
        onPostClick(notification.post_id);
      }
      setIsOpen(false);
      return;
    }
    
    if (notification.type === 'friend_video' && notification.post_id) {
      if (onVideoClick) {
        onVideoClick(notification.post_id);
      } else if (onPostClick) {
        onPostClick(notification.post_id);
      }
      setIsOpen(false);
      return;
    }
    
    if (notification.type === 'friend_story' && notification.from_user_id) {
      if (onStoryClick) {
        onStoryClick(notification.from_user_id);
      }
      setIsOpen(false);
      return;
    }
    
    if (notification.type === 'friend_poll' && notification.post_id) {
      if (onPollClick) {
        onPollClick(notification.post_id);
      }
      setIsOpen(false);
      return;
    }
    
    if (notification.type === 'friend_quiz' && notification.post_id) {
      if (onQuizClick) {
        onQuizClick(notification.post_id);
      }
      setIsOpen(false);
      return;
    }
    
    // Handle avatar/cover changes - go to profile
    if (notification.type === 'friend_avatar_change' || notification.type === 'friend_cover_change') {
      if (onUserClick && notification.from_user_id) {
        onUserClick(notification.from_user_id);
      }
      setIsOpen(false);
      return;
    }
    
    // Handle group chat notifications - navigate to group chat with message highlight and username for reply
    // Message format is now: messageId|messageContent, room type is in related_type
    if ((notification.type === 'group_chat_reply' || notification.type === 'group_chat_reaction' || notification.type === 'group_chat_mention' || notification.type === 'private_group_message') && notification.message) {
      if (onGroupChatNavigate) {
        // Extract messageId from format messageId|content
        const messageId = notification.message.split('|')[0];
        const username = notification.from_user?.username;
        const roomType = notification.related_type || 'gossip';
        onGroupChatNavigate(messageId, username, roomType);
      }
      setIsOpen(false);
      return;
    }
    
    // Handle story expired - go to create story
    if (notification.type === 'story_expired') {
      if (onCreateStory) {
        onCreateStory();
      }
      setIsOpen(false);
      return;
    }
    
    // Handle relationship notifications - go to user profile
    if (notification.type === 'relationship_proposal' || notification.type === 'relationship_accepted' ||
        notification.type === 'relationship_rejected' || notification.type === 'relationship_ended') {
      if (onUserClick && notification.from_user_id) {
        onUserClick(notification.from_user_id);
      }
      setIsOpen(false);
      return;
    }
    
    // Handle dating notifications - navigate to dating module
    if (notification.type === 'dating_match' || notification.type === 'dating_message') {
      if (onDatingClick) {
        onDatingClick('matches');
      }
      setIsOpen(false);
      return;
    }
    
    if (notification.type === 'dating_like' || notification.type === 'dating_super_like') {
      if (onDatingClick) {
        onDatingClick('likes');
      }
      setIsOpen(false);
      return;
    }
    
    // Default: navigate to user profile
    if (onUserClick && notification.from_user_id) {
      onUserClick(notification.from_user_id);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 hover:bg-secondary rounded-full transition-colors">
          <Bell className="w-6 h-6 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[hsl(var(--live-red))] rounded-full text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">შეტყობინებები</h3>
            {isSupported && (
              <button
                onClick={requestPermission}
                className="p-1 rounded hover:bg-secondary transition-colors"
                title={permission === 'granted' ? 'Push ნოტიფიკაციები ჩართულია' : 'ჩართეთ Push ნოტიფიკაციები'}
              >
                {permission === 'granted' ? (
                  <Volume2 className="w-4 h-4 text-green-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                ყველას წაკითხვა
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="p-1 rounded hover:bg-destructive/10 transition-colors"
                title="ყველას წაშლა"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-secondary transition-colors"
              title="დახურვა"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mb-2 opacity-50" />
              <p>შეტყობინებები არ არის</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer flex flex-col items-stretch ${!notification.is_read ? 'bg-primary/5' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={notification.from_user?.avatar_url || ''} />
                      <AvatarFallback>
                        {notification.from_user?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {renderNotificationContent(notification)}
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      {getTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  {!notification.is_read && notification.type !== 'friend_request' && notification.type !== 'relationship_proposal' && notification.type !== 'group_invite' && notification.type !== 'game_friend_request' && notification.type !== 'game_invite' && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
                {notification.type === 'friend_request' && !notification.is_read && (
                  <div className="flex gap-2 mt-2 w-full pl-[52px]">
                    <Button
                      size="sm"
                      className="h-7 flex-1 bg-green-600 hover:bg-green-700 text-xs"
                      onClick={(e) => handleAcceptFriend(notification.id, notification.from_user_id, e)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      დადასტურება
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 flex-1 text-xs"
                      onClick={(e) => handleRejectFriend(notification.id, notification.from_user_id, e)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      უარყოფა
                    </Button>
                  </div>
                )}
                {/* Group invite handlers removed - groups module deleted */}
                {notification.type === 'relationship_proposal' && !notification.is_read && (
                  <div className="flex gap-2 mt-2 w-full pl-[52px]">
                    <Button
                      size="sm"
                      className="h-7 flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs"
                      onClick={(e) => handleAcceptRelationship(notification.id, notification.from_user_id, e)}
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      თანხმობა
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 flex-1 text-xs"
                      onClick={(e) => handleRejectRelationship(notification.id, notification.from_user_id, e)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      უარი
                    </Button>
                  </div>
                )}
                {notification.type === 'story_expired' && (
                  <div className="mt-2 w-full pl-[52px]">
                    <Button
                      size="sm"
                      className="h-7 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCreateStory) {
                          onCreateStory();
                          setIsOpen(false);
                        }
                      }}
                    >
                      <Camera className="w-3 h-3 mr-1" />
                      ახალი სთორი
                    </Button>
                  </div>
                )}
                {notification.type === 'game_friend_request' && !notification.is_read && (
                  <div className="flex gap-2 mt-2 w-full pl-[52px]">
                    <Button
                      size="sm"
                      className="h-7 flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
                      onClick={(e) => handleAcceptGameFriend(notification.id, notification.from_user_id, e)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      დავთანხმდე
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 flex-1 text-xs"
                      onClick={(e) => handleRejectGameFriend(notification.id, notification.from_user_id, e)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      უარყოფა
                    </Button>
                  </div>
                )}
                {notification.type === 'game_invite' && !notification.is_read && (
                  <div className="flex gap-2 mt-2 w-full pl-[52px]">
                    <Button
                      size="sm"
                      className="h-7 flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                      onClick={(e) => handleAcceptGameInvite(notification.id, notification, e)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      შევიდე თამაშში
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 flex-1 text-xs"
                      onClick={(e) => handleRejectGameInvite(notification.id, notification, e)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      უარყოფა
                    </Button>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

NotificationDropdown.displayName = 'NotificationDropdown';

export default NotificationDropdown;
