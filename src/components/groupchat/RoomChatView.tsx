import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { ArrowLeft, MoreVertical, Trash2, Ban, VolumeX, Shield, X, Home, Reply, AtSign, UserX, Bell, Lock, Pencil, RefreshCw, Palette, Pin } from 'lucide-react';
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
import DJPlaylist from './DJPlaylist';
import OnlineUsersStrip from './OnlineUsersStrip';
import MessagesPaginated from './MessagesPaginated';
import EditContentPreview, { removeGifFromContent, getTextWithoutGifs, extractGifUrls, buildContentWithGifs } from '@/components/shared/EditContentPreview';
import { canIgnore } from '@/utils/rbacUtils';
import PinnedMessage from './PinnedMessage';
import GossipLeaderboard from './GossipLeaderboard';
import ThreadView from './ThreadView';
import AnonymousToggle from './AnonymousToggle';

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
  is_pinned?: boolean;
  pinned_by?: string | null;
  pinned_at?: string | null;
  is_anonymous?: boolean;
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

export type RoomType = 'gossip' | 'night' | 'emigrants' | 'dj';

interface RoomConfig {
  messagesTable: string;
  presenceTable: string;
  title: string;
  chatColorKey: string;
}

const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  gossip: {
    messagesTable: 'group_chat_messages',
    presenceTable: 'group_chat_presence',
    title: 'ჭორბიურო',
    chatColorKey: 'gossip'
  },
  night: {
    messagesTable: 'night_room_messages',
    presenceTable: 'night_room_presence',
    title: 'ღამის ოთახი',
    chatColorKey: 'night'
  },
  emigrants: {
    messagesTable: 'emigrants_room_messages',
    presenceTable: 'emigrants_room_presence',
    title: 'ემიგრანტების ოთახი',
    chatColorKey: 'emigrants'
  },
  dj: {
    messagesTable: 'dj_room_messages',
    presenceTable: 'dj_room_presence',
    title: 'DJ Room',
    chatColorKey: 'dj'
  }
};

interface RoomChatViewProps {
  roomType: RoomType;
  onBack: () => void;
  onNavigateToProfile?: (userId: string) => void;
  highlightMessageId?: string | null;
  replyToUsername?: string | null;
  replyTrigger?: number;
}

const MESSAGES_PER_PAGE = 30;

const RoomChatView = memo(({ roomType, onBack, onNavigateToProfile, highlightMessageId, replyToUsername, replyTrigger }: RoomChatViewProps) => {
  const config = ROOM_CONFIGS[roomType];
  
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
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [ownUserRole, setOwnUserRole] = useState<string | null>(null);
  const [addTopicCallback, setAddTopicCallback] = useState<(() => void) | null>(null);
  const [editTopicCallback, setEditTopicCallback] = useState<(() => void) | null>(null);
  const [deleteTopicCallback, setDeleteTopicCallback] = useState<(() => void) | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  
  const gracePeriodSeconds = 60;

  const composerRef = useRef<GroupChatComposerHandle>(null);
  const lastSeenUpdateRef = useRef<string | null>(null);
  const { toast } = useToast();
  const { session, profile } = useAuth();
  const { upload: s3Upload } = useS3Upload({ folder: S3_FOLDERS.CHAT_IMAGES });
  const { chatColor, setChatColor } = useChatColor(config.chatColorKey);
  
  const fetchRoomPresence = useCallback(async () => {
    const cutoffTime = new Date(Date.now() - 120 * 1000).toISOString(); // 120 seconds (2 min grace)
    
    const { data: presenceData } = await supabase
      .from(config.presenceTable as any)
      .select('user_id, last_active_at')
      .gt('last_active_at', cutoffTime)
      .order('last_active_at', { ascending: false });
    
    if (!presenceData || presenceData.length === 0) {
      setOnlineUsers([]);
      return;
    }
    
    const userIds = presenceData.map((p: any) => p.user_id);
    
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
    
    const invisibleSet = new Set(invisibleResult.data?.map(u => u.user_id) || []);
    
    if (profilesResult.data) {
      const profileMap = new Map(profilesResult.data.map(p => [p.user_id, p]));
      const users = presenceData
        .filter((p: any) => !invisibleSet.has(p.user_id) || isOnlineVisibleExempt(p.user_id))
        .map((p: any) => {
          const profileData = profileMap.get(p.user_id);
          return profileData ? {
            user_id: p.user_id,
            username: profileData.username,
            avatar_url: profileData.avatar_url,
            last_seen: p.last_active_at
          } : null;
        })
        .filter((u: any): u is OnlineUser => u !== null);
      
      setOnlineUsers(users);
    }
  }, [config.presenceTable]);
  
  const updateRoomPresence = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const now = new Date().toISOString();
    
    await supabase
      .from(config.presenceTable as any)
      .upsert({
        user_id: session.user.id,
        last_active_at: now
      }, { onConflict: 'user_id' });
  }, [session?.user?.id, config.presenceTable]);
  
  const cleanupRoomPresence = useCallback(async () => {
    if (!session?.user?.id) return;
    
    await supabase
      .from(config.presenceTable as any)
      .delete()
      .eq('user_id', session.user.id);
  }, [session?.user?.id, config.presenceTable]);

  const totalPages = useMemo(() => {
    const filteredCount = messages.filter(message => {
      if (isSuperAdmin) {
        return true;
      }
      
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

  const fetchAllProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, last_seen, online_visible_until')
      .order('username');
    
    if (data) setAllProfiles(data);
  }, []);

  const fetchIgnoredUsers = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const { data: myBlocks } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', session.user.id);
    
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
    
    const role = data?.role || 'user';
    setOwnUserRole(role);
    setIsAdmin(role === 'admin' || role === 'super_admin' || role === 'moderator');
    setIsSuperAdmin(role === 'super_admin');
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
      .eq('room_type', roomType)
      .maybeSingle();
    
    if (data?.cleared_at) {
      setClearedAt(data.cleared_at);
    }
  }, [session?.user?.id, roomType]);

  const fetchPinnedMessage = useCallback(async () => {
    if (roomType !== 'gossip') return;
    const { data } = await supabase
      .from('group_chat_messages')
      .select('id, content, image_url, pinned_at, pinned_by, user_id')
      .eq('is_pinned', true)
      .eq('is_deleted', false)
      .order('pinned_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) { setPinnedMessage(null); return; }
    const { data: prof } = await supabase.from('profiles').select('username, avatar_url').eq('user_id', data.user_id).maybeSingle();
    setPinnedMessage({ ...data, profile: prof || { username: 'Unknown', avatar_url: null } });
  }, [roomType]);

  const pinMessage = useCallback(async (messageId: string) => {
    if (!session?.user?.id || !isAdmin) return;
    await supabase.from('group_chat_messages').update({ is_pinned: false, pinned_by: null, pinned_at: null }).eq('is_pinned', true);
    await supabase.from('group_chat_messages').update({ is_pinned: true, pinned_by: session.user.id, pinned_at: new Date().toISOString() }).eq('id', messageId);
    toast({ title: 'შეტყობინება ჩამაგრდა 📌' });
    fetchPinnedMessage();
  }, [session?.user?.id, isAdmin, toast, fetchPinnedMessage]);

  const unpinMessage = useCallback(async (messageId: string) => {
    if (!session?.user?.id || !isAdmin) return;
    await supabase.from('group_chat_messages').update({ is_pinned: false, pinned_by: null, pinned_at: null }).eq('id', messageId);
    setPinnedMessage(null);
    toast({ title: 'ჩამაგრება მოიხსნა' });
  }, [session?.user?.id, isAdmin, toast]);

  const fetchMessages = useCallback(async () => {
    try {
      let query = supabase
        .from(config.messagesTable as any)
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .order('created_at', { ascending: false })
        .limit(300);
      
      // Filter out messages before cleared_at timestamp
      if (clearedAt) {
        query = query.gt('created_at', clearedAt);
      }
      
      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) throw messagesError;
      
      const userIds = [...new Set((messagesData as any[])?.map(m => m.user_id) || [])];
      const privateToUserIds = [...new Set((messagesData as any[])?.filter(m => m.private_to_user_id).map(m => m.private_to_user_id) || [])];
      const allUserIds = [...new Set([...userIds, ...privateToUserIds])];
      
      const profilesMap = new Map<string, any>();
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, last_seen')
          .in('user_id', allUserIds);
        
        profilesData?.forEach(p => profilesMap.set(p.user_id, p));
      }
      
      const messagesMap = new Map<string, any>();
      (messagesData as any[])?.forEach(msg => {
        messagesMap.set(msg.id, {
          ...msg,
          profile: profilesMap.get(msg.user_id) || { username: 'Unknown', avatar_url: null, last_seen: null }
        });
      });
      
      const transformedMessages = ((messagesData as any[]) || []).map(msg => ({
        ...msg,
        profile: profilesMap.get(msg.user_id) || { username: 'Unknown', avatar_url: null, last_seen: null },
        reply_to: msg.reply_to_id ? messagesMap.get(msg.reply_to_id) || null : null,
        private_to_profile: msg.private_to_user_id ? profilesMap.get(msg.private_to_user_id) || { username: 'Unknown' } : null
      }));
      
      setMessages(transformedMessages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [config.messagesTable, clearedAt]);

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
    // First fetch cleared_at, then fetch messages
    const init = async () => {
      await fetchClearedAt();
    };
    init();
  }, [fetchClearedAt]);

  useEffect(() => {
    Promise.all([
      fetchMessages(),
      checkAdminStatus(),
      fetchUserStatuses(),
      fetchIgnoredUsers(),
      fetchAllProfiles(),
      fetchRoomPresence(),
      fetchPinnedMessage()
    ]);
    
    updateRoomPresence();
    
    const lastSeenInterval = setInterval(updateLastSeen, 30000);
    const presenceInterval = setInterval(() => {
      updateRoomPresence();
      fetchRoomPresence();
    }, 30000);

    // Create unique channel name with timestamp to avoid duplicates
    const channelName = `${config.messagesTable}-updates-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: config.messagesTable
        },
        async (payload) => {
          const newMessage = payload.new as any;
          // Don't add if it's our own message (already added locally)
          if (newMessage.user_id === session?.user?.id) return;
          
          // Fetch profile for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url, last_seen')
            .eq('user_id', newMessage.user_id)
            .maybeSingle();
          
          // Fetch GIF if exists
          let gifData = null;
          if (newMessage.gif_id) {
            const { data: gif } = await supabase
              .from('gifs')
              .select('id, file_original, file_preview, title')
              .eq('id', newMessage.gif_id)
              .maybeSingle();
            gifData = gif;
          }
          
          // Fetch reply_to if exists
          let replyToData = null;
          if (newMessage.reply_to_id) {
            const { data: replyMsg } = await supabase
              .from(config.messagesTable as any)
              .select('id, content, user_id')
              .eq('id', newMessage.reply_to_id)
              .maybeSingle();
            
            if (replyMsg) {
              const replyMsgData = replyMsg as unknown as { id: string; content: string | null; user_id: string };
              const { data: replyProfile } = await supabase
                .from('profiles')
                .select('username, avatar_url, last_seen')
                .eq('user_id', replyMsgData.user_id)
                .maybeSingle();
              
              replyToData = {
                id: replyMsgData.id,
                content: replyMsgData.content,
                user_id: replyMsgData.user_id,
                profile: replyProfile || { username: 'Unknown', avatar_url: null, last_seen: null }
              } as any;
            }
          }
          
          const fullMessage: Message = {
            ...newMessage,
            profile: profileData || { username: 'Unknown', avatar_url: null, last_seen: null },
            gif: gifData,
            reply_to: replyToData,
            private_to_profile: null
          };
          
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m.id === fullMessage.id)) return prev;
            const updated = [fullMessage, ...prev];
            return updated.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: config.messagesTable
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
          table: config.messagesTable
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages(prev => prev.filter(msg => msg.id !== deletedId));
        }
      )
      .subscribe((status) => {
        console.log(`[${config.messagesTable}] Realtime subscription status:`, status);
      });

    return () => {
      clearInterval(lastSeenInterval);
      clearInterval(presenceInterval);
      cleanupRoomPresence();
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, config.messagesTable, roomType]);

  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
      setHighlightedId(highlightMessageId);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, [highlightMessageId, messages]);

  useEffect(() => {
    if (replyToUsername && !loading) {
      const timer = setTimeout(() => {
        if (composerRef.current) {
          composerRef.current.insertMention(replyToUsername);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [replyToUsername, replyTrigger, loading]);

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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const cancelImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!session?.user?.id) return null;
    const result = await s3Upload(file, S3_FOLDERS.CHAT_IMAGES);
    return result?.url || null;
  };

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
      
      const allShortcodes = extractAllGifShortcodes(message.trim());
      let processedContent = message.trim();
      const validGifs: { id: string; file_original: string; file_preview?: string | null; title: string; shortcode: string }[] = [];
      
      for (const shortcode of allShortcodes) {
        const gif = await findGifByShortcode(shortcode);
        if (gif) {
          validGifs.push({ ...gif, shortcode });
          await recordGifUsage(gif.id, session.user.id);
          processedContent = processedContent.replace(shortcode, `[GIF:${gif.file_original}]`);
        }
      }
      
      const firstGifId = validGifs.length > 0 ? validGifs[0].id : null;
      
      const { data: insertedMessage, error } = await supabase
        .from(config.messagesTable as any)
        .insert({
          user_id: session.user.id,
          content: processedContent || null,
          image_url: imageUrl,
          gif_id: firstGifId,
          reply_to_id: replyingTo?.id || null,
          is_private: isPrivate,
          private_to_user_id: isPrivate && mention ? mention.user_id : null,
          is_anonymous: isAnonymousMode && roomType === 'gossip'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (insertedMessage) {
        const newMsg: Message = {
          ...(insertedMessage as any),
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
        
        setMessages(prev => {
          const updated = [newMsg, ...prev.filter(m => m.id !== newMsg.id)];
          return updated.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        setCurrentPage(1);
      }
      
      // Notifications for all chat rooms (gossip, dj, emigrants)
      const roomName = config.title;
      
      if (replyingTo && replyingTo.user_id !== session.user.id && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: replyingTo.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_reply',
          post_id: replyingTo.id,
          message: `${(insertedMessage as any).id}|${processedContent || (firstGifId ? 'GIF' : '')}`,
          content: roomName,
          related_type: roomType
        });
      }
      
      if (isPrivate && mention && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: mention.user_id,
          from_user_id: session.user.id,
          type: 'private_group_message',
          message: `${(insertedMessage as any).id}|${processedContent || (firstGifId ? 'GIF' : '')}`,
          content: roomName,
          related_type: roomType
        });
      }
      
      if (!isPrivate && mention && mention.user_id !== session.user.id && insertedMessage) {
        await supabase.from('notifications').insert({
          user_id: mention.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_mention',
          message: `${(insertedMessage as any).id}|${processedContent || (firstGifId ? 'GIF' : '')}`,
          content: roomName,
          related_type: roomType
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
  }, [session?.user?.id, myStatus, replyingTo, toast, updateLastSeen, selectedImage, profile, config.messagesTable, roomType, isAnonymousMode]);

  const handleSendGif = useCallback(async (gif: any) => {
    const { isMuted, isBanned } = getEffectiveMuteBan(myStatus);
    if (!session?.user?.id || isBanned || isMuted) return;
    
    setSending(true);
    try {
      const { data: insertedMessage, error } = await supabase
        .from(config.messagesTable as any)
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
          ...(insertedMessage as any),
          profile: {
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            last_seen: new Date().toISOString()
          },
          reply_to: replyingTo || null,
          private_to_profile: null
        };
        
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
  }, [session?.user?.id, myStatus, replyingTo, profile, config.messagesTable]);

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
        .from(config.messagesTable as any)
        .insert({
          user_id: session.user.id,
          video_url: videoUrl
        });
      
      if (error) throw error;
      
      setShowVideoUpload(false);
      fetchMessages();
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
      const roomName = config.title;
      
      const { data: insertedMessage, error } = await (supabase
        .from(config.messagesTable as any)
        .insert({
          user_id: session.user.id,
          content: '🎤 ხმოვანი შეტყობინება',
          image_url: audioUrl,
          reply_to_id: voiceReplyingTo?.id || null,
          private_to_user_id: isPrivate && voiceMention ? voiceMention.user_id : null
        }) as any)
        .select('id')
        .single();
      
      if (error) throw error;
      const messageId = insertedMessage?.id;

      // Send notifications for voice messages
      if (voiceReplyingTo && voiceReplyingTo.user_id !== session.user.id && messageId) {
        await supabase.from('notifications').insert({
          user_id: voiceReplyingTo.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_reply',
          post_id: voiceReplyingTo.id,
          message: `${messageId}|🎤 ხმოვანი შეტყობინება`,
          content: roomName,
          related_type: roomType
        });
      }
      
      if (isPrivate && voiceMention && messageId) {
        await supabase.from('notifications').insert({
          user_id: voiceMention.user_id,
          from_user_id: session.user.id,
          type: 'private_group_message',
          message: `${messageId}|🎤 ხმოვანი შეტყობინება`,
          content: roomName,
          related_type: roomType
        });
      }
      
      if (!isPrivate && voiceMention && voiceMention.user_id !== session.user.id && messageId) {
        await supabase.from('notifications').insert({
          user_id: voiceMention.user_id,
          from_user_id: session.user.id,
          type: 'group_chat_mention',
          message: `${messageId}|🎤 ხმოვანი შეტყობინება`,
          content: roomName,
          related_type: roomType
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
  }, [session?.user?.id, myStatus, fetchMessages, config.messagesTable, config.title, roomType]);

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
    
    const canEdit = editingMessage.user_id === session.user.id || isSuperAdmin;
    if (!canEdit) return;
    
    // Rebuild content with text and GIFs
    const finalContent = buildContentWithGifs(editContent, editGifUrls);
    
    try {
      const { error } = await supabase
        .from(config.messagesTable as any)
        .update({ content: finalContent || null })
        .eq('id', editingMessage.id);
      
      if (error) throw error;
      
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage.id 
          ? { ...msg, content: finalContent || null }
          : msg
      ));
      
      toast({ title: 'შეტყობინება შეიცვალა' });
      cancelEditing();
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

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
      const { error } = await supabase
        .from(config.messagesTable as any)
        .update({ is_deleted: true, content: null, image_url: null, video_url: null, gif_id: null })
        .eq('id', messageToDelete.id);
      
      if (error) throw error;
      
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

  // Get target user's role for RBAC check
  const getTargetUserRole = async (userId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    return data?.role || null;
  };

  const ignoreUser = async (userId: string) => {
    if (!session?.user?.id) return;
    
    try {
      // RBAC: Get target user's role and check if ignore is allowed
      const targetRole = await getTargetUserRole(userId);
      
      if (!canIgnore(ownUserRole, targetRole)) {
        // RBAC: Silently reject - don't reveal role information to user
        console.log('[RBAC] Ignore action blocked: viewer role', ownUserRole, 'cannot ignore target role', targetRole);
        return;
      }
      
      const { error: insertError } = await supabase
        .from('user_blocks')
        .insert({ blocker_id: session.user.id, blocked_id: userId });
      
      if (insertError) {
        console.error('Error inserting block:', insertError);
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
      const { data: existing } = await supabase
        .from('user_chat_status')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('user_chat_status')
          .update({
            is_muted: true,
            muted_by: session?.user?.id,
            muted_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_chat_status')
          .insert({
            user_id: userId,
            is_muted: true,
            muted_by: session?.user?.id,
            muted_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          });
        error = result.error;
      }

      if (error) {
        console.error('Error muting user:', error);
        toast({ title: 'შეცდომა', description: 'დადუმება ვერ მოხერხდა', variant: 'destructive' });
        return;
      }
      
      toast({ title: 'მომხმარებელი დადუმდა 24 საათით' });
      fetchUserStatuses();
    } catch (error) {
      console.error('Error muting user:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const banUser = async (userId: string) => {
    try {
      const { data: existing } = await supabase
        .from('user_chat_status')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('user_chat_status')
          .update({
            is_banned: true,
            banned_by: session?.user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_chat_status')
          .insert({
            user_id: userId,
            is_banned: true,
            banned_by: session?.user?.id,
            updated_at: new Date().toISOString()
          });
        error = result.error;
      }

      if (error) {
        console.error('Error banning user:', error);
        toast({ title: 'შეცდომა', description: 'დაბლოკვა ვერ მოხერხდა', variant: 'destructive' });
        return;
      }
      
      toast({ title: 'მომხმარებელი დაიბლოკა' });
      fetchUserStatuses();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Site-wide ban for admins
  const siteBanUser = async (userId: string) => {
    if (!session?.user?.id || !isSuperAdmin) return;
    
    try {
      // Insert into site_bans table
      const { error } = await supabase
        .from('site_bans')
        .insert({
          user_id: userId,
          block_type: 'USER',
          reason: 'დაბლოკვა ჯგუფური ჩატიდან',
          banned_by: session.user.id,
          status: 'ACTIVE'
        });

      if (error) throw error;
      
      toast({ title: 'მომხმარებელი დაიბლოკა მთელ საიტზე' });
    } catch (error) {
      console.error('Error site banning user:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const clearAllMessages = async () => {
    if (!session?.user?.id || !isAdmin) return;
    
    try {
      toast({ title: 'მიმდინარეობს გასუფთავება...' });
      
      // Use edge function to delete (has longer timeout and uses service role)
      const { data, error } = await supabase.functions.invoke('admin-clear-room', {
        body: { room_table: config.messagesTable }
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
    const container = document.querySelector('.room-chat-container');
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

  const { isBanned: isEffectivelyBanned } = getEffectiveMuteBan(myStatus);
  if (isEffectivelyBanned) {
    return (
      <div className="flex flex-col items-center justify-center bg-background p-6 min-h-[50vh]">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8 text-center max-w-md">
          <Ban className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold text-destructive mb-2">წვდომა აკრძალულია</h2>
          <p className="text-muted-foreground mb-6">
            თქვენ აკრძალული გაქვთ ამ ოთახში შესვლა.
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
      className="room-chat-container fixed inset-0 lg:static lg:inset-auto lg:h-full flex flex-col bg-background z-[55] lg:z-auto"
      style={{ 
        touchAction: 'pan-y', 
        overscrollBehaviorX: 'none',
        paddingTop: 'var(--safe-top, env(safe-area-inset-top, 0px))',
        paddingBottom: 'var(--safe-bottom, env(safe-area-inset-bottom, 0px))',
        height: '100dvh',
        boxSizing: 'border-box',
      }}
    >
      {/* Header - Only for non-gossip rooms */}
      {roomType !== 'gossip' && (
        <div className="flex-none h-12 border-b border-border bg-card">
          <div className="flex items-center justify-between px-2 sm:px-3 h-full w-full">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={onBack}>
                <Home className="w-4 h-4" />
              </Button>
              <h2 className="font-semibold text-base">{config.title}</h2>
            </div>
            
            <div className="flex items-center gap-1">
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 relative"
                onClick={() => setShowBlockedList(true)}
              >
                <UserX className="w-4 h-4" />
                {ignoredUsers.size > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {ignoredUsers.size}
                  </span>
                )}
              </Button>
              
              <ChatColorPicker 
                onColorChange={setChatColor} 
                currentColor={chatColor} 
              />
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Shield className="w-4 h-4 text-primary" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={clearAllMessages} className="text-destructive text-sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      ჩატის გასუფთავება
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div 
        className={`${roomType === 'gossip' ? 'flex-1 min-h-0 lg:h-full' : 'h-[calc(100dvh-48px)] lg:h-full'} overflow-y-auto overflow-x-hidden`}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          ...(chatColor ? getChatBackgroundStyle(chatColor) : {})
        }}
      >
        {/* Daily Topic - only for gossip room */}
        {roomType === 'gossip' && (
          <DailyTopic 
            isSuperAdmin={isSuperAdmin} 
            userId={session?.user?.id}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              Promise.all([fetchMessages(), fetchRoomPresence()]).finally(() => setRefreshing(false));
            }}
            ignoredCount={ignoredUsers.size}
            onShowIgnoreList={() => setShowBlockedList(true)}
            chatColor={chatColor}
            onColorChange={setChatColor}
            onStartAddTopic={(callback) => setAddTopicCallback(() => callback)}
            onStartEditTopic={(callback) => setEditTopicCallback(() => callback)}
            onDeleteTopicRequest={(callback) => setDeleteTopicCallback(() => callback)}
          />
        )}

        {/* Pinned Message - gossip only */}
        {roomType === 'gossip' && pinnedMessage && (
          <PinnedMessage
            message={pinnedMessage}
            isAdmin={isAdmin}
            onUnpin={unpinMessage}
            onScrollTo={(id) => {
              const el = document.querySelector(`[data-message-id="${id}"]`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        )}

        {/* Leaderboard - gossip only */}
        {roomType === 'gossip' && (
          <GossipLeaderboard onNavigateToProfile={onNavigateToProfile} currentUserId={session?.user?.id} />
        )}

        {/* Message Composer - between leaderboard and online users */}
        <div className={`border-t border-b border-border/50 w-full ${chatColor ? 'bg-black/10' : 'bg-card/50'}`}>
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
            isAnonymous={isAnonymousMode}
            onAnonymousToggle={setIsAnonymousMode}
            showAnonymousToggle={roomType === 'gossip'}
            onSend={handleComposerSend}
            onImageSelect={handleComposerImageSelect}
            onVideoClick={handleVideoClick}
            onVoiceSend={handleSendVoice}
            onGifSelect={handleSendGif}
            onCancelReply={handleCancelReply}
            onRefresh={() => {
              setRefreshing(true);
              Promise.all([fetchMessages(), fetchRoomPresence()]).finally(() => setRefreshing(false));
            }}
            refreshing={refreshing}
          />
        </div>

        {/* Online Users Strip */}
        <OnlineUsersStrip users={onlineUsers} onMention={handleMentionFromOnlineList} />
        
        {/* DJ Playlist - only for dj room */}
        {roomType === 'dj' && (
          <DJPlaylist isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} userId={session?.user?.id} />
        )}

        {/* Messages List */}
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
          roomType={roomType}
          roomName={config.title}
          onReply={setReplyingTo}
          onDelete={openDeleteConfirm}
          onIgnore={ignoreUser}
          onUnignore={unignoreUser}
          onMute={muteUser}
          onBan={banUser}
          onSiteBan={isSuperAdmin ? siteBanUser : undefined}
          onEdit={startEditing}
          onNavigateToProfile={onNavigateToProfile}
          onNicknameClick={handleMentionFromOnlineList}
          onImageClick={setFullscreenImage}
          onPrivateMessage={handlePrivateMessage}
          onPin={roomType === 'gossip' && isAdmin ? pinMessage : undefined}
          onThread={undefined}
          highlightedId={highlightedId}
          userStatuses={userStatuses}
          chatBackgroundColor={chatColor}
          onClearRoom={isAdmin && roomType === 'gossip' ? handleClearRoomClick : undefined}
          onAddTopic={isSuperAdmin && roomType === 'gossip' ? addTopicCallback : undefined}
          onShowIgnoreList={roomType === 'gossip' ? () => setShowBlockedList(true) : undefined}
          ignoredCount={ignoredUsers.size}
          onColorChange={roomType === 'gossip' ? setChatColor : undefined}
          chatColor={chatColor}
          onEditTopic={isSuperAdmin && roomType === 'gossip' ? editTopicCallback ?? undefined : undefined}
          onDeleteTopic={isSuperAdmin && roomType === 'gossip' ? deleteTopicCallback ?? undefined : undefined}
        />
      </div>



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

      {/* Thread View */}
      {threadMessage && session?.user?.id && (
        <ThreadView
          parentMessage={threadMessage}
          roomType={roomType}
          currentUserId={session.user.id}
          currentUsername={profile?.username || ''}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setThreadMessage(null)}
          onNavigateToProfile={onNavigateToProfile}
        />
      )}
    </div>
  );
});

RoomChatView.displayName = 'RoomChatView';

export default RoomChatView;
