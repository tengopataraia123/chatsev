import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Phone, Video as VideoIcon, ArrowLeft, Search, Plus, Loader2, Image as ImageIcon, X, Smile, Home, Check, CheckCheck, Trash2, Bell, BellOff, Reply, Maximize2, Eraser, Film, Pencil, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOnlineGracePeriod, isUserOnlineByLastSeen } from '@/hooks/useOnlineStatus';
import GifPicker from '@/components/gif/GifPicker';
import EmojiPicker from '@/components/groupchat/EmojiPicker';
import { UniversalReactionButton } from '@/components/reactions';
import VoiceRecorder from '@/components/voice/VoiceRecorder';
import VideoEmbed, { extractVideoUrl, removeVideoUrl } from '@/components/shared/VideoEmbed';
import StyledUsername from '@/components/username/StyledUsername';
import ChatVideoUpload from './ChatVideoUpload';
import ChatVideoMessage from './ChatVideoMessage';
import ChatImageViewer from './ChatImageViewer';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { extractGifShortcode, extractGifShortcodeFromText, findGifByShortcode, recordGifUsage } from '@/lib/gifShortcodes';
import SystemChat from './SystemChat';
import { Badge } from '@/components/ui/badge';
import EditContentPreview, { getTextWithoutGifs, extractGifUrls, buildContentWithGifs } from '@/components/shared/EditContentPreview';
import LinkifyText from '@/components/shared/LinkifyText';

interface Conversation {
  id: string;
  other_user: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    last_seen: string | null;
    online_visible_until: string | null;
  };
  last_message: string | null;
  last_message_time: string;
  unread_count: number;
}

interface PrivateMessage {
  id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  gif_id: string | null;
  is_read: boolean;
  created_at: string;
  edited_at: string | null;
  reply_to_id: string | null;
  is_deleted?: boolean;
  deleted_for_sender?: boolean;
  deleted_for_receiver?: boolean;
  gif?: {
    id: string;
    file_original: string;
    file_preview: string | null;
    title: string;
  } | null;
  reply_to?: {
    id: string;
    content: string | null;
    sender_id: string;
  } | null;
}

interface ChatViewProps {
  onBack?: () => void;
  onNavigateToProfile?: (userId: string) => void;
  initialUserId?: string | null;
}

const ChatView = ({ onBack, onNavigateToProfile, initialUserId }: ChatViewProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [replyingTo, setReplyingTo] = useState<PrivateMessage | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showDeleteConversationDialog, setShowDeleteConversationDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [showDeleteMessageDialog, setShowDeleteMessageDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; senderId: string } | null>(null);
  const [deleteType, setDeleteType] = useState<'forMe' | 'forEveryone' | null>(null);
  const [showClearMessagesDialog, setShowClearMessagesDialog] = useState(false);
  const [showDeleteAllConversationsDialog, setShowDeleteAllConversationsDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [editingMessage, setEditingMessage] = useState<PrivateMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [editGifUrls, setEditGifUrls] = useState<string[]>([]);
  const [showSystemChat, setShowSystemChat] = useState(false);
  const [systemUnreadCount, setSystemUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyNewMessage, permission, requestPermission } = usePushNotifications();
  const { gracePeriodMinutes } = useOnlineGracePeriod();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // First get deleted conversation IDs for this user
      const { data: deletedStates } = await supabase
        .from('conversation_user_state')
        .select('conversation_id')
        .eq('user_id', user.id)
        .eq('is_deleted', true);

      const deletedConvIds = new Set(deletedStates?.map(s => s.conversation_id) || []);

      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter out deleted conversations
      const filteredConvData = convData?.filter(c => !deletedConvIds.has(c.id)) || [];

      if (filteredConvData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const otherUserIds = filteredConvData.map(c => 
        c.user1_id === user.id ? c.user2_id : c.user1_id
      );

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, last_seen, online_visible_until')
        .in('user_id', otherUserIds);

      const profilesMap = new Map<string, any>();
      profilesData?.forEach(p => profilesMap.set(p.user_id, p));

      const convIds = filteredConvData.map(c => c.id);
      const { data: lastMessagesData } = await supabase
        .from('private_messages')
        .select('conversation_id, content, created_at, is_read, sender_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      const lastMessageMap = new Map<string, any>();
      const unreadCountMap = new Map<string, number>();
      
      lastMessagesData?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
        if (!msg.is_read && msg.sender_id !== user.id) {
          unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) || 0) + 1);
        }
      });

      const transformedConversations: Conversation[] = filteredConvData.map(conv => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const profile = profilesMap.get(otherUserId);
        const lastMsg = lastMessageMap.get(conv.id);

        return {
          id: conv.id,
          other_user: {
            user_id: otherUserId,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            last_seen: profile?.last_seen || null,
            online_visible_until: profile?.online_visible_until || null,
          },
          last_message: lastMsg?.content || null,
          last_message_time: lastMsg?.created_at || conv.updated_at,
          unread_count: unreadCountMap.get(conv.id) || 0,
        };
      });

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch reply info and filter deleted messages
      const messagesWithReplies = await Promise.all(
        (data || []).map(async (msg) => {
          if (msg.reply_to_id) {
            const { data: replyData } = await supabase
              .from('private_messages')
              .select('id, content, sender_id')
              .eq('id', msg.reply_to_id)
              .single();
            return { ...msg, reply_to: replyData };
          }
          return msg;
        })
      );
      
      // Filter out messages deleted for current user
      const filteredMessages = messagesWithReplies.filter(msg => {
        if (msg.sender_id === user.id && msg.deleted_for_sender) return false;
        if (msg.sender_id !== user.id && msg.deleted_for_receiver) return false;
        return true;
      });
      
      setMessages(filteredMessages);

      if (user) {
        await supabase
          .from('private_messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [user]);

  const checkAdminStatus = useCallback(async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setIsAdmin(data?.role === 'admin' || data?.role === 'moderator');
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
    checkAdminStatus();
    fetchSystemUnreadCount();
  }, [fetchConversations, checkAdminStatus]);

  // Fetch unread system messages count
  const fetchSystemUnreadCount = async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('system_broadcast_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('delivery_status', 'sent')
        .is('seen_at', null);
      setSystemUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching system unread count:', error);
    }
  };

  // Auto-start conversation if initialUserId is provided
  useEffect(() => {
    if (initialUserId && user && !loading) {
      startConversation(initialUserId);
    }
  }, [initialUserId, user, loading]);

  useEffect(() => {
    if (!selectedConversation) return;

    fetchMessages(selectedConversation.id);

    const channel = supabase
      .channel(`conversation-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'private_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        async (payload) => {
          const newMessage = payload.new as PrivateMessage;
          
          // Fetch GIF data if message has gif_id
          let gifData = null;
          if (newMessage.gif_id) {
            const { data } = await supabase
              .from('gifs')
              .select('id, file_original, file_preview, title')
              .eq('id', newMessage.gif_id)
              .single();
            gifData = data;
          }
          
          setMessages(prev => [...prev, { ...newMessage, gif: gifData }]);
          
          // Send push notification if message is from other user
          if (newMessage.sender_id !== user?.id && notificationsEnabled) {
            notifyNewMessage(
              selectedConversation.other_user.username,
              newMessage.content || (newMessage.gif_id ? '🎬 GIF' : '📷 სურათი')
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, fetchMessages, user, notificationsEnabled, notifyNewMessage]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'შეცდომა',
          description: 'სურათის ზომა არ უნდა აღემატებოდეს 5MB-ს',
          variant: 'destructive'
        });
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const cancelImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  const handleSendMessage = async (gifId?: string) => {
    if ((!messageText.trim() && !gifId && !selectedImage) || !user || !selectedConversation) return;

    setSendingMessage(true);
    try {
      let finalGifId = gifId;
      let messageContent = messageText.trim();
      
      // Check if message contains a GIF shortcode (can be with other text)
      if (!gifId && messageContent) {
        // First check if entire message is a shortcode
        const fullShortcode = extractGifShortcode(messageContent);
        if (fullShortcode) {
          const gif = await findGifByShortcode(fullShortcode);
          if (gif) {
            finalGifId = gif.id;
            messageContent = ''; // Clear message as it was only a shortcode
            await recordGifUsage(gif.id, user.id);
          }
        } else {
          // Check for shortcode within text
          const extracted = extractGifShortcodeFromText(messageContent);
          if (extracted) {
            const gif = await findGifByShortcode(extracted.shortcode);
            if (gif) {
              finalGifId = gif.id;
              messageContent = extracted.textWithoutShortcode; // Keep remaining text
              await recordGifUsage(gif.id, user.id);
            }
          }
        }
      }
      
      let imageUrl: string | null = null;
      
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          throw new Error('Failed to upload image');
        }
      }

      const { error } = await supabase
        .from('private_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: messageContent || null,
          image_url: imageUrl,
          gif_id: finalGifId || null,
          reply_to_id: replyingTo?.id || null,
        });

      if (error) throw error;
      setMessageText('');
      cancelImage();
      setShowGifPicker(false);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendGif = async (gif: any) => {
    await handleSendMessage(gif.id);
  };

  const handleSendVoice = async (audioUrl: string) => {
    if (!user || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('private_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: '🎤 ხმოვანი შეტყობინება',
          image_url: audioUrl,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTyping = useCallback(() => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, []);

  const openDeleteMessageConfirm = (messageId: string, senderId: string) => {
    setMessageToDelete({ id: messageId, senderId });
    setDeleteType(null);
    setShowDeleteMessageDialog(true);
  };

  const handleDeleteMessage = async (type: 'forMe' | 'forEveryone') => {
    if (!user || !messageToDelete || !selectedConversation) return;
    
    const { id: messageId, senderId } = messageToDelete;
    
    try {
      if (type === 'forEveryone') {
        // Mark message as deleted for everyone
        const { error } = await supabase
          .from('private_messages')
          .update({ is_deleted: true })
          .eq('id', messageId);

        if (error) throw error;
        
        // Update local state to show "deleted" message
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, is_deleted: true } : m
        ));
        toast({ title: 'შეტყობინება წაიშალა ყველასთვის' });
      } else {
        // Delete only for current user
        const isSender = senderId === user.id;
        const otherUserId = selectedConversation.other_user.user_id;
        
        if (isSender) {
          // User is sender, mark deleted_for_sender
          const { error } = await supabase
            .from('private_messages')
            .update({ deleted_for_sender: true })
            .eq('id', messageId);

          if (error) throw error;
        } else {
          // User is receiver, mark deleted_for_receiver
          const { error } = await supabase
            .from('private_messages')
            .update({ deleted_for_receiver: true })
            .eq('id', messageId);

          if (error) throw error;
        }
        
        // Remove from local view
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast({ title: 'შეტყობინება წაიშალა შენთვის' });
      }
      
      setSelectedMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setShowDeleteMessageDialog(false);
      setMessageToDelete(null);
      setDeleteType(null);
    }
  };

  const handleStartEdit = (message: PrivateMessage) => {
    setEditingMessage(message);
    const content = message.content || '';
    setEditText(getTextWithoutGifs(content));
    setEditGifUrls(extractGifUrls(content));
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
    setEditGifUrls([]);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !user) return;
    
    const finalContent = buildContentWithGifs(editText, editGifUrls);
    
    try {
      const { error } = await supabase
        .from('private_messages')
        .update({ 
          content: finalContent || null,
          edited_at: new Date().toISOString()
        })
        .eq('id', editingMessage.id)
        .eq('sender_id', user.id);

      if (error) throw error;
      
      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id 
          ? { ...m, content: finalContent || null, edited_at: new Date().toISOString() }
          : m
      ));
      
      setEditingMessage(null);
      setEditText('');
      setEditGifUrls([]);
      toast({ title: 'შეტყობინება განახლდა' });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDeleteConversation = async (conversation: Conversation) => {
    if (!user) return;
    
    try {
      // Use RPC function to delete conversation for user (soft delete)
      const { error } = await supabase.rpc('delete_conversation_for_user', {
        p_conversation_id: conversation.id
      });

      if (error) throw error;
      
      setConversations(prev => prev.filter(c => c.id !== conversation.id));
      setShowDeleteConversationDialog(false);
      setConversationToDelete(null);
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation(null);
      }
      toast({ title: 'მიმოწერა წაიშალა' });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleClearAllMessages = async () => {
    if (!user || !selectedConversation) return;
    
    try {
      // Use RPC function to clear messages for user (soft delete)
      const { error } = await supabase.rpc('clear_conversation_messages', {
        p_conversation_id: selectedConversation.id
      });

      if (error) throw error;
      
      setMessages([]);
      setShowClearMessagesDialog(false);
      toast({ title: 'ყველა შეტყობინება წაიშალა' });
    } catch (error) {
      console.error('Error clearing messages:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleDeleteAllConversations = async () => {
    if (!user) return;
    
    try {
      if (conversations.length === 0) {
        setShowDeleteAllConversationsDialog(false);
        return;
      }

      // Use RPC function to delete all conversations for user (soft delete)
      const { error } = await supabase.rpc('delete_all_conversations_for_user');

      if (error) throw error;
      
      setConversations([]);
      setShowDeleteAllConversationsDialog(false);
      toast({ title: 'ყველა მიმოწერა წაიშალა' });
    } catch (error) {
      console.error('Error deleting all conversations:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (granted) {
        setNotificationsEnabled(true);
      }
    } else {
      setNotificationsEnabled(!notificationsEnabled);
      toast({ 
        title: !notificationsEnabled ? 'ნოტიფიკაციები ჩართულია' : 'ნოტიფიკაციები გამორთულია'
      });
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const friendIds = new Set<string>();
    friendships?.forEach(f => {
      if (f.requester_id === user.id) {
        friendIds.add(f.addressee_id);
      } else {
        friendIds.add(f.requester_id);
      }
    });

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const isAdmin = roleData?.role === 'admin' || roleData?.role === 'moderator';

    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('user_id', user.id)
      .limit(20);

    const filtered = isAdmin ? data : data?.filter(u => friendIds.has(u.user_id));
    setSearchResults(filtered || []);
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    try {
      // Check privacy settings of the other user
      const { data: privacyData } = await supabase
        .from('privacy_settings')
        .select('message_permission')
        .eq('user_id', otherUserId)
        .maybeSingle();
      
      // Check if current user is admin/moderator
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Only super_admin can bypass message restrictions
      const isSuperAdminUser = roleData?.role === 'super_admin';
      
      const { isMessagingForcedOpen } = await import('@/lib/adminExemptions');
      if (privacyData && !isSuperAdminUser && !isMessagingForcedOpen(otherUserId)) {
        if (privacyData.message_permission === 'nobody') {
          toast({ 
            title: 'მომხმარებელთან მიწერა აკრძალულია', 
            description: 'ამ მომხმარებელმა დახურა შეტყობინებები ყველასთვის',
            variant: 'destructive' 
          });
          return;
        }
        
        if (privacyData.message_permission === 'friends') {
          // Check if they are friends
          const { data: friendshipData } = await supabase
            .from('friendships')
            .select('status')
            .or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`)
            .eq('status', 'accepted')
            .maybeSingle();
          
          if (!friendshipData) {
            toast({ 
              title: 'შეტყობინების გაგზავნა შეუძლებელია', 
              description: 'ამ მომხმარებელს მხოლოდ მეგობრებს შეუძლიათ მიწერონ',
              variant: 'destructive' 
            });
            return;
          }
        }
      }

      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (existingConv) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, last_seen, online_visible_until')
          .eq('user_id', otherUserId)
          .single();

        setSelectedConversation({
          id: existingConv.id,
          other_user: {
            user_id: otherUserId,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            last_seen: profile?.last_seen || null,
            online_visible_until: profile?.online_visible_until || null,
          },
          last_message: null,
          last_message_time: existingConv.updated_at,
          unread_count: 0,
        });
      } else {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            user1_id: user.id,
            user2_id: otherUserId,
          })
          .select()
          .single();

        if (error) throw error;

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, last_seen, online_visible_until')
          .eq('user_id', otherUserId)
          .single();

        setSelectedConversation({
          id: newConv.id,
          other_user: {
            user_id: otherUserId,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            last_seen: profile?.last_seen || null,
            online_visible_until: profile?.online_visible_until || null,
          },
          last_message: null,
          last_message_time: newConv.updated_at,
          unread_count: 0,
        });

        fetchConversations();
      }

      setShowUserSearch(false);
      setUserSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getTimeString = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'ახლა';
    if (diffMins < 60) return `${diffMins} წთ`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} სთ`;
    return date.toLocaleDateString('ka-GE');
  };

  const isOnline = (lastSeen: string | null, onlineVisibleUntil: string | null) => {
    if (onlineVisibleUntil && new Date(onlineVisibleUntil) > new Date()) {
      return true;
    }
    // Fallback to admin-configured grace period
    return isUserOnlineByLastSeen(lastSeen, gracePeriodMinutes);
  };

  // Show System Chat
  if (showSystemChat) {
    return (
      <SystemChat 
        onBack={() => {
          setShowSystemChat(false);
          setSystemUnreadCount(0);
        }} 
      />
    );
  }

  if (selectedConversation) {
    return (
      <div className="flex flex-col bg-background h-full overflow-hidden">
        {/* Chat Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedConversation(null)} className="p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => window.location.href = '/'} className="p-1 text-primary">
              <Home className="w-4 h-4" />
            </button>
            <div 
              className="relative cursor-pointer"
              onClick={() => {
                if (onNavigateToProfile) {
                  onNavigateToProfile(selectedConversation.other_user.user_id);
                }
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                {selectedConversation.other_user.avatar_url ? (
                  <img
                    src={selectedConversation.other_user.avatar_url}
                    alt={selectedConversation.other_user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-xs">
                    {selectedConversation.other_user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {isOnline(selectedConversation.other_user.last_seen, selectedConversation.other_user.online_visible_until) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[hsl(142,70%,45%)] rounded-full border-2 border-card"></span>
              )}
            </div>
            <div>
              <StyledUsername
                userId={selectedConversation.other_user.user_id}
                username={selectedConversation.other_user.username}
                className="font-medium text-sm cursor-pointer hover:underline"
                onClick={() => {
                  if (onNavigateToProfile) {
                    onNavigateToProfile(selectedConversation.other_user.user_id);
                  }
                }}
              />
              <span className="text-[10px] text-muted-foreground">
                {otherUserTyping ? 'წერს...' : isOnline(selectedConversation.other_user.last_seen, selectedConversation.other_user.online_visible_until) ? 'online' : 'offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={toggleNotifications}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              {notificationsEnabled ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <button 
              onClick={() => setShowClearMessagesDialog(true)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              title="შეტყობინებების გასუფთავება"
            >
              <Eraser className="w-5 h-5 text-orange-500" />
            </button>
            <button 
              onClick={() => {
                setConversationToDelete(selectedConversation);
                setShowDeleteConversationDialog(true);
              }}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              title="მიმოწერის წაშლა"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
            <button className="p-2 hover:bg-secondary rounded-full transition-colors opacity-50 cursor-not-allowed">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-secondary rounded-full transition-colors opacity-50 cursor-not-allowed">
              <VideoIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              დაწერეთ პირველი შეტყობინება
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'} group`}
              >
                <div className="flex flex-col max-w-[75%] relative">
                  {/* Reply preview if message is a reply */}
                  {message.reply_to && (
                    <div className={`text-[10px] mb-1 px-2 py-1 rounded bg-muted/50 border-l-2 border-primary ${message.sender_id === user?.id ? 'ml-auto' : 'mr-auto'}`}>
                      <span className="font-medium">
                        {message.reply_to.sender_id === user?.id ? 'შენ' : selectedConversation.other_user.username}
                      </span>
                      <p className="truncate opacity-70">{message.reply_to.content || '📷 მედია'}</p>
                    </div>
                  )}
                  
                  {/* Message options - Reply button for other user's messages */}
                  {message.sender_id !== user?.id && (
                    <div className={`absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button
                        onClick={() => setReplyingTo(message)}
                        className="p-1 hover:bg-secondary rounded-full"
                        title="პასუხი"
                      >
                        <Reply className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                  <div
                    className={`px-3 py-1.5 rounded-2xl ${
                      message.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-foreground rounded-bl-md'
                    } ${message.is_deleted ? 'opacity-60 italic' : ''}`}
                  >
                    {message.is_deleted ? (
                      <p className="text-sm">შეტყობინება წაიშალა</p>
                    ) : (
                      <>
                        {message.gif && (
                          <img 
                            src={message.gif.file_original} 
                            alt={message.gif.title || 'GIF'}
                            className="max-w-[150px] max-h-[150px] rounded-lg mb-1 object-contain pointer-events-none"
                          />
                        )}
                        {message.video_url && (
                          <ChatVideoMessage 
                            videoUrl={message.video_url} 
                            className="max-w-[280px] mb-1"
                          />
                        )}
                        {message.image_url && !message.content?.includes('🎤') && (
                          <div className="relative">
                            <img 
                              src={message.image_url} 
                              alt="" 
                              className="max-w-full rounded-lg mb-1 max-h-48 cursor-pointer"
                              onClick={() => setFullscreenImage(message.image_url)}
                            />
                            <button
                              onClick={() => setFullscreenImage(message.image_url)}
                              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                            >
                              <Maximize2 className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        )}
                        {message.image_url && message.content?.includes('🎤') && (
                          <audio controls src={message.image_url} className="max-w-full" />
                        )}
                        {/* Video Embed */}
                        {message.content && extractVideoUrl(message.content) && (
                          <VideoEmbed url={extractVideoUrl(message.content)!} className="mb-1 max-w-[280px]" />
                        )}
                        {message.content && !message.content.includes('🎤') && (
                          <p className="text-sm"><LinkifyText text={removeVideoUrl(message.content) || ''} /></p>
                        )}
                        {/* Show edited indicator */}
                        {message.edited_at && (
                          <span className={`text-[9px] italic ${message.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            (რედაქტირებული)
                          </span>
                        )}
                      </>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className={`text-[10px] ${message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {getTimeString(message.created_at)}
                      </span>
                      {message.sender_id === user?.id && (
                        message.is_read ? (
                          <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                        ) : (
                          <Check className="w-3 h-3 text-primary-foreground/70" />
                        )
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 mt-0.5 ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    {/* Reactions and Reply only for other user's messages */}
                    {message.sender_id !== user?.id && (
                      <>
                        <UniversalReactionButton 
                          targetType="private_message"
                          targetId={message.id}
                          contentOwnerId={message.sender_id}
                          size="sm"
                          showLabel={false}
                        />
                        <button
                          onClick={() => setReplyingTo(message)}
                          className="p-1 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
                          title="პასუხი"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {/* Edit and Delete buttons for own messages - side by side */}
                    {message.sender_id === user?.id && (
                      <>
                        <button
                          onClick={() => handleStartEdit(message)}
                          className="p-1 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
                          title="რედაქტირება"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteMessageConfirm(message.id, message.sender_id)}
                          className="p-1 hover:bg-secondary rounded-full text-muted-foreground hover:text-destructive transition-colors"
                          title="წაშლა"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {/* Admin can also delete */}
                    {isAdmin && message.sender_id !== user?.id && (
                      <button
                        onClick={() => openDeleteMessageConfirm(message.id, message.sender_id)}
                        className="p-1 hover:bg-secondary rounded-full text-muted-foreground hover:text-destructive transition-colors"
                        title="წაშლა (ადმინ)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="px-3 py-2 border-t border-border bg-card">
            <div className="relative inline-block">
              <img src={previewUrl} alt="Preview" className="max-h-24 rounded-lg" />
              <button
                onClick={cancelImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-3 py-2 border-t border-border bg-card flex items-center gap-2">
            <div className="flex-1 border-l-2 border-primary pl-2">
              <span className="text-xs font-medium text-primary">
                პასუხი: {replyingTo.sender_id === user?.id ? 'შენ' : selectedConversation.other_user.username}
              </span>
              <p className="text-xs text-muted-foreground truncate">
                {replyingTo.content || '📷 მედია'}
              </p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Edit Message UI */}
        {editingMessage && (
          <div className="px-3 py-2 border-t border-border bg-card">
            <div className="border-l-2 border-orange-500 pl-2">
              <span className="text-xs font-medium text-orange-500">რედაქტირება</span>
              {/* GIF Preview */}
              <EditContentPreview 
                gifUrls={editGifUrls} 
                onRemoveGif={(url) => setEditGifUrls(prev => prev.filter(u => u !== url))}
                className="mt-2"
              />
              <div className="flex items-end gap-2 mt-1">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 p-2 rounded-md border border-input bg-background text-sm resize-none min-h-[60px] max-h-[150px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                  autoFocus
                  onFocus={(e) => {
                    const val = e.target.value;
                    e.target.value = '';
                    e.target.value = val;
                  }}
                  onKeyDown={(e) => {
                    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                  }}
                />
                <button onClick={handleCancelEdit} className="p-1.5 hover:bg-secondary rounded-full">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() && editGifUrls.length === 0}
                  className="p-1.5 bg-primary rounded-full text-primary-foreground disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Input - Always at bottom */}
        <div className="flex-shrink-0 p-2 border-t border-border bg-card">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 hover:bg-secondary rounded-full transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowVideoUpload(true)}
              className="p-1.5 hover:bg-secondary rounded-full transition-colors"
              title="ვიდეოს გაგზავნა"
            >
              <Film className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-secondary rounded-full transition-colors"
            >
              <Smile className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowGifPicker(true)}
              className="px-2 py-1 hover:bg-secondary rounded-md transition-colors text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              GIF
            </button>
            <Input
              placeholder={replyingTo ? "პასუხის წერა..." : "შეტყობინება..."}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onInput={handleTyping}
              onKeyPress={(e) => {
                // Disable Enter to send on mobile (touch devices)
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-secondary border-border h-9 text-sm"
            />
            {user && (
              <VoiceRecorder
                userId={user.id}
                onVoiceSend={(audioUrl) => handleSendVoice(audioUrl)}
                disabled={sendingMessage}
              />
            )}
            <button
              onClick={() => handleSendMessage()}
              disabled={(!messageText.trim() && !selectedImage) || sendingMessage}
              className="p-2 bg-primary rounded-full text-primary-foreground disabled:opacity-50 transition-opacity"
            >
              {sendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-2 z-50">
            <EmojiPicker 
              onSelect={(emoji) => setMessageText(prev => prev + emoji)} 
              onClose={() => setShowEmojiPicker(false)} 
            />
          </div>
        )}

        {/* GIF Picker */}
        {showGifPicker && (
          <GifPicker
            onSelect={handleSendGif}
            onClose={() => setShowGifPicker(false)}
            insertShortcodeMode={true}
            onInsertShortcode={(shortcode) => {
              setMessageText(prev => prev + shortcode);
            }}
          />
        )}

        {/* Video Upload Modal */}
        {showVideoUpload && user && (
          <ChatVideoUpload
            userId={user.id}
            onUploadComplete={async (videoUrl) => {
              if (!selectedConversation) return;
              try {
                await supabase.from('private_messages').insert({
                  conversation_id: selectedConversation.id,
                  sender_id: user.id,
                  video_url: videoUrl,
                  reply_to_id: replyingTo?.id || null,
                });
                setReplyingTo(null);
              } catch (error) {
                console.error('Error sending video:', error);
              }
              setShowVideoUpload(false);
            }}
            onCancel={() => setShowVideoUpload(false)}
          />
        )}

        {/* Fullscreen Image Viewer - inside chat */}
        <ChatImageViewer 
          imageUrl={fullscreenImage} 
          onClose={() => setFullscreenImage(null)} 
        />

        {/* Delete Message Dialog with options */}
        {showDeleteMessageDialog && messageToDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-lg max-w-sm w-full p-4">
              <h3 className="text-lg font-semibold mb-2">შეტყობინების წაშლა</h3>
              <p className="text-sm text-muted-foreground mb-4">
                აირჩიეთ წაშლის ვარიანტი:
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDeleteMessage('forMe')}
                  className="w-full py-2.5 px-4 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
                >
                  მხოლოდ ჩემთან წაშლა
                </button>
                {messageToDelete.senderId === user?.id && (
                  <button
                    onClick={() => handleDeleteMessage('forEveryone')}
                    className="w-full py-2.5 px-4 bg-destructive hover:bg-destructive/90 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ყველასთან წაშლა
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDeleteMessageDialog(false);
                    setMessageToDelete(null);
                  }}
                  className="w-full py-2.5 px-4 border border-border hover:bg-secondary/50 rounded-lg text-sm font-medium transition-colors mt-1"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border p-3 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="p-1.5 hover:bg-secondary rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => window.location.href = '/'} className="p-1.5 hover:bg-secondary rounded-full transition-colors text-primary">
              <Home className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold">შეტყობინებები</h2>
          </div>
          <div className="flex items-center gap-1">
            {conversations.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConversationsDialog(true)}
                className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
                title="ყველა მიმოწერის წაშლა"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </button>
            )}
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="მოძებნეთ ჩატი..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border h-9 text-sm"
          />
        </div>
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16">
          <div className="bg-card w-full max-w-md mx-4 rounded-xl shadow-xl">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <button onClick={() => { setShowUserSearch(false); setSearchResults([]); setUserSearchQuery(''); }}>
                <X className="w-5 h-5" />
              </button>
              <Input
                placeholder="მოძებნეთ მომხმარებელი..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="flex-1 h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {searchResults.length === 0 && userSearchQuery && (
                <p className="p-3 text-center text-muted-foreground text-sm">მომხმარებელი ვერ მოიძებნა</p>
              )}
              {searchResults.map((result) => (
                <button
                  key={result.user_id}
                  onClick={() => startConversation(result.user_id)}
                  className="w-full flex items-center gap-2 p-3 hover:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                    {result.avatar_url ? (
                      <img src={result.avatar_url} alt={result.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-sm">{result.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="font-medium text-sm">{result.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm">ჯერ არ გაქვთ მიმოწერები</p>
          <p className="text-xs text-muted-foreground mt-1">მიმოწერის დასაწყებად ჯერ დაამატეთ მეგობრები</p>
          <button
            onClick={() => setShowUserSearch(true)}
            className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            მეგობრებთან ჩატი
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* System Chat - Always on top */}
          <button
            onClick={() => setShowSystemChat(true)}
            className="w-full flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors bg-gradient-to-r from-amber-500/5 to-orange-500/5"
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-foreground">სისტემა</h3>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">
                    System
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">სისტემური შეტყობინებები</p>
            </div>
            {systemUnreadCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5">
                {systemUnreadCount}
              </span>
            )}
          </button>
          {conversations
            .filter(c => c.other_user.username.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((conv) => (
              <div
                key={conv.id}
                className="w-full flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors group relative"
              >
                <button
                  onClick={() => setSelectedConversation(conv)}
                  className="flex items-center gap-2 flex-1"
                >
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                      {conv.other_user.avatar_url ? (
                        <img
                          src={conv.other_user.avatar_url}
                          alt={conv.other_user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-sm">
                          {conv.other_user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isOnline(conv.other_user.last_seen, conv.other_user.online_visible_until) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[hsl(142,70%,45%)] rounded-full border-2 border-background"></span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm text-foreground">{conv.other_user.username}</h3>
                      <span className="text-[10px] text-muted-foreground">
                        {getTimeString(conv.last_message_time)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {conv.last_message || 'ახალი მიმოწერა'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversationToDelete(conv);
                    setShowDeleteConversationDialog(true);
                  }}
                  className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-full"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      <ChatImageViewer 
        imageUrl={fullscreenImage} 
        onClose={() => setFullscreenImage(null)} 
      />

      {/* Delete Conversation Confirmation */}
      <DeleteConfirmDialog
        open={showDeleteConversationDialog}
        onOpenChange={(open) => {
          setShowDeleteConversationDialog(open);
          if (!open) setConversationToDelete(null);
        }}
        onConfirm={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
        title="მიმოწერის წაშლა"
        description={`დარწმუნებული ხართ, რომ გსურთ მიმოწერის წაშლა ${conversationToDelete?.other_user.username || ''}-თან? ეს მოქმედება ვერ დაბრუნდება.`}
      />

      {/* Old Delete Message Dialog removed - now using custom dialog inside chat view */}

      {/* Clear All Messages Confirmation */}
      <DeleteConfirmDialog
        open={showClearMessagesDialog}
        onOpenChange={setShowClearMessagesDialog}
        onConfirm={handleClearAllMessages}
        title="შეტყობინებების გასუფთავება"
        description="დარწმუნებული ხართ რომ გსურთ ამ მიმოწერის ყველა შეტყობინების წაშლა? ეს ქმედება ვერ გაუქმდება."
      />

      {/* Delete All Conversations Confirmation */}
      <DeleteConfirmDialog
        open={showDeleteAllConversationsDialog}
        onOpenChange={setShowDeleteAllConversationsDialog}
        onConfirm={handleDeleteAllConversations}
        title="ყველა მიმოწერის წაშლა"
        description="დარწმუნებული ხართ რომ გსურთ ყველა მიმოწერის წაშლა? ეს ქმედება ვერ გაუქმდება და ყველა შეტყობინება დაიკარგება."
      />
    </div>
  );
};

export default ChatView;
