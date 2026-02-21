import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { ArrowLeft, MoreVertical, Trash2, Ban, VolumeX, Shield, X, Home, Reply, AtSign, UserX, Bell, Lock, Pencil, RefreshCw, Palette } from 'lucide-react';
import ChatColorPicker, { getChatBackgroundStyle } from './ChatColorPicker';
import useChatColor from '@/hooks/useChatColor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { extractAllGifShortcodes, findGifByShortcode, recordGifUsage } from '@/lib/gifShortcodes';
import { isUserOnlineByLastSeen } from '@/hooks/useOnlineStatus';
import { isOnlineVisibleExempt } from '@/lib/adminExemptions';
import ChatVideoUpload from '@/components/chat/ChatVideoUpload';
import ChatImageViewer from '@/components/chat/ChatImageViewer';
import GroupChatComposer, { GroupChatComposerHandle } from './GroupChatComposer';
import DailyTopic from './DailyTopic';
import OnlineUsersStrip from './OnlineUsersStrip';
import MessagesPaginated from './MessagesPaginated';
import EditContentPreview, { removeGifFromContent, getTextWithoutGifs, extractGifUrls, buildContentWithGifs } from '@/components/shared/EditContentPreview';

interface Message {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  gif_id: string | null;
  created_at: string;
  is_deleted: boolean;
  reply_to_id: string | null;
  is_private: boolean;
  private_to_user_id: string | null;
  profile?: {
    username: string;
    avatar_url: string | null;
    last_seen: string | null;
  };
  gif?: {
    id: string;
    file_original: string;
    file_preview: string | null;
    title: string;
  } | null;
  reply_to?: Message | null;
  private_to_profile?: {
    username: string;
  } | null;
}

interface OnlineUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  last_seen: string | null;
}

interface UserChatStatus {
  user_id: string;
  is_muted: boolean;
  is_banned: boolean;
  muted_until: string | null;
  banned_until: string | null;
}

// Helper function to check if mute/ban has expired
const isStatusExpired = (untilTimestamp: string | null): boolean => {
  if (!untilTimestamp) return false; // No expiry = permanent
  return new Date(untilTimestamp) < new Date();
};

// Get effective status considering expiration time
const getEffectiveMuteBan = (status: UserChatStatus | null): { isMuted: boolean; isBanned: boolean } => {
  if (!status) return { isMuted: false, isBanned: false };
  const isMuted = status.is_muted && !isStatusExpired(status.muted_until);
  const isBanned = status.is_banned && !isStatusExpired(status.banned_until);
  return { isMuted, isBanned };
};

interface MentionUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  last_seen: string | null;
  online_visible_until: string | null;
}

interface GroupChatViewProps {
  onBack: () => void;
  onNavigateToProfile?: (userId: string) => void;
  highlightMessageId?: string | null;
  replyToUsername?: string | null;
  replyTrigger?: number;
}

const MESSAGES_PER_PAGE = 30;

const GroupChatView = memo(({ onBack, onNavigateToProfile, highlightMessageId, replyToUsername, replyTrigger }: GroupChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserChatStatus>>(new Map());
  const [myStatus, setMyStatus] = useState<UserChatStatus | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [ignoredUsers, setIgnoredUsers] = useState<Set<string>>(new Set());
  const [usersWhoIgnoredMe, setUsersWhoIgnoredMe] = useState<Set<string>>(new Set());
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [blockedUsersProfiles, setBlockedUsersProfiles] = useState<MentionUser[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{id: string, ownerId?: string} | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editGifUrls, setEditGifUrls] = useState<string[]>([]);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allProfiles, setAllProfiles] = useState<MentionUser[]>([]);
  const [selectedMention, setSelectedMention] = useState<MentionUser | null>(null);
  const [isPrivateMessage, setIsPrivateMessage] = useState(false);

  // State for group chat presence
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [addTopicCallback, setAddTopicCallback] = useState<(() => void) | null>(null);
  
  // Grace period in seconds for message items (1 minute)
  const gracePeriodSeconds = 60;

  const composerRef = useRef<GroupChatComposerHandle>(null);
  const lastSeenUpdateRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { session, profile } = useAuth();
  const { upload: s3Upload } = useS3Upload({ folder: S3_FOLDERS.CHAT_IMAGES });
  const { chatColor, setChatColor } = useChatColor();
  
  // Fetch users who are specifically in the group chat room
  const fetchGroupChatPresence = useCallback(async () => {
    const cutoffTime = new Date(Date.now() - 120 * 1000).toISOString(); // 120 seconds (2 min grace)
    
    const { data: presenceData } = await supabase
      .from('group_chat_presence')
      .select('user_id, last_active_at')
      .gt('last_active_at', cutoffTime)
      .order('last_active_at', { ascending: false });
    
    if (!presenceData || presenceData.length === 0) {
      setOnlineUsers([]);
      return;
    }
    
    // Fetch profiles for these users
    const userIds = presenceData.map(p => p.user_id);
    
    // Parallel fetch: profiles and invisible users
    const [profilesResult, invisibleResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, username, avatar_url, last_seen')
        .in('user_id', userIds),
      supabase
        .from('privacy_settings')
        .select('user_id')
        .in('user_id', userIds)
        .eq('is_invisible', true)
    ]);
    
    // Build set of invisible users
    const invisibleSet = new Set(invisibleResult.data?.map(u => u.user_id) || []);
    
    if (profilesResult.data) {
      const profileMap = new Map(profilesResult.data.map(p => [p.user_id, p]));
      const users = presenceData
        .filter(p => !invisibleSet.has(p.user_id) || isOnlineVisibleExempt(p.user_id)) // Exclude invisible users (except exempt admins)
        .map(p => {
          const profileData = profileMap.get(p.user_id);
          return profileData ? {
            user_id: p.user_id,
            username: profileData.username,
            avatar_url: profileData.avatar_url,
            last_seen: p.last_active_at
          } : null;
        })
        .filter((u): u is OnlineUser => u !== null);
      
      setOnlineUsers(users);
    }
  }, []);
  
  // Update presence in group chat
  const updateGroupChatPresence = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const now = new Date().toISOString();
    
    // Upsert presence
    await supabase
      .from('group_chat_presence')
      .upsert({
        user_id: session.user.id,
        last_active_at: now
      }, { onConflict: 'user_id' });
  }, [session?.user?.id]);
  
  // Cleanup presence when leaving
  const cleanupGroupChatPresence = useCallback(async () => {
    if (!session?.user?.id) return;
    
    await supabase
      .from('group_chat_presence')
      .delete()
      .eq('user_id', session.user.id);
  }, [session?.user?.id]);

  // Calculate total pages - mutual ignore logic (super admins see everything)
  const totalPages = useMemo(() => {
    const filteredCount = messages.filter(message => {
      // Super admins see all messages
      if (isSuperAdmin) {
        if (message.is_private) {
          return true; // Super admins see all private messages too
        }
        return true;
      }
      
      // Mutual ignore: if I ignored them OR they ignored me, don't show
      const isMessageFromIgnoredUser = ignoredUsers.has(message.user_id) && message.user_id !== session?.user?.id;
      const isMessageFromUserWhoIgnoredMe = usersWhoIgnoredMe.has(message.user_id) && message.user_id !== session?.user?.id;
      
      if (isMessageFromIgnoredUser || isMessageFromUserWhoIgnoredMe) return false;
      
      if (message.is_private) {
        const isSender = message.user_id === session?.user?.id;
        const isRecipient = message.private_to_user_id === session?.user?.id;
        return isSender || isRecipient;
      }
      return true;
    }).length;
    return Math.max(1, Math.ceil(filteredCount / MESSAGES_PER_PAGE));
  }, [messages, ignoredUsers, usersWhoIgnoredMe, session?.user?.id, isSuperAdmin]);

  // Fetch all profiles for mention picker
  const fetchAllProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, last_seen, online_visible_until')
      .order('username');
    
    if (data) setAllProfiles(data);
  }, []);

  // Fetch ignored users (both directions for mutual ignore)
  const fetchIgnoredUsers = useCallback(async () => {
    if (!session?.user?.id) return;
    
    // Fetch users I have blocked
    const { data: myBlocks } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', session.user.id);
    
    // Fetch users who have blocked me
    const { data: blockedByOthers } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', session.user.id);
    
    if (myBlocks) {
      const blockedIds = myBlocks.map(b => b.blocked_id);
      setIgnoredUsers(new Set(blockedIds));
      
      if (blockedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, last_seen, online_visible_until')
          .in('user_id', blockedIds);
        
        if (profiles) setBlockedUsersProfiles(profiles);
      } else {
        setBlockedUsersProfiles([]);
      }
    }
    
    // Set users who ignored me (for mutual ignore functionality)
    if (blockedByOthers) {
      const usersWhoBlockedMe = blockedByOthers.map(b => b.blocker_id);
      setUsersWhoIgnoredMe(new Set(usersWhoBlockedMe));
    }
  }, [session?.user?.id]);

  const checkAdminStatus = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    setIsAdmin(data?.role === 'admin' || data?.role === 'super_admin' || data?.role === 'moderator');
    setIsSuperAdmin(data?.role === 'super_admin');
  }, [session?.user?.id]);

  const fetchUserStatuses = useCallback(async () => {
    const { data } = await supabase
      .from('user_chat_status')
      .select('*');
    
    if (data) {
      const statusMap = new Map<string, UserChatStatus>();
      data.forEach(status => {
        statusMap.set(status.user_id, status);
        if (session?.user?.id === status.user_id) {
          setMyStatus(status);
        }
      });
      setUserStatuses(statusMap);
    }
  }, [session?.user?.id]);

  const fetchClearedAt = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const { data } = await supabase
      .from('group_chat_user_state')
      .select('cleared_at')
      .eq('user_id', session.user.id)
      .eq('room_type', 'gossip')
      .maybeSingle();
    
    if (data?.cleared_at) {
      setClearedAt(data.cleared_at);
    }
  }, [session?.user?.id]);

  const fetchMessages = useCallback(async () => {
    try {
      let query = supabase
        .from('group_chat_messages')
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .order('created_at', { ascending: false })
        .limit(300);
      
      // Filter out messages before cleared_at timestamp
      if (clearedAt) {
        query = query.gt('created_at', clearedAt);
      }
      
      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) throw messagesError;
      
      // Get unique user IDs from messages
      const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
      const privateToUserIds = [...new Set(messagesData?.filter(m => m.private_to_user_id).map(m => m.private_to_user_id) || [])];
      const allUserIds = [...new Set([...userIds, ...privateToUserIds])];
      
      // Fetch profiles for all users in the messages
      const profilesMap = new Map<string, any>();
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, last_seen')
          .in('user_id', allUserIds);
        
        profilesData?.forEach(p => profilesMap.set(p.user_id, p));
      }
      
      const messagesMap = new Map<string, any>();
      messagesData?.forEach(msg => {
        messagesMap.set(msg.id, {
          ...msg,
          profile: profilesMap.get(msg.user_id) || { username: 'Unknown', avatar_url: null, last_seen: null }
        });
      });
      
      // Keep descending order - newest first (page 1 = newest messages)
      const transformedMessages = (messagesData || []).map(msg => ({
        ...msg,
        profile: profilesMap.get(msg.user_id) || { username: 'Unknown', avatar_url: null, last_seen: null },
        reply_to: msg.reply_to_id ? messagesMap.get(msg.reply_to_id) || null : null,
        private_to_profile: msg.private_to_user_id ? profilesMap.get(msg.private_to_user_id) || { username: 'Unknown' } : null
      }));
      
      setMessages(transformedMessages);
      // Stay on page 1 (newest messages)
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [clearedAt]);

  const updateLastSeen = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const now = new Date().toISOString();
    lastSeenUpdateRef.current = now;
    
    await supabase
      .from('profiles')
      .update({ last_seen: now })
      .eq('user_id', session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    // First fetch cleared_at
    fetchClearedAt();
  }, [fetchClearedAt]);

  useEffect(() => {
    // Run initial fetches in parallel
    Promise.all([
      fetchMessages(),
      checkAdminStatus(),
      fetchUserStatuses(),
      fetchIgnoredUsers(),
      fetchAllProfiles(),
      fetchGroupChatPresence()
    ]);
    
    // Update presence once on mount
    updateGroupChatPresence();
    
    // Update last_seen every 30 seconds (was 10 - reduces server load by 66%)
    const lastSeenInterval = setInterval(updateLastSeen, 30000);

    // Update group chat presence every 30 seconds AND refresh online users list every 30 seconds
    const presenceInterval = setInterval(() => {
      updateGroupChatPresence();
      fetchGroupChatPresence();
    }, 30000);

    // Subscribe to all message changes - live mode
    const channel = supabase
      .channel('group-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_messages'
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Skip if before cleared_at
          if (clearedAt && newMsg.created_at <= clearedAt) return;
          
          // Skip if already in messages
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return prev; // temporary, will update below
          });

          // Fetch profile for the new message sender
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url, last_seen')
            .eq('user_id', newMsg.user_id)
            .single();

          // Fetch gif data if present
          let gifData = null;
          if (newMsg.gif_id) {
            const { data } = await supabase
              .from('gifs')
              .select('id, file_original, file_preview, title')
              .eq('id', newMsg.gif_id)
              .single();
            gifData = data;
          }

          // Fetch reply_to message if present
          let replyTo = null;
          if (newMsg.reply_to_id) {
            const { data: replyData } = await supabase
              .from('group_chat_messages')
              .select('*, gif:gifs(id, file_original, file_preview, title)')
              .eq('id', newMsg.reply_to_id)
              .single();
            if (replyData) {
              const { data: replyProfile } = await supabase
                .from('profiles')
                .select('user_id, username, avatar_url, last_seen')
                .eq('user_id', replyData.user_id)
                .single();
              replyTo = { ...replyData, profile: replyProfile || { username: 'Unknown', avatar_url: null, last_seen: null } };
            }
          }

          // Fetch private_to profile if present
          let privateToProfile = null;
          if (newMsg.private_to_user_id) {
            const { data: ptProfile } = await supabase
              .from('profiles')
              .select('user_id, username, avatar_url, last_seen')
              .eq('user_id', newMsg.private_to_user_id)
              .single();
            privateToProfile = ptProfile || { username: 'Unknown' };
          }

          const transformedMsg = {
            ...newMsg,
            gif: gifData,
            profile: profileData || { username: 'Unknown', avatar_url: null, last_seen: null },
            reply_to: replyTo,
            private_to_profile: privateToProfile
          };

          // Messages are stored newest-first, so prepend
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [transformedMsg, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_chat_messages'
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, ...updatedMessage, is_deleted: updatedMessage.is_deleted, content: updatedMessage.content }
              : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_chat_messages'
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages(prev => prev.filter(msg => msg.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      clearInterval(lastSeenInterval);
      clearInterval(presenceInterval);
      cleanupGroupChatPresence();
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Handle highlight message
  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
      setHighlightedId(highlightMessageId);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, [highlightMessageId, messages]);

  // Handle reply to username - insert mention in composer
  useEffect(() => {
    if (replyToUsername && !loading) {
      // Larger delay to ensure composer is fully mounted and ready
      const timer = setTimeout(() => {
        if (composerRef.current) {
          composerRef.current.insertMention(replyToUsername);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [replyToUsername, replyTrigger, loading]);

  // Image handlers - with memory leak prevention
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'შეცდომა',
          description: 'სურათის ზომა არ უნდა აღემატებოდეს 10MB-ს',
          variant: 'destructive'
        });
        return;
      }
      // Clean up previous preview URL to prevent memory leak
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const cancelImage = useCallback(() => {
    // Clean up preview URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!session?.user?.id) return null;
    
    // Use S3 upload
    const result = await s3Upload(file, S3_FOLDERS.CHAT_IMAGES);
    return result?.url || null;
  };

  // Message handlers
  const handleComposerSend = useCallback(async (message: string, mention: MentionUser | null, isPrivate: boolean) => {
    if (!message.trim() && !selectedImage) return;
    if (!session?.user?.id) return;
    
    if (isPrivate && !mention) {
      toast({
        title: 'შეცდომა',
        description: 'პირადი შეტყობინებისთვის გამოიყენეთ @ მომხმარებლის მონიშვნისთვის',
        variant: 'destructive'
      });
      return;
    }
    
    const { isMuted, isBanned } = getEffectiveMuteBan(myStatus);
    if (isBanned || isMuted) {
      toast({
        title: isBanned ? 'დაბლოკილი ხართ' : 'დადუმებული ხართ',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    
    try {
      let imageUrl: string | null = null;
      
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) throw new Error('Failed to upload image');
      }
      
      // Check for multiple GIF shortcodes
      const allShortcodes = extractAllGifShortcodes(message.trim());
      
      // Find all valid GIFs and build content with embedded GIF markers
      let processedContent = message.trim();
      const validGifs: { id: string; file_original: string; file_preview?: string | null; title: string; shortcode: string }[] = [];
      
      for (const shortcode of allShortcodes) {
        const gif = await findGifByShortcode(shortcode);
        if (gif) {
          validGifs.push({ ...gif, shortcode });
          await recordGifUsage(gif.id, session.user.id);
          // Replace shortcode with GIF marker in content
          processedContent = processedContent.replace(shortcode, `[GIF:${gif.file_original}]`);
        }
      }
      
      // Use first GIF for gif_id field (for compatibility), store all in content
      const firstGifId = validGifs.length > 0 ? validGifs[0].id : null;
      
      const { data: insertedMessage, error } = await supabase
        .from('group_chat_messages')
        .insert({
          user_id: session.user.id,
          content: processedContent || null,
          image_url: imageUrl,
          gif_id: firstGifId,
          reply_to_id: replyingTo?.id || null,
          is_private: isPrivate,
          private_to_user_id: isPrivate && mention ? mention.user_id : null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Optimistic update - immediately add message to UI with GIF data
      if (insertedMessage) {
        const newMsg: Message = {
          ...insertedMessage,
          profile: {
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            last_seen: new Date().toISOString()
          },
          gif: validGifs.length > 0 ? {
            id: validGifs[0].id,
            file_original: validGifs[0].file_original,
            file_preview: validGifs[0].file_preview || null,
            title: validGifs[0].title
          } : null,
          reply_to: replyingTo || null,
          private_to_profile: isPrivate && mention ? { username: mention.username } : null
        };
        
        // Add new message and re-sort by created_at descending to maintain proper order
        setMessages(prev => {
          const updated = [newMsg, ...prev.filter(m => m.id !== newMsg.id)];
          // Sort by created_at descending (newest first)
          return updated.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        setCurrentPage(1);
      }
      
      // Notifications
      if (replyingTo && replyingTo.user_id !== session.user.id && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: replyingTo.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_reply',
          post_id: replyingTo.id,
          message: `${insertedMessage.id}|${processedContent || (firstGifId ? 'GIF' : '')}`
        });
      }
      
      if (isPrivate && mention && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: mention.user_id,
          from_user_id: session.user.id,
          type: 'private_group_message',
          message: `${insertedMessage.id}|${processedContent || (firstGifId ? 'GIF' : '')}`
        });
      }
      
      if (!isPrivate && mention && mention.user_id !== session.user.id && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: mention.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_mention',
          message: `${insertedMessage.id}|${processedContent || (firstGifId ? 'GIF' : '')}`
        });
      }
      
      setReplyingTo(null);
      setSelectedMention(null);
      setIsPrivateMessage(false);
      if (selectedImage) {
        setSelectedImage(null);
        setPreviewUrl(null);
      }
      updateLastSeen();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'შეცდომა',
        description: 'შეტყობინების გაგზავნა ვერ მოხერხდა',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  }, [session?.user?.id, myStatus, replyingTo, toast, updateLastSeen, selectedImage, profile, messages.length]);

  const handleSendGif = useCallback(async (gif: any) => {
    const { isMuted, isBanned } = getEffectiveMuteBan(myStatus);
    if (!session?.user?.id || isBanned || isMuted) return;
    
    setSending(true);
    try {
      const { data: insertedMessage, error } = await supabase
        .from('group_chat_messages')
        .insert({
          user_id: session.user.id,
          gif_id: gif.id,
          reply_to_id: replyingTo?.id || null
        })
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .single();
      
      if (error) throw error;
      
      if (insertedMessage) {
        const newMsg: Message = {
          ...insertedMessage,
          profile: {
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            last_seen: new Date().toISOString()
          },
          reply_to: replyingTo || null,
          private_to_profile: null
        };
        
        // Add new message and re-sort by created_at descending to maintain proper order
        setMessages(prev => {
          const updated = [newMsg, ...prev.filter(m => m.id !== newMsg.id)];
          return updated.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        setCurrentPage(1);
      }
      
      await recordGifUsage(gif.id, session.user.id);
      setReplyingTo(null);
      setSelectedMention(null);
      setIsPrivateMessage(false);
    } catch (error) {
      console.error('Error sending GIF:', error);
    } finally {
      setSending(false);
    }
  }, [session?.user?.id, myStatus, replyingTo, profile, messages.length]);

  const handleComposerImageSelect = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'შეცდომა',
        description: 'სურათის ზომა არ უნდა აღემატებოდეს 10MB-ს',
        variant: 'destructive'
      });
      return;
    }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [toast]);

  const handleVideoClick = useCallback(() => setShowVideoUpload(true), []);
  const handleCancelReply = useCallback(() => setReplyingTo(null), []);

  const composerReplyingTo = useMemo(() => {
    if (!replyingTo) return null;
    return { 
      id: replyingTo.id, 
      user_id: replyingTo.user_id,
      username: replyingTo.profile?.username || '', 
      content: replyingTo.content 
    };
  }, [replyingTo]);

  const handleVideoUpload = async (videoUrl: string) => {
    if (!session?.user?.id) return;
    
    setUploadingVideo(true);
    try {
      const { error } = await supabase
        .from('group_chat_messages')
        .insert({
          user_id: session.user.id,
          video_url: videoUrl
        });
      
      if (error) throw error;
      
      setShowVideoUpload(false);
      fetchMessages(); // Refresh to get the new message
      toast({ title: 'ვიდეო გაიგზავნა' });
    } catch (error) {
      console.error('Error sending video:', error);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSendVoice = useCallback(async (
    audioUrl: string, 
    voiceReplyingTo?: { id: string; user_id: string; username: string } | null,
    voiceMention?: { user_id: string; username: string } | null,
    isPrivate?: boolean
  ) => {
    const { isMuted, isBanned } = getEffectiveMuteBan(myStatus);
    if (!session?.user?.id || isBanned || isMuted) return;

    setSending(true);
    try {
      const { data: insertedMessage, error } = await supabase
        .from('group_chat_messages')
        .insert({
          user_id: session.user.id,
          content: '🎤 ხმოვანი შეტყობინება',
          image_url: audioUrl,
          reply_to_id: voiceReplyingTo?.id || null,
          private_to_user_id: isPrivate && voiceMention ? voiceMention.user_id : null
        })
        .select('id')
        .single();
      
      if (error) throw error;

      // Send notifications for voice messages
      if (voiceReplyingTo && voiceReplyingTo.user_id !== session.user.id && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: voiceReplyingTo.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_reply',
          post_id: voiceReplyingTo.id,
          message: `${insertedMessage.id}|🎤 ხმოვანი შეტყობინება`
        });
      }
      
      if (isPrivate && voiceMention && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: voiceMention.user_id,
          from_user_id: session.user.id,
          type: 'private_group_message',
          message: `${insertedMessage.id}|🎤 ხმოვანი შეტყობინება`
        });
      }
      
      if (!isPrivate && voiceMention && voiceMention.user_id !== session.user.id && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: voiceMention.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_mention',
          message: `${insertedMessage.id}|🎤 ხმოვანი შეტყობინება`
        });
      }
      
      // Clear reply state after sending voice message
      if (voiceReplyingTo) {
        setReplyingTo(null);
      }
      setSelectedMention(null);
      setIsPrivateMessage(false);
      
      fetchMessages();
    } catch (error) {
      console.error('Error sending voice message:', error);
    } finally {
      setSending(false);
    }
  }, [session?.user?.id, myStatus, fetchMessages]);

  // Edit message
  const startEditing = (message: Message) => {
    setEditingMessage(message);
    const content = message.content || '';
    // Extract text without GIFs and GIF URLs separately
    setEditContent(getTextWithoutGifs(content));
    setEditGifUrls(extractGifUrls(content));
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setEditContent('');
    setEditGifUrls([]);
  };

  const saveEdit = async () => {
    if (!editingMessage || !session?.user?.id) return;
    
    // Allow editing if: own message OR super admin
    const canEdit = editingMessage.user_id === session.user.id || isSuperAdmin;
    if (!canEdit) return;
    
    // Rebuild content with text and GIFs
    const finalContent = buildContentWithGifs(editContent, editGifUrls);
    
    try {
      // Super admins can edit any message, regular users only their own
      const query = supabase
        .from('group_chat_messages')
        .update({ content: finalContent || null })
        .eq('id', editingMessage.id);
      
      // Only add user_id filter for non-super-admins
      if (!isSuperAdmin) {
        query.eq('user_id', session.user.id);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      // Log admin action if super admin edited someone else's message
      if (isSuperAdmin && editingMessage.user_id !== session.user.id) {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', editingMessage.user_id)
          .single();
        
        await supabase.from('admin_action_logs').insert({
          admin_id: session.user.id,
          admin_role: 'super_admin',
          action_type: 'edit',
          action_category: 'chat',
          target_user_id: editingMessage.user_id,
          target_content_id: editingMessage.id,
          target_content_type: 'group_chat_message',
          description: `რედაქტირებია შეტყობინება ჯგუფურ ჩატში მომხმარებელ ${targetProfile?.username || 'უცნობი'}-ს`,
          metadata: {
            original_content: editingMessage.content,
            new_content: editContent.trim()
          }
        });
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage.id 
          ? { ...msg, content: editContent.trim() || null }
          : msg
      ));
      
      toast({ title: 'შეტყობინება შეიცვალა' });
      cancelEditing();
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  // Delete message
  const openDeleteConfirm = (messageId: string, ownerId?: string) => {
    setMessageToDelete({ id: messageId, ownerId });
    setShowDeleteConfirm(true);
  };

  const deleteMessage = async () => {
    if (!session?.user?.id || !messageToDelete) return;
    
    const isOwnerDeleting = messageToDelete.ownerId === session.user.id;
    const canDelete = isOwnerDeleting || isAdmin;
    if (!canDelete) return;
    
    try {
      // Get message content before deleting (for admin audit log)
      const messageToLog = messages.find(m => m.id === messageToDelete.id);
      const originalContent = messageToLog?.content || (messageToLog?.gif ? 'GIF' : messageToLog?.image_url ? 'სურათი' : messageToLog?.video_url ? 'ვიდეო' : 'შეტყობინება');
      
      const { error } = await supabase
        .from('group_chat_messages')
        .update({ is_deleted: true, content: null, image_url: null, video_url: null, gif_id: null })
        .eq('id', messageToDelete.id);
      
      if (error) throw error;
      
      // Log admin action if admin deleted someone else's message
      if (isAdmin && !isOwnerDeleting && messageToDelete.ownerId) {
        // Get admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        // Get target user profile
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', messageToDelete.ownerId)
          .single();
        
        const adminRole = roleData?.role || 'admin';
        const targetUsername = targetProfile?.username || 'უცნობი';
        
        // Log to admin_message_audit table (legacy)
        await supabase.from('admin_message_audit').insert({
          sender_id: session.user.id,
          receiver_id: messageToDelete.ownerId,
          sender_role: adminRole,
          conversation_id: messageToDelete.id,
          action: 'delete_group_message',
          metadata: {
            message_id: messageToDelete.id,
            original_content: originalContent,
            deleted_at: new Date().toISOString()
          }
        });
        
        // Log to new admin_action_logs table
        await supabase.from('admin_action_logs').insert({
          admin_id: session.user.id,
          admin_role: adminRole,
          action_type: 'delete',
          action_category: 'chat',
          target_user_id: messageToDelete.ownerId,
          target_content_id: messageToDelete.id,
          target_content_type: 'group_chat_message',
          description: `წაშალა შეტყობინება ჯგუფურ ჩატში მომხმარებელ ${targetUsername}-ს`,
          metadata: {
            original_content: originalContent
          }
        });
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageToDelete.id 
          ? { ...msg, is_deleted: true, content: null, image_url: null, video_url: null, gif: null }
          : msg
      ));
      
      toast({ title: 'შეტყობინება წაიშალა' });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
    
    setMessageToDelete(null);
  };

  // User moderation
  const checkUserHasProtectedRole = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    return data?.role === 'moderator' || data?.role === 'admin' || data?.role === 'super_admin';
  };

  const ignoreUser = async (userId: string) => {
    if (!session?.user?.id) return;
    
    try {
      const hasProtectedRole = await checkUserHasProtectedRole(userId);
      if (hasProtectedRole) {
        toast({
          title: 'შეცდომა',
          description: 'ადმინისტრატორების და მოდერატორების დაიგნორება შეუძლებელია',
          variant: 'destructive'
        });
        return;
      }
      
      const { error: insertError } = await supabase
        .from('user_blocks')
        .insert({ blocker_id: session.user.id, blocked_id: userId });
      
      if (insertError) {
        console.error('Error inserting block:', insertError);
        // Check if already blocked (duplicate key)
        if (insertError.code === '23505') {
          toast({ title: 'მომხმარებელი უკვე დაიგნორებულია' });
        } else {
          toast({ title: 'შეცდომა', description: insertError.message, variant: 'destructive' });
        }
        return;
      }
      
      // Fetch the profile of the ignored user
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, last_seen, online_visible_until')
        .eq('user_id', userId)
        .maybeSingle();
      
      setIgnoredUsers(prev => new Set([...prev, userId]));
      if (profile) {
        setBlockedUsersProfiles(prev => [...prev, profile]);
      }
      toast({ title: 'მომხმარებელი დაიგნორდა' });
    } catch (error) {
      console.error('Error ignoring user:', error);
      toast({ title: 'შეცდომა დაიგნორებისას', variant: 'destructive' });
    }
  };

  const unignoreUser = async (userId: string) => {
    if (!session?.user?.id) return;
    
    try {
      await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', session.user.id)
        .eq('blocked_id', userId);
      
      setIgnoredUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setBlockedUsersProfiles(prev => prev.filter(p => p.user_id !== userId));
      toast({ title: 'იგნორი მოიხსნა' });
    } catch (error) {
      console.error('Error unignoring user:', error);
    }
  };

  const muteUser = async (userId: string) => {
    try {
      await supabase
        .from('user_chat_status')
        .upsert({
          user_id: userId,
          is_muted: true,
          muted_by: session?.user?.id,
          muted_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'user_id' });
      
      toast({ title: 'მომხმარებელი დადუმდა 24 საათით' });
      fetchUserStatuses();
    } catch (error) {
      console.error('Error muting user:', error);
    }
  };

  const banUser = async (userId: string) => {
    try {
      await supabase
        .from('user_chat_status')
        .upsert({
          user_id: userId,
          is_banned: true,
          banned_by: session?.user?.id
        }, { onConflict: 'user_id' });
      
      toast({ title: 'მომხმარებელი დაიბლოკა' });
      fetchUserStatuses();
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const clearAllMessages = async () => {
    if (!session?.user?.id || !isAdmin) return;
    
    try {
      toast({ title: 'მიმდინარეობს გასუფთავება...' });
      
      // Use edge function to delete (has longer timeout and uses service role)
      const { data, error } = await supabase.functions.invoke('admin-clear-room', {
        body: { room_table: 'group_chat_messages' }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        toast({ title: 'შეცდომა გასუფთავებისას', description: error.message, variant: 'destructive' });
        return;
      }
      
      setMessages([]);
      toast({ title: data?.message || 'ჩატი გასუფთავდა ყველასთვის' });
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
    setShowClearConfirm(false);
  };
  
  const handleClearRoomClick = () => {
    setShowClearConfirm(true);
  };

  const handleMentionFromOnlineList = (username: string) => {
    composerRef.current?.insertMention(username);
  };

  const handlePrivateMessage = (message: Message) => {
    setReplyingTo(message);
    setSelectedMention({ 
      user_id: message.user_id, 
      username: message.profile?.username || '', 
      avatar_url: message.profile?.avatar_url || null,
      last_seen: message.profile?.last_seen || null,
      online_visible_until: null
    });
    setIsPrivateMessage(true);
  };

  // Block horizontal swiping - MUST be before any conditional returns
  useEffect(() => {
    const container = document.querySelector('.group-chat-container');
    if (!container) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = Math.abs(e.touches[0].clientX - startX);
      const deltaY = Math.abs(e.touches[0].clientY - startY);
      
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Banned check - considering expiration
  const { isBanned: isEffectivelyBanned } = getEffectiveMuteBan(myStatus);
  if (isEffectivelyBanned) {
    return (
      <div className="flex flex-col items-center justify-center bg-background p-6 min-h-[50vh]">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8 text-center max-w-md">
          <Ban className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">წვდომა აკრძალულია</h2>
          <p className="text-muted-foreground mb-6">
            თქვენ აკრძალული გაქვთ ჯგუფურ ჩატში შესვლა.
          </p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            უკან დაბრუნება
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-background min-h-[50vh]">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="group-chat-container flex flex-col bg-background h-full w-full overflow-hidden"
      style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
    >
      {/* Header - Fixed at top, never scrolls */}
      <div className="flex-shrink-0 border-b border-border bg-card z-10 w-full">
        <div className="flex items-center justify-center px-2 sm:px-3 py-1.5 w-full max-w-none">
          <h2 className="font-semibold text-base">ჭორბიურო</h2>
        </div>
      </div>

      {/* Scrollable content area - includes topic, composer, online users and messages */}
      <PullToRefresh
        onRefresh={async () => {
          setRefreshing(true);
          await Promise.all([fetchMessages(), fetchGroupChatPresence()]);
          setRefreshing(false);
        }}
        config={{ threshold: 50, maxPull: 65, resistance: 0.3 }}
        scrollRef={scrollContainerRef}
      >
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full overscroll-contain" style={chatColor ? getChatBackgroundStyle(chatColor) : undefined}>
        {/* Daily Topic */}
        <div className="w-full px-1 sm:px-2">
          <DailyTopic 
            isSuperAdmin={isSuperAdmin} 
            userId={session?.user?.id}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              Promise.all([fetchMessages(), fetchGroupChatPresence()]).finally(() => setRefreshing(false));
            }}
            ignoredCount={ignoredUsers.size}
            onShowIgnoreList={() => setShowBlockedList(true)}
            chatColor={chatColor}
            onColorChange={setChatColor}
            onStartAddTopic={(callback) => setAddTopicCallback(() => callback)}
          />
        </div>

        {/* Message Composer - At top, below topic */}
        <div className={`border-b border-border/50 w-full ${chatColor ? 'bg-black/10' : 'bg-card/50'}`}>
        {/* Image Preview */}
        {previewUrl && (
          <div className={`px-2 sm:px-4 py-2 sm:py-3 w-full ${chatColor ? 'bg-black/10' : 'bg-card'}`}>
            <div className="relative inline-block">
              <img src={previewUrl} alt="Preview" className="max-h-24 rounded-lg" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                onClick={cancelImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <div className={`px-2 sm:px-4 py-2 sm:py-3 w-full ${chatColor ? 'bg-black/10' : 'bg-card'}`}>
            <div className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 bg-secondary/50 rounded-xl">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Reply className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-primary block">
                    პასუხი: {replyingTo.profile?.username}
                  </span>
                  <span className="text-sm text-muted-foreground truncate block">
                    {replyingTo.content || (replyingTo.gif ? 'GIF' : replyingTo.image_url ? 'სურათი' : '')}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReplyingTo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Selected Mention & Private Message Toggle */}
        {selectedMention && (
          <div className={`px-2 sm:px-4 py-2 sm:py-3 w-full ${chatColor ? 'bg-black/10' : 'bg-card'}`}>
            <div className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 bg-primary/10 rounded-xl flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <AtSign className="w-5 h-5 text-primary flex-shrink-0" />
                <Avatar className="w-7 h-7">
                  <AvatarImage src={selectedMention.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {selectedMention.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{selectedMention.username}</span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={isPrivateMessage}
                    onCheckedChange={(checked) => setIsPrivateMessage(checked as boolean)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    პირადი
                  </span>
                </label>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => {
                    setSelectedMention(null);
                    setIsPrivateMessage(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {isPrivateMessage && (
              <p className="text-xs text-muted-foreground mt-2 px-3">
                🔒 ამ შეტყობინებას დაინახავთ მხოლოდ თქვენ და {selectedMention.username}
              </p>
            )}
          </div>
        )}

        <GroupChatComposer
          ref={composerRef}
          userId={session?.user?.id}
          disabled={getEffectiveMuteBan(myStatus).isBanned || getEffectiveMuteBan(myStatus).isMuted || sending}
          isPrivateMessage={isPrivateMessage}
          hasImage={!!selectedImage}
          replyingTo={composerReplyingTo}
          allProfiles={allProfiles}
          externalSelectedMention={selectedMention}
          onSend={handleComposerSend}
          onImageSelect={handleComposerImageSelect}
          onVideoClick={handleVideoClick}
          onVoiceSend={handleSendVoice}
          onGifSelect={handleSendGif}
          onCancelReply={handleCancelReply}
        />
      </div>

        {/* Online Users Strip */}
        <OnlineUsersStrip users={onlineUsers} onMention={handleMentionFromOnlineList} />

        {/* Messages with Pagination */}
        <MessagesPaginated
          messages={messages}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          currentUserId={session?.user?.id}
          currentUsername={allProfiles.find(p => p.user_id === session?.user?.id)?.username}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          ignoredUsers={ignoredUsers}
          usersWhoIgnoredMe={usersWhoIgnoredMe}
          gracePeriodSeconds={gracePeriodSeconds}
          roomType="gossip"
          roomName="ჭორბიურო"
          onReply={setReplyingTo}
          onDelete={openDeleteConfirm}
          onIgnore={ignoreUser}
          onUnignore={unignoreUser}
          onMute={muteUser}
          onBan={banUser}
          onEdit={startEditing}
          onNavigateToProfile={onNavigateToProfile}
          onImageClick={setFullscreenImage}
          onPrivateMessage={handlePrivateMessage}
          highlightedId={highlightedId}
          userStatuses={userStatuses}
          chatBackgroundColor={chatColor}
          onColorChange={setChatColor}
          onClearRoom={isAdmin ? handleClearRoomClick : undefined}
          onAddTopic={isSuperAdmin ? addTopicCallback : undefined}
        />
      </div>
      </PullToRefresh>

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <Pencil className="w-4 h-4 text-primary" />
              <span className="font-medium">შეტყობინების რედაქტირება</span>
            </div>
            {/* GIF Preview */}
            <EditContentPreview 
              gifUrls={editGifUrls} 
              onRemoveGif={(url) => setEditGifUrls(prev => prev.filter(u => u !== url))}
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full mb-3 p-3 rounded-md border border-input bg-background text-sm resize-none min-h-[80px] max-h-[200px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="შეტყობინება..."
              rows={3}
              onKeyDown={(e) => {
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') cancelEditing();
              }}
              autoFocus
              onFocus={(e) => {
                // Move cursor to end of text
                const val = e.target.value;
                e.target.value = '';
                e.target.value = val;
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelEditing}>გაუქმება</Button>
              <Button size="sm" onClick={saveEdit}>შენახვა</Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Upload Modal */}
      {showVideoUpload && session?.user?.id && (
        <ChatVideoUpload
          userId={session.user.id}
          onUploadComplete={handleVideoUpload}
          onCancel={() => setShowVideoUpload(false)}
        />
      )}

      {/* Blocked Users Modal */}
      {showBlockedList && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-md max-h-[70vh] flex flex-col relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowBlockedList(false)}
              className="absolute top-2 right-2 h-8 w-8 bg-muted/80 hover:bg-muted z-10"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="flex items-center p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <UserX className="w-5 h-5" />
                დაიგნორებული მომხმარებლები
              </h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              {blockedUsersProfiles.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <UserX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>არავინ არ გყავს დაიგნორებული</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsersProfiles.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unignoreUser(user.user_id)}
                        className="text-xs"
                      >
                        იგნორის მოხსნა
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={deleteMessage}
        title="შეტყობინების წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ამ შეტყობინების წაშლა?"
      />

      <DeleteConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={clearAllMessages}
        title="ჩატის გასუფთავება"
        description="დარწმუნებული ხართ? ჩატი გასუფთავდება ყველასთვის! ეს მოქმედება შეუქცევადია."
      />

      <ChatImageViewer 
        imageUrl={fullscreenImage} 
        onClose={() => setFullscreenImage(null)} 
      />
    </div>
  );
});

GroupChatView.displayName = 'GroupChatView';

export default GroupChatView;
