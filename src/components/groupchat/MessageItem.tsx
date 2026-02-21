import { forwardRef, memo, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Ban, VolumeX, Lock, EyeOff, CornerDownRight, Pencil, Flag, Eye, UserX, Globe, Pin, MessageSquare } from 'lucide-react';
import { ReportModal, ContentType } from '@/components/reports/ReportModal';
import StyledUsername from '@/components/username/StyledUsername';
import MentionHighlightedText from './MentionHighlightedText';
import VideoEmbed, { extractVideoUrl, removeVideoUrl } from '@/components/shared/VideoEmbed';
import ChatVideoMessage from '@/components/chat/ChatVideoMessage';
import { isUserOnlineByLastSeen } from '@/hooks/useOnlineStatus';
import { getContrastColor, CHAT_COLORS } from './ChatColorPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactionsModal from '@/components/reactions/ReactionsModal';
import { useScrollSafeTap } from '@/hooks/useScrollSafeTap';

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

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isIgnored: boolean;
  isHighlighted: boolean;
  userStatus: any;
  gracePeriodSeconds: number;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
  roomType?: string;
  roomName?: string;
  onReply: (message: Message) => void;
  onDelete: (messageId: string, ownerId?: string) => void;
  onIgnore: (userId: string) => void;
  onUnignore: (userId: string) => void;
  onMute: (userId: string) => void;
  onBan: (userId: string) => void;
  onSiteBan?: (userId: string) => void;
  onEdit: (message: Message) => void;
  onNavigateToProfile?: (userId: string) => void;
  onNicknameClick?: (username: string) => void;
  onImageClick: (url: string) => void;
  onPrivateMessage: (message: Message) => void;
  onReplyClick: (replyToId: string) => void;
  chatBackgroundColor?: string;
  onPin?: (messageId: string) => void;
  onThread?: (message: Message) => void;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
};

// Facebook-style reactions
const UNIVERSAL_REACTIONS = [
  { type: 'like', emoji: '👍', label: 'მოწონება', color: '#2078F4' },
  { type: 'love', emoji: '❤️', label: 'სიყვარული', color: '#F33E58' },
  { type: 'care', emoji: '🤗', label: 'მზრუნველობა', color: '#F7B125' },
  { type: 'haha', emoji: '😂', label: 'ჰაჰა', color: '#F7B125' },
  { type: 'wow', emoji: '😮', label: 'ვაუ', color: '#F7B125' },
  { type: 'sad', emoji: '😢', label: 'სევდა', color: '#F7B125' },
  { type: 'angry', emoji: '😡', label: 'ბრაზი', color: '#E9710F' },
] as const;

const getReactionLabel = (type: string) => {
  return UNIVERSAL_REACTIONS.find(r => r.type === type)?.label || 'მოწონებული';
};

const getReactionEmoji = (type: string) => {
  return UNIVERSAL_REACTIONS.find(r => r.type === type)?.emoji || '👍';
};

const getReactionColor = (type: string) => {
  return UNIVERSAL_REACTIONS.find(r => r.type === type)?.color || '#2078F4';
};

// Long press duration
const LONG_PRESS_DURATION = 350;

// Parse content and extract inline GIFs
const parseContentWithGifs = (content: string | null): { type: 'text' | 'gif'; value: string }[] => {
  if (!content) return [];
  
  const gifRegex = /\[GIF:(https?:\/\/[^\]]+)\]/g;
  const segments: { type: 'text' | 'gif'; value: string }[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = gifRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: 'text', value: text });
      }
    }
    segments.push({ type: 'gif', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: 'text', value: text });
    }
  }
  
  return segments;
};

const hasGifMarkers = (content: string | null): boolean => {
  if (!content) return false;
  return /\[GIF:https?:\/\/[^\]]+\]/.test(content);
};

const MessageItem = forwardRef<HTMLDivElement, MessageItemProps>(({
  message,
  isOwn,
  isAdmin,
  isSuperAdmin,
  isIgnored,
  isHighlighted,
  userStatus,
  gracePeriodSeconds,
  currentUserId,
  currentUsername,
  roomType,
  roomName,
  onReply,
  onDelete,
  onIgnore,
  onUnignore,
  onMute,
  onBan,
  onSiteBan,
  onEdit,
  onNavigateToProfile,
  onNicknameClick,
  onImageClick,
  onPrivateMessage,
  onReplyClick,
  chatBackgroundColor,
  onPin,
  onThread
}, ref) => {
  const { user } = useAuth();
  const { onTouchStart: safeTouchStart, onTouchMove: safeTouchMove, onTouchEnd: safeTouchEnd, safeTap, wasDragRef } = useScrollSafeTap();
  const online = isUserOnlineByLastSeen(message.profile?.last_seen || null, gracePeriodSeconds / 60);
  const isOthersPrivateMessage = message.is_private && isSuperAdmin && 
    message.user_id !== currentUserId && 
    message.private_to_user_id !== currentUserId;
  
  // Anonymous: hide identity from non-admins
  const isAnonymousMessage = message.is_anonymous && !isOwn && !isAdmin;
  const displayUsername = isAnonymousMessage ? 'ანონიმი' : (message.profile?.username || 'Unknown');
  const displayAvatar = isAnonymousMessage ? null : (message.profile?.avatar_url || undefined);

  // Reaction state
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const reactionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dropdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dropdownMovedRef = useRef(false);

  // Fetch reactions
  useEffect(() => {
    if (!message.id) return;
    
    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from('universal_reactions')
        .select('reaction_type, user_id')
        .eq('target_type', 'room_message')
        .eq('target_id', message.id);

      if (error) return;

      const counts: Record<string, number> = {};
      let userReaction: string | null = null;
      
      data?.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        if (user?.id && r.user_id === user.id) {
          userReaction = r.reaction_type;
        }
      });

      setReactionCounts(counts);
      setMyReaction(userReaction);
    };

    fetchReactions();

    // Realtime subscription
    const channel = supabase
      .channel(`msg-reactions-${message.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'universal_reactions',
        filter: `target_id=eq.${message.id}`,
      }, () => fetchReactions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [message.id, user?.id]);

  // Handle reaction
  const handleReaction = useCallback(async (reactionType: string) => {
    if (!user?.id || loading) return;

    setLoading(true);
    const previousReaction = myReaction;
    const previousCounts = { ...reactionCounts };

    try {
      if (myReaction === reactionType) {
        // Remove reaction
        setMyReaction(null);
        setReactionCounts(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
        }));

        await supabase
          .from('universal_reactions')
          .delete()
          .eq('target_type', 'room_message')
          .eq('target_id', message.id)
          .eq('user_id', user.id);
      } else {
        // Add/change reaction
        const newCounts = { ...reactionCounts };
        if (myReaction) {
          newCounts[myReaction] = Math.max(0, (newCounts[myReaction] || 0) - 1);
        }
        newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
        
        setMyReaction(reactionType);
        setReactionCounts(newCounts);

        await supabase
          .from('universal_reactions')
          .upsert({
            target_type: 'room_message',
            target_id: message.id,
            user_id: user.id,
            reaction_type: reactionType,
          }, {
            onConflict: 'target_type,target_id,user_id',
          });

        // Send notification if not own message
        if (message.user_id !== user.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', user.id)
            .single();

          const emoji = getReactionEmoji(reactionType);
          const contentPreview = message.content?.slice(0, 50) || (message.gif ? 'GIF' : message.image_url ? 'სურათი' : '');

          // Format: messageId|reactionType|messageContent (expected by NotificationDropdown)
          const notificationMessage = `${message.id}|${reactionType}|${contentPreview}`;
          
          await supabase
            .from('notifications')
            .insert({
              user_id: message.user_id,
              from_user_id: user.id,
              type: 'group_chat_reaction',
              message: notificationMessage,
              content: roomName || roomType,
              related_type: roomType,
              related_id: message.id,
              is_read: false,
            });
        }
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
      setMyReaction(previousReaction);
      setReactionCounts(previousCounts);
    } finally {
      setLoading(false);
      setShowPicker(false);
      setHoveredReaction(null);
    }
  }, [user?.id, myReaction, reactionCounts, message.id, message.user_id, message.content, message.gif, message.image_url, roomType, roomName, loading]);

  // Short click = show picker immediately
  const handleShortClick = useCallback(() => {
    if (isLongPress.current) return;
    setShowPicker(true);
  }, []);

  // Long press handlers
  const handlePressStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowPicker(true);
    }, LONG_PRESS_DURATION);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Touch drag
  const findReactionAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    for (const [type, element] of reactionRefs.current.entries()) {
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left - 10 && clientX <= rect.right + 10 && 
          clientY >= rect.top - 30 && clientY <= rect.bottom + 10) {
        return type;
      }
    }
    return null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!showPicker) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const reactionType = findReactionAtPoint(touch.clientX, touch.clientY);
    if (reactionType !== hoveredReaction) {
      setHoveredReaction(reactionType);
    }
  }, [showPicker, findReactionAtPoint, hoveredReaction]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!showPicker) return;
    if (hoveredReaction) {
      e.stopPropagation();
      e.preventDefault();
      handleReaction(hoveredReaction);
    }
    // If no hoveredReaction, let the event through so onClick on emoji buttons can fire
  }, [showPicker, hoveredReaction, handleReaction]);

  // Reaction animation
  const getReactionAnimation = (type: string, isHovered: boolean) => {
    const baseScale = isHovered ? 1.6 : 1;
    const baseY = isHovered ? -20 : 0;
    
    const animations: Record<string, object> = {
      like: { rotate: [0, -15, 15, -10, 0], scale: [baseScale, baseScale * 1.1, baseScale] },
      love: { scale: [baseScale, baseScale * 1.2, baseScale * 0.9, baseScale * 1.1, baseScale] },
      haha: { rotate: [0, -12, 12, -12, 12, 0], y: [baseY, baseY - 6, baseY, baseY - 4, baseY] },
      wow: { scale: [baseScale, baseScale * 1.3, baseScale * 0.85, baseScale], y: [baseY, baseY - 10, baseY] },
      sad: { y: [baseY, baseY + 4, baseY, baseY + 2, baseY], rotate: [0, -6, 6, 0] },
      angry: { rotate: [0, -8, 8, -8, 8, -4, 4, 0], scale: [baseScale, baseScale * 1.1, baseScale] },
      care: { scale: [baseScale, baseScale * 1.1, baseScale * 0.92, baseScale], rotate: [0, 6, -6, 0] },
    };

    return { scale: baseScale, y: baseY, ...animations[type] };
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topReactions = Object.entries(reactionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Deleted message
  if (message.is_deleted) {
    return (
      <div
        ref={ref}
        className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="w-8 h-8 opacity-50">
            <AvatarImage src={message.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {message.profile?.username?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-col" style={{ maxWidth: '78%' }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              {message.profile?.username || 'Unknown'}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {formatTime(message.created_at)}
            </span>
          </div>
          <div className="rounded-2xl px-3.5 py-2 bg-foreground/[0.03] border border-dashed border-muted-foreground/10">
            <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
              <Trash2 className="w-3 h-3" />
              წაშლილი
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ display: 'flex', width: '100%', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}
      className={`transition-all duration-300 ${
        isHighlighted ? 'bg-primary/10 rounded-2xl p-1.5 ring-1 ring-primary/30 animate-pulse' : ''
      } ${isOthersPrivateMessage ? 'bg-gradient-to-r from-orange-500/5 via-amber-500/[0.02] to-transparent rounded-2xl p-1.5 border-l-2 border-orange-500/50' : ''}`}
    >
    <div
      className="flex flex-col"
      style={{ width: 'fit-content', maxWidth: '78%', minWidth: 'fit-content', alignItems: isOwn ? 'flex-end' : 'flex-start' }}
    >
      {/* Header row */}
      <div className={`flex items-center gap-1 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div 
          className={`relative flex-shrink-0 ${isAnonymousMessage ? '' : 'cursor-pointer'}`}
          onClick={() => !isAnonymousMessage && onNavigateToProfile?.(message.user_id)}
        >
          <Avatar className="w-7 h-7">
            <AvatarImage src={displayAvatar} />
            <AvatarFallback className={`text-[10px] ${isAnonymousMessage ? 'bg-violet-500/20 text-violet-500' : 'bg-gradient-to-br from-primary to-accent text-white'}`}>
              {isAnonymousMessage ? '🎭' : (displayUsername.charAt(0).toUpperCase() || '?')}
            </AvatarFallback>
          </Avatar>
          {online && !isAnonymousMessage && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>
        
        <span 
          className={`text-xs font-medium ${isAnonymousMessage ? 'text-violet-500 italic' : 'cursor-pointer hover:underline'}`}
          onClick={() => {
            if (!isOwn && !isAnonymousMessage && message.profile?.username) {
              onNicknameClick?.(message.profile.username);
            }
          }}
        >
          {isAnonymousMessage ? (
            <span className="text-xs">🎭 ანონიმი</span>
          ) : (
            <StyledUsername 
              userId={message.user_id} 
              username={displayUsername}
              className="text-xs"
              chatBackgroundColor={chatBackgroundColor}
            />
          )}
        </span>
        {/* Admin badge for anonymous messages */}
        {message.is_anonymous && isAdmin && !isOwn && (
          <span className="text-[9px] bg-violet-500/20 text-violet-500 px-1 py-0.5 rounded-full">
            🎭 {message.profile?.username}
          </span>
        )}
        {userStatus?.is_muted && <VolumeX className="w-3 h-3 text-orange-500" />}
        {userStatus?.is_banned && <Ban className="w-3 h-3 text-destructive" />}
        {message.is_private && (
          <Lock className={`w-3 h-3 ${isOthersPrivateMessage ? 'text-orange-500' : 'text-primary'}`} />
        )}
        {isOthersPrivateMessage && (
          <span className="text-[10px] bg-orange-500/80 text-white px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
            <EyeOff className="w-2.5 h-2.5" />
            დაფარული
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/60">
          {formatTime(message.created_at)}
        </span>
        {message.is_private && message.private_to_profile && (
          <span className={`text-xs font-medium ${isOthersPrivateMessage ? 'text-orange-500' : 'text-primary'}`}>
            → @{message.private_to_profile.username}
          </span>
        )}
        
        {/* 3-dot Menu - delayed open to prevent accidental triggers during scroll */}
        <DropdownMenu open={showDropdown} onOpenChange={(open) => {
          if (!open) setShowDropdown(false);
          // Block Radix auto-open; we control open via our own delayed logic
        }}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5"
              onPointerDown={(e) => {
                // Prevent Radix from opening immediately on pointer down
                e.preventDefault();
                dropdownTouchStartRef.current = { x: e.clientX, y: e.clientY };
                dropdownMovedRef.current = false;
              }}
              onPointerMove={(e) => {
                if (!dropdownTouchStartRef.current) return;
                const dx = Math.abs(e.clientX - dropdownTouchStartRef.current.x);
                const dy = Math.abs(e.clientY - dropdownTouchStartRef.current.y);
                if (dx > 8 || dy > 8) {
                  dropdownMovedRef.current = true;
                }
              }}
              onPointerUp={() => {
                if (!dropdownMovedRef.current) {
                  // Real tap — open with small delay
                  dropdownTimerRef.current = setTimeout(() => setShowDropdown(true), 120);
                }
                dropdownTouchStartRef.current = null;
              }}
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-card border-border min-w-[180px]">
            {/* Edit - own messages or super admins */}
            {(isOwn || isSuperAdmin) && (
              <DropdownMenuItem onClick={() => onEdit(message)} className={cn("text-sm", !isOwn && isSuperAdmin ? "text-orange-500" : "")}>
                <Pencil className="w-3 h-3 mr-2" />
                რედაქტირება
              </DropdownMenuItem>
            )}

            {/* Thread removed */}

            {/* Pin - admin only, gossip room only */}
            {onPin && isAdmin && (
              <DropdownMenuItem onClick={() => onPin(message.id)} className="text-sm text-amber-500">
                <Pin className="w-3 h-3 mr-2" />
                ჩამაგრება
              </DropdownMenuItem>
            )}

            {!isOwn && (
              <DropdownMenuItem onClick={() => onPrivateMessage(message)} className="text-sm text-primary">
                <Lock className="w-3 h-3 mr-2" />
                P.M
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            
            {/* Own message delete */}
            {isOwn && (
              <DropdownMenuItem onClick={() => onDelete(message.id, message.user_id)} className="text-sm text-destructive">
                <Trash2 className="w-3 h-3 mr-2" />
                წაშლა
              </DropdownMenuItem>
            )}
            
            {/* Admin delete */}
            {!isOwn && isAdmin && (
              <DropdownMenuItem onClick={() => onDelete(message.id, message.user_id)} className="text-sm text-destructive">
                <Trash2 className="w-3 h-3 mr-2" />
                წაშლა (ადმინი)
              </DropdownMenuItem>
            )}
            
            {!isOwn && (
              <>
                <DropdownMenuSeparator />
                {/* Ignore/Unignore */}
                {isIgnored ? (
                  <DropdownMenuItem onClick={() => onUnignore(message.user_id)} className="text-sm">
                    <EyeOff className="w-3 h-3 mr-2" />
                    იგნორის მოხსნა
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onIgnore(message.user_id)} className="text-sm text-orange-500">
                    <UserX className="w-3 h-3 mr-2" />
                    დაიგნორება
                  </DropdownMenuItem>
                )}
              </>
            )}
            
            {/* Admin-only actions */}
            {isAdmin && !isOwn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onMute(message.user_id)} className="text-sm text-orange-500">
                  <VolumeX className="w-3 h-3 mr-2" />
                  დადუმება ოთახში
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBan(message.user_id)} className="text-sm text-destructive">
                  <Ban className="w-3 h-3 mr-2" />
                  დაბლოკვა ოთახში
                </DropdownMenuItem>
                {onSiteBan && (
                  <DropdownMenuItem onClick={() => onSiteBan(message.user_id)} className="text-sm text-destructive">
                    <Globe className="w-3 h-3 mr-2" />
                    დაბლოკვა საიტზე
                  </DropdownMenuItem>
                )}
              </>
            )}

            {/* Report */}
            {!isOwn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowReportModal(true)} className="text-sm text-destructive">
                  <Flag className="w-3 h-3 mr-2" />
                  გასაჩივრება
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content section */}
      <div className={`${isOwn ? 'flex flex-col items-end' : ''}`}>
        
        {/* Reply Quote - Only show nickname, not text */}
        {message.reply_to && (() => {
          const replyToAuthorId = message.reply_to.user_id;
          const isReplyToMe = currentUserId && replyToAuthorId === currentUserId;
          
          return (
             <div 
              className={`flex items-center gap-2 px-3.5 py-2 mb-2 rounded-2xl cursor-pointer hover:opacity-90 transition-all border-l-4 ${
                isReplyToMe 
                  ? `border-red-500 ${isOwn ? 'bg-red-500/15' : 'bg-red-500/10'}` 
                  : 'border-muted-foreground/30 bg-muted/30'
              }`}
              onClick={() => onReplyClick(message.reply_to!.id)}
            >
              <CornerDownRight className={`w-4 h-4 flex-shrink-0 ${isReplyToMe ? 'text-red-500' : 'text-muted-foreground'}`} />
              {isReplyToMe ? (
                <span className="font-bold text-red-500 text-base uppercase tracking-wide whitespace-nowrap">
                  @{message.reply_to.profile?.username}
                </span>
              ) : (
                <StyledUsername 
                  userId={message.reply_to.user_id} 
                  username={`@${message.reply_to.profile?.username || 'Unknown'}`}
                  className="text-sm font-medium"
                />
              )}
            </div>
          );
        })()}
        
        {/* GIF-only message */}
        {message.gif && (!message.content || message.content.trim() === '') && !message.image_url && (
           <div className={`relative w-fit max-w-none ${totalReactions > 0 ? 'mb-3' : ''}`}>
            <img
              src={message.gif.file_original}
              alt={message.gif.title || 'GIF'}
              className="rounded-2xl block"
              style={{
                maxWidth: 'min(280px, 90vw)',
                height: 'auto',
                objectFit: 'cover'
              }}
            />
            {/* Reactions on bubble corner for GIF */}
            {totalReactions > 0 && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => setShowReactionsModal(true)}
                className={`absolute -bottom-2 ${isOwn ? '-left-2' : '-right-2'} flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border transition-all`}
              >
                {topReactions.map(([type]) => (
                  <span key={type} className="text-sm leading-none">
                    {getReactionEmoji(type)}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground ml-0.5">
                  {totalReactions}
                </span>
              </motion.button>
            )}
          </div>
        )}

        {/* Regular message with content */}
        {(message.content || message.image_url || message.video_url || (message.gif && message.content && message.content.trim() !== '')) && (
          <div className={`relative w-fit ${totalReactions > 0 ? 'mb-3' : ''}`}>
            <div
              className={`w-fit rounded-2xl px-3.5 py-2.5 ${
                isOthersPrivateMessage
                  ? 'bg-orange-500/20 border border-orange-500/30 text-foreground'
                  : chatBackgroundColor
                    ? 'bg-black/10 text-foreground'
                    : isOwn
                      ? 'bg-chat-message-own/10 text-foreground'
                      : 'bg-chat-message-other/40 text-foreground'
              } ${isOwn ? 'rounded-tr-md' : 'rounded-tl-md'}`}
              style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {(() => {
                const segments = parseContentWithGifs(message.content);
                const hasInline = hasGifMarkers(message.content);
                
                if (hasInline && segments.length > 0) {
                  const textSegments = segments.filter(s => s.type === 'text');
                  const gifSegments = segments.filter(s => s.type === 'gif');
                  const isOnlyGif = textSegments.length === 0 && gifSegments.length === 1;
                  
                  if (isOnlyGif) {
                    return (
                      <img
                        src={gifSegments[0].value}
                        alt="GIF"
                        className="max-w-[100px] max-h-[100px] rounded-xl object-contain"
                      />
                    );
                  }
                  
                  return (
                    <div className="flex flex-wrap items-end gap-1">
                      {segments.map((segment, idx) => (
                        segment.type === 'gif' ? (
                          <img
                            key={idx}
                            src={segment.value}
                            alt="GIF"
                            className="max-w-[100px] max-h-[100px] rounded-xl object-contain inline-block flex-shrink-0"
                          />
                        ) : (
                          <MentionHighlightedText 
                            key={idx}
                            content={segment.value}
                            messageAuthorId={message.user_id}
                            currentUsername={currentUsername}
                            className="inline"
                            chatBackgroundColor={chatBackgroundColor}
                          />
                        )
                      ))}
                    </div>
                  );
                }
                
                return (
                  <>
                    {message.gif && message.content && message.content.trim() !== '' && (
                      <img
                        src={message.gif.file_original}
                        alt={message.gif.title || 'GIF'}
                        className="max-w-[100px] max-h-[100px] rounded-xl mb-2 object-contain"
                      />
                    )}
                    {message.image_url && (
                      message.image_url.endsWith('.webm') || message.content === '🎤 ხმოვანი შეტყობინება' ? (
                        <audio src={message.image_url} controls className="max-w-full rounded mb-1 h-10" />
                      ) : (
                        <img
                          src={message.image_url}
                          alt="Shared image"
                          className="rounded-xl mb-1 cursor-pointer hover:opacity-90 transition-opacity max-w-full"
                          onClick={() => onImageClick(message.image_url!)}
                        />
                      )
                    )}
                    {message.video_url && (
                      <ChatVideoMessage videoUrl={message.video_url} className="mb-1" />
                    )}
                    {message.content && extractVideoUrl(message.content) && (
                      <VideoEmbed url={extractVideoUrl(message.content)!} className="mb-1 max-w-[280px]" />
                    )}
                    {message.content && message.content !== '🎤 ხმოვანი შეტყობინება' && (
                      <MentionHighlightedText 
                        content={removeVideoUrl(message.content) || ''}
                        messageAuthorId={message.user_id}
                        currentUsername={currentUsername}
                        chatBackgroundColor={chatBackgroundColor}
                      />
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* Reactions on bubble corner */}
            {totalReactions > 0 && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => setShowReactionsModal(true)}
                className={`absolute -bottom-3 ${isOwn ? '-left-2' : '-right-2'} flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border shadow-md hover:shadow-lg transition-all z-10`}
              >
                {topReactions.map(([type]) => (
                  <span key={type} className="text-sm leading-none">
                    {getReactionEmoji(type)}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground ml-0.5">
                  {totalReactions}
                </span>
              </motion.button>
            )}
          </div>
        )}
        
        {/* Action Row - Like, Reply, Edit, Delete, Report */}
          <div 
            className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}
          onTouchStart={safeTouchStart}
          onTouchMove={safeTouchMove}
          onTouchEnd={safeTouchEnd}
        >
          {/* Like Button with Long Press */}
          <div className="relative inline-flex items-center">
            <motion.button
              ref={buttonRef}
              onMouseDown={handlePressStart}
              onMouseUp={() => {
                handlePressEnd();
                handleShortClick();
              }}
              onMouseLeave={handlePressEnd}
              onTouchStart={(e) => {
                safeTouchStart(e);
                handlePressStart();
              }}
              onTouchEnd={(e) => {
                safeTouchEnd();
                handlePressEnd();
                if (!isLongPress.current && !wasDragRef.current) {
                  handleShortClick();
                }
                wasDragRef.current = false;
              }}
              onTouchMove={(e) => {
                safeTouchMove(e);
              }}
              disabled={loading || !user}
              className={cn(
                "px-2 py-0.5 hover:bg-foreground/5 rounded text-xs font-medium transition-all touch-manipulation select-none",
                myReaction ? "font-semibold" : "text-muted-foreground hover:text-foreground",
                loading && "opacity-50 cursor-not-allowed"
              )}
              style={{ color: myReaction ? getReactionColor(myReaction) : undefined }}
            >
              {myReaction ? `${getReactionEmoji(myReaction)} ${getReactionLabel(myReaction)}` : 'Like'}
            </motion.button>

            {/* Reaction Picker */}
            <AnimatePresence>
              {showPicker && (
                <motion.div 
                  key="reaction-picker"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div 
                    className="fixed inset-0 z-[150]"
                    onClick={() => {
                      setShowPicker(false);
                      setHoveredReaction(null);
                    }}
                  />
                  
                  <motion.div
                    className="fixed z-[200]"
                    initial={{ opacity: 0, scale: 0.3, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.3, y: 20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{
                      left: buttonRef.current 
                        ? Math.max(12, Math.min(
                            buttonRef.current.getBoundingClientRect().left - 60,
                            window.innerWidth - 340
                          ))
                        : '50%',
                      bottom: buttonRef.current 
                        ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 12 
                        : 'auto',
                    }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <motion.div 
                      className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl p-2 flex gap-1"
                      style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
                    >
                      {UNIVERSAL_REACTIONS.map((reaction, index) => (
                        <motion.button
                          key={reaction.type}
                          ref={(el) => {
                            if (el) reactionRefs.current.set(reaction.type, el);
                          }}
                          initial={{ opacity: 0, y: 25, scale: 0 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ 
                            delay: index * 0.03,
                            type: 'spring',
                            stiffness: 500,
                            damping: 15
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleReaction(reaction.type);
                          }}
                          onMouseEnter={() => setHoveredReaction(reaction.type)}
                          onMouseLeave={() => setHoveredReaction(null)}
                          className={cn(
                            "relative touch-manipulation rounded-full p-1 transition-colors",
                            myReaction === reaction.type && "bg-primary/20 ring-2 ring-primary/40"
                          )}
                        >
                          <motion.span 
                            className="text-[28px] block leading-none select-none cursor-pointer"
                            animate={getReactionAnimation(reaction.type, hoveredReaction === reaction.type)}
                            transition={{
                              duration: 0.45,
                              repeat: hoveredReaction === reaction.type ? Infinity : 0,
                              repeatType: 'loop',
                              ease: 'easeInOut',
                            }}
                          >
                            {reaction.emoji}
                          </motion.span>
                          
                          {hoveredReaction === reaction.type && (
                            <motion.span 
                              className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap font-medium"
                              initial={{ opacity: 0, y: 5, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              {reaction.label}
                            </motion.span>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reply button */}
          <button
            onClick={safeTap(() => onReply(message))}
            className="px-2 py-0.5 hover:bg-foreground/5 rounded text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
          >
            Reply
          </button>

          
          {/* Delete button for admins */}
          {isAdmin && !isOwn && (
            <button
              onClick={safeTap(() => onDelete(message.id, message.user_id))}
              className="px-2 py-0.5 hover:bg-foreground/5 rounded text-destructive hover:text-destructive/80 transition-colors text-xs font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
          
          {/* Report Modal */}
          {showReportModal && (
            <ReportModal
              open={showReportModal}
              onOpenChange={setShowReportModal}
              contentType={"group_message" as ContentType}
              contentId={message.id}
              reportedUserId={message.user_id}
              contentPreview={message.content || undefined}
            />
          )}
        </div>
      </div>

      {/* Reactions Modal */}
      <AnimatePresence>
        {showReactionsModal && (
          <ReactionsModal
            messageId={message.id}
            messageType="room_message"
            onClose={() => setShowReactionsModal(false)}
            onUserClick={onNavigateToProfile}
          />
        )}
      </AnimatePresence>
    </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default memo(MessageItem);
