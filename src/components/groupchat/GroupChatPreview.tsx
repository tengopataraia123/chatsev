import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Moon, Plane, Headphones, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useBatchPresence } from '@/hooks/useBatchPresence';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface LatestMessage {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  has_gif: boolean;
  has_image: boolean;
  has_video: boolean;
  is_anonymous: boolean;
}

interface RoomData {
  id: string;
  name: string;
  icon: typeof MessageCircle;
  gradient: string;
  table: string;
  presenceTable: string;
  onlineCount: number;
  latestMessage: LatestMessage | null;
  loading: boolean;
}

interface GroupChatPreviewProps {
  onClick: () => void;
  onRoomClick?: (roomId: 'gossip' | 'night' | 'emigrants' | 'dj') => void;
}

const GroupChatPreview = ({ onClick, onRoomClick }: GroupChatPreviewProps) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [rooms, setRooms] = useState<RoomData[]>([
    {
      id: 'gossip',
      name: 'ჭორბიურო',
      icon: MessageCircle,
      gradient: 'from-purple-500 to-pink-500',
      table: 'group_chat_messages',
      presenceTable: 'group_chat_presence',
      onlineCount: 0,
      latestMessage: null,
      loading: true
    },
    {
      id: 'night',
      name: 'ღამის ოთახი',
      icon: Moon,
      gradient: 'from-indigo-600 to-purple-700',
      table: 'night_room_messages',
      presenceTable: 'night_room_presence',
      onlineCount: 0,
      latestMessage: null,
      loading: true
    },
    {
      id: 'emigrants',
      name: 'ემიგრანტები',
      icon: Plane,
      gradient: 'from-blue-500 to-cyan-500',
      table: 'emigrants_room_messages',
      presenceTable: 'emigrants_room_presence',
      onlineCount: 0,
      latestMessage: null,
      loading: true
    },
    {
      id: 'dj',
      name: 'DJ Room',
      icon: Headphones,
      gradient: 'from-pink-500 to-orange-500',
      table: 'dj_room_messages',
      presenceTable: 'dj_room_presence',
      onlineCount: 0,
      latestMessage: null,
      loading: true
    }
  ]);

  // Use batch presence hook instead of individual polling
  const { counts: presenceCounts } = useBatchPresence();
  
  // Update room counts from batch presence
  useEffect(() => {
    setRooms(prev => prev.map(room => {
      const count = room.id === 'gossip' ? presenceCounts.gossip
        : room.id === 'night' ? presenceCounts.night
        : room.id === 'emigrants' ? presenceCounts.emigrants
        : room.id === 'dj' ? presenceCounts.dj
        : 0;
      return { ...room, onlineCount: count };
    }));
  }, [presenceCounts]);

  useEffect(() => {
    const fetchLatestGossipMessage = async () => {
      try {
        // Check if current user is admin
        const { data: { session } } = await supabase.auth.getSession();
        let userIsAdmin = false;
        if (session?.user?.id) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          userIsAdmin = ['super_admin', 'admin', 'moderator'].includes(roleData?.role || '');
          setIsAdmin(userIsAdmin);
        }

        const { data: messageData, error } = await supabase
          .from('group_chat_messages')
          .select('id, content, created_at, user_id, gif_id, image_url, video_url, is_anonymous')
          .eq('is_deleted', false)
          .eq('is_private', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (messageData) {
          const isAnon = !!(messageData as any).is_anonymous;
          const shouldHideIdentity = isAnon && !userIsAdmin;
          
          let profileData: { username: string; avatar_url: string | null } | null = null;
          
          // Always fetch profile (admins see real name, others see anonymous)
          const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', (messageData as any).user_id)
            .maybeSingle();
          profileData = data;

          setRooms(prev => prev.map(room => {
            if (room.id === 'gossip') {
              return {
                ...room,
                latestMessage: {
                  id: (messageData as any).id,
                  content: (messageData as any).content,
                  created_at: (messageData as any).created_at,
                  user_id: (messageData as any).user_id,
                  profile: shouldHideIdentity 
                    ? { username: '🎭 ანონიმური', avatar_url: null } 
                    : (profileData || undefined),
                  has_gif: !!(messageData as any).gif_id,
                  has_image: !!(messageData as any).image_url,
                  has_video: !!(messageData as any).video_url,
                  is_anonymous: isAnon,
                },
                loading: false
              };
            }
            return { ...room, loading: false };
          }));
        } else {
          setRooms(prev => prev.map(room => ({ ...room, loading: false })));
        }
      } catch (error) {
        console.error('Error fetching latest gossip message:', error);
        setRooms(prev => prev.map(room => ({ ...room, loading: false })));
      }
    };

    fetchLatestGossipMessage();
    // Presence counts are now handled by batch hook above
  }, []);

  const getMessagePreview = () => {
    const gossipRoom = rooms.find(r => r.id === 'gossip');
    if (!gossipRoom) return '';
    if (gossipRoom.loading) return '...';
    if (!gossipRoom.latestMessage) return 'შეტყობინებები არ არის';
    
    if (gossipRoom.latestMessage.has_gif) return '🎬 GIF';
    if (gossipRoom.latestMessage.has_image) return '📷 ფოტო';
    if (gossipRoom.latestMessage.has_video) return '🎥 ვიდეო';
    if (gossipRoom.latestMessage.content) {
      const maxLen = 20;
      return gossipRoom.latestMessage.content.length > maxLen 
        ? gossipRoom.latestMessage.content.substring(0, maxLen) + '...'
        : gossipRoom.latestMessage.content;
    }
    return 'შეტყობინება';
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: ka });
    } catch {
      return '';
    }
  };

  const gossipRoom = rooms.find(r => r.id === 'gossip');
  const handleRoomClick = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show age verification for night room
    if (roomId === 'night') {
      setShowAgeVerification(true);
      return;
    }
    
    if (onRoomClick) {
      onRoomClick(roomId as 'gossip' | 'night' | 'emigrants' | 'dj');
    } else {
      onClick();
    }
  };

  const handleAgeConfirm = (isAdult: boolean) => {
    setShowAgeVerification(false);
    if (isAdult && onRoomClick) {
      onRoomClick('night');
    }
    // If not adult, just close dialog and stay on main page
  };

  // Ref for touch event handling
  const containerRef = useRef<HTMLDivElement>(null);

  // Block horizontal touch movements
  useEffect(() => {
    const container = containerRef.current;
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
      
      // If horizontal movement is greater than vertical, prevent it
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

  return (
    <div 
      ref={containerRef}
      className="w-full p-3 mb-2 bg-gradient-to-r from-primary/8 via-accent/5 to-primary/8 rounded-xl border border-border/40 overflow-hidden hover:border-primary/30 transition-colors"
      style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
    >
      {/* Title row */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm text-foreground">ჯგუფური ოთახები</h3>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">4</span>
      </div>

      {/* Room icons row - centered with even spacing, no horizontal scroll */}
      <div 
        className="flex items-center justify-around mb-2 overflow-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        {rooms.map((room) => {
          const Icon = room.icon;
          return (
            <button
              key={room.id}
              onClick={(e) => handleRoomClick(room.id, e)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${room.gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
                {room.onlineCount > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center border-2 border-background">
                    {room.onlineCount > 99 ? '99+' : room.onlineCount}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center whitespace-nowrap">
                {room.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Latest message from gossip room */}
      {gossipRoom?.latestMessage && (
        <button 
          onClick={onClick}
          className="w-full flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Avatar className="w-7 h-7 flex-shrink-0">
            {gossipRoom.latestMessage.is_anonymous ? (
              <AvatarFallback className="text-sm bg-gradient-to-br from-purple-500 to-pink-500 text-white">🎭</AvatarFallback>
            ) : (
              <>
                <AvatarImage src={gossipRoom.latestMessage.profile?.avatar_url || ''} />
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {gossipRoom.latestMessage.profile?.username?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-foreground truncate">
                {gossipRoom.latestMessage.profile?.username || 'მომხმარებელი'}
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(gossipRoom.latestMessage.created_at)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {getMessagePreview()}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {gossipRoom.onlineCount > 0 && (
              <div className="flex items-center gap-1 text-green-500">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-medium">{gossipRoom.onlineCount}</span>
              </div>
            )}
          </div>
        </button>
      )}

      {/* Age Verification Dialog for Night Room */}
      <AlertDialog open={showAgeVerification} onOpenChange={setShowAgeVerification}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                <Moon className="w-8 h-8 text-white" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              ასაკობრივი შეზღუდვა
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">18+</span>
              </div>
              <p>
                ღამის ოთახი განკუთვნილია მხოლოდ სრულწლოვანი მომხმარებლებისთვის.
              </p>
              <p className="text-sm">
                გთხოვთ დაადასტუროთ თქვენი ასაკი:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              onClick={() => handleAgeConfirm(true)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800"
            >
              +18 (სრულწლოვანი ვარ)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleAgeConfirm(false)}
              className="w-full"
            >
              -18 (არასრულწლოვანი ვარ)
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupChatPreview;
