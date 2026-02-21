import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, X, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
}

interface GameMiniChatProps {
  gameId: string;
  gameType: 'durak' | 'joker' | 'domino' | 'nardi' | 'bura';
  playerNames?: Record<string, string>;
}

const GameMiniChat = memo(function GameMiniChat({ gameId, gameType, playerNames = {} }: GameMiniChatProps) {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastReadTimeRef = useRef<Date>(new Date());

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('game_chat_messages')
      .select('*')
      .eq('game_id', gameId)
      .eq('game_type', gameType)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) {
      // Enrich with usernames
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

      setMessages(data.map(m => ({
        ...m,
        username: playerNames[m.user_id] || usernameMap.get(m.user_id) || 'მომხმარებელი'
      })));
    }
  }, [gameId, gameType, playerNames]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`game-chat-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chat_messages',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Get username
          let username = playerNames[newMsg.user_id];
          if (!username) {
            const { data } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', newMsg.user_id)
              .single();
            username = data?.username || 'მომხმარებელი';
          }

          setMessages(prev => [...prev, { ...newMsg, username }]);
          
          // Count unread if chat is closed and message is from others
          if (!isOpen && newMsg.user_id !== user?.id) {
            setUnreadCount(prev => prev + 1);
          }

          // Scroll to bottom
          setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, playerNames, isOpen, user?.id]);

  // Reset unread when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      lastReadTimeRef.current = new Date();
    }
  }, [isOpen]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('game_chat_messages')
        .insert({
          game_id: gameId,
          game_type: gameType,
          user_id: user.id,
          content
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-20 right-3 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-14 right-0 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border">
              <span className="font-semibold text-sm">💬 თამაშის ჩატი</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="h-64 p-2">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-8">
                  ჯერ არაა შეტყობინება
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => {
                    const isMe = msg.user_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col',
                          isMe ? 'items-end' : 'items-start'
                        )}
                      >
                        <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                          {msg.username}
                        </span>
                        <div
                          className={cn(
                            'max-w-[85%] px-2.5 py-1.5 rounded-xl text-xs',
                            isMe
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-secondary rounded-bl-sm'
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="flex items-center gap-2 p-2 border-t border-border">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="შეტყობინება..."
                className="h-8 text-sm"
                maxLength={200}
              />
              <Button
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          'h-12 w-12 rounded-full shadow-lg',
          isOpen ? 'bg-primary' : 'bg-card border border-border'
        )}
      >
        {isOpen ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <div className="relative">
            <MessageCircle className={cn('w-5 h-5', !isOpen && 'text-primary')} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </Button>
    </div>
  );
});

export default GameMiniChat;
