import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import StyledUsername from '@/components/username/StyledUsername';
import MentionHighlightedText from './MentionHighlightedText';
import GifPicker from '@/components/gif/GifPicker';
import { extractAllGifShortcodes, findGifByShortcode, recordGifUsage } from '@/lib/gifShortcodes';

interface ThreadMessage {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  gif_id: string | null;
  created_at: string;
  is_deleted: boolean;
  is_anonymous?: boolean;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  gif?: {
    id: string;
    file_original: string;
    file_preview: string | null;
    title: string;
  } | null;
}

interface ThreadViewProps {
  parentMessage: ThreadMessage;
  roomType: string;
  currentUserId: string;
  currentUsername: string;
  onClose: () => void;
  onNavigateToProfile?: (userId: string) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const ROOM_TABLES: Record<string, string> = {
  gossip: 'group_chat_messages',
  night: 'night_room_messages',
  emigrants: 'emigrants_room_messages',
  dj: 'dj_room_messages',
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
};

const ThreadView = memo(({ parentMessage, roomType, currentUserId, currentUsername, onClose, onNavigateToProfile, isAdmin, isSuperAdmin }: ThreadViewProps) => {
  const messagesTable = ROOM_TABLES[roomType] || 'group_chat_messages';
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { session, profile } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchReplies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(messagesTable as any)
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .eq('reply_to_id', parentMessage.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data as any[])?.map((m: any) => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const threaded = (data as any[] || []).map((msg: any) => ({
        ...msg,
        profile: profileMap.get(msg.user_id) || { username: 'Unknown', avatar_url: null },
      }));

      setReplies(threaded);
    } catch (err) {
      console.error('Error fetching thread replies:', err);
    } finally {
      setLoading(false);
    }
  }, [messagesTable, parentMessage.id]);

  useEffect(() => {
    fetchReplies();

    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: messagesTable,
        filter: `reply_to_id=eq.${parentMessage.id}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.user_id === session?.user?.id) return;
        
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .eq('user_id', newMsg.user_id)
          .maybeSingle();

        let gifData = null;
        if (newMsg.gif_id) {
          const { data } = await supabase.from('gifs').select('id, file_original, file_preview, title').eq('id', newMsg.gif_id).maybeSingle();
          gifData = data;
        }

        setReplies(prev => [...prev, { ...newMsg, profile: prof || { username: 'Unknown', avatar_url: null }, gif: gifData }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchReplies, messagesTable, parentMessage.id, session?.user?.id]);

  useEffect(() => { scrollToBottom(); }, [replies]);

  const handleSend = async () => {
    if (!replyText.trim() || !session?.user?.id) return;
    setSending(true);
    try {
      let processedContent = replyText.trim();
      const allShortcodes = extractAllGifShortcodes(processedContent);
      let firstGifId: string | null = null;

      for (const shortcode of allShortcodes) {
        const gif = await findGifByShortcode(shortcode);
        if (gif) {
          if (!firstGifId) firstGifId = gif.id;
          await recordGifUsage(gif.id, session.user.id);
          processedContent = processedContent.replace(shortcode, `[GIF:${gif.file_original}]`);
        }
      }

      const { data: inserted, error } = await supabase
        .from(messagesTable as any)
        .insert({
          user_id: session.user.id,
          content: processedContent || null,
          reply_to_id: parentMessage.id,
          gif_id: firstGifId,
        })
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .single();

      if (error) throw error;

      if (inserted) {
        setReplies(prev => [...prev, {
          ...(inserted as any),
          profile: { username: profile?.username || 'Unknown', avatar_url: profile?.avatar_url || null },
        }]);
      }
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleSendGif = async (gif: any) => {
    if (!session?.user?.id) return;
    setSending(true);
    try {
      const { data: inserted, error } = await supabase
        .from(messagesTable as any)
        .insert({
          user_id: session.user.id,
          gif_id: gif.id,
          reply_to_id: parentMessage.id,
        })
        .select('*, gif:gifs(id, file_original, file_preview, title)')
        .single();

      if (error) throw error;

      if (inserted) {
        setReplies(prev => [...prev, {
          ...(inserted as any),
          profile: { username: profile?.username || 'Unknown', avatar_url: profile?.avatar_url || null },
        }]);
      }
      await recordGifUsage(gif.id, session.user.id);
      setShowGifPicker(false);
    } catch (err) {
      console.error('Error sending GIF in thread:', err);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (msg: ThreadMessage, isParent = false) => {
    const showAnon = msg.is_anonymous && !isSuperAdmin;
    const displayName = showAnon ? 'ანონიმი' : msg.profile?.username || 'Unknown';
    const displayAvatar = showAnon ? null : msg.profile?.avatar_url;

    return (
      <div key={msg.id} className={`flex gap-2 px-3 py-1.5 ${isParent ? 'bg-primary/5 border-b border-border' : ''}`}>
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarImage src={displayAvatar || undefined} />
          <AvatarFallback className={`text-[10px] ${showAnon ? 'bg-violet-500/20 text-violet-500' : 'bg-gradient-to-br from-primary to-accent text-white'}`}>
            {showAnon ? '?' : displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">
              {showAnon ? (
                <span className="text-violet-500">ანონიმი</span>
              ) : (
                <StyledUsername userId={msg.user_id} username={displayName} className="text-xs" />
              )}
            </span>
            {msg.is_anonymous && isSuperAdmin && (
              <span className="text-[9px] bg-violet-500/20 text-violet-500 px-1 rounded">👁 {msg.profile?.username}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
          </div>
          {msg.is_deleted ? (
            <span className="text-xs text-muted-foreground italic">წაშლილი</span>
          ) : (
            <>
              {msg.content && (
                <p className="text-sm leading-snug break-words">
                  <MentionHighlightedText content={msg.content} messageAuthorId={msg.user_id} currentUsername={undefined} />
                </p>
              )}
              {msg.gif && (
                <img src={msg.gif.file_original} alt={msg.gif.title} className="max-w-[200px] max-h-[150px] rounded-lg mt-1" />
              )}
              {msg.image_url && !msg.content?.includes('🎤') && (
                <img src={msg.image_url} alt="" className="max-w-[200px] max-h-[150px] rounded-lg mt-1 object-cover" />
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col lg:inset-auto lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:w-[400px] lg:shadow-xl lg:border-l lg:border-border">
      {/* Header */}
      <div className="flex-none h-12 border-b border-border bg-card flex items-center px-3 gap-2">
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm flex-1">თრედი</span>
        <span className="text-xs text-muted-foreground">{replies.length} პასუხი</span>
      </div>

      {/* Parent message */}
      <div className="flex-none">
        {renderMessage(parentMessage, true)}
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">ჯერ არ არის პასუხები</p>
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            {replies.map(msg => renderMessage(msg))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="flex-none">
          <GifPicker onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />
        </div>
      )}

      {/* Reply input */}
      <div className="flex-none border-t border-border p-2 bg-card">
        <div className="flex items-end gap-1.5">
          <button
            onClick={() => setShowGifPicker(true)}
            className="px-2 py-1 hover:bg-muted rounded-full transition-colors text-xs font-bold text-muted-foreground"
          >
            GIF
          </button>
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
              if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="პასუხი..."
            rows={1}
            className="flex-1 min-h-[44px] max-h-[100px] py-2.5 px-3 resize-none bg-muted/50 border-0 focus-visible:ring-1 text-base"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !replyText.trim()}
            className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

ThreadView.displayName = 'ThreadView';

export default ThreadView;
