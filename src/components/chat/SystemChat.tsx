import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Home, Radio, ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SystemMessage {
  id: string;
  broadcast_id: string;
  delivery_status: string;
  delivered_at: string | null;
  seen_at: string | null;
  created_at: string;
  broadcast: {
    id: string;
    title: string | null;
    message: string;
    link_url: string | null;
    sent_at: string | null;
    created_at: string;
  };
}

interface SystemChatProps {
  onBack: () => void;
}

const SystemChat = ({ onBack }: SystemChatProps) => {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set());
  const [hiddenMessages, setHiddenMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchSystemMessages = async () => {
      if (!user) return;

      try {
        // Fetch all system messages for this user
        const { data, error } = await supabase
          .from('system_broadcast_recipients')
          .select(`
            id,
            broadcast_id,
            delivery_status,
            delivered_at,
            seen_at,
            created_at,
            broadcast:system_broadcasts!system_broadcast_recipients_broadcast_id_fkey (
              id,
              title,
              message,
              link_url,
              sent_at,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .eq('delivery_status', 'sent')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Filter out any null broadcasts and cast properly
        const validMessages = (data || []).filter(
          (msg): msg is SystemMessage => msg.broadcast !== null
        );

        setMessages(validMessages);

        // Count unread (not seen)
        const unread = validMessages.filter(m => !m.seen_at).length;
        setUnreadCount(unread);

        // Mark all as seen
        if (unread > 0) {
          await supabase
            .from('system_broadcast_recipients')
            .update({ seen_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .is('seen_at', null);
        }
      } catch (error) {
        console.error('Error fetching system messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemMessages();

    // Subscribe to new system messages
    const channel = supabase
      .channel('system-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_broadcast_recipients',
          filter: `user_id=eq.${user?.id}`,
        },
        async (payload) => {
          // Fetch the broadcast details for this new message
          const { data } = await supabase
            .from('system_broadcasts')
            .select('id, title, message, link_url, sent_at, created_at')
            .eq('id', payload.new.broadcast_id)
            .single();

          if (data) {
            const newMessage: SystemMessage = {
              id: payload.new.id,
              broadcast_id: payload.new.broadcast_id,
              delivery_status: payload.new.delivery_status,
              delivered_at: payload.new.delivered_at,
              seen_at: null,
              created_at: payload.new.created_at,
              broadcast: data,
            };
            setMessages((prev) => [...prev, newMessage]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getTimeString = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'ახლა';
    if (diffMins < 60) return `${diffMins} წთ წინ`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} სთ წინ`;
    return date.toLocaleDateString('ka-GE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleHidden = (id: string) => {
    setHiddenMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleMessages = messages.filter(m => !hiddenMessages.has(m.id));
  const hiddenCount = hiddenMessages.size;

  return (
    <div className="flex flex-col bg-background h-full overflow-hidden">
      {/* Header - Compact */}
      <div className="flex-shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => window.location.href = '/'} 
            className="p-1 hover:bg-secondary rounded-full transition-colors text-primary"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-xs">სისტემა</span>
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-amber-500/20 text-amber-600 border-amber-500/30">
                  System
                </Badge>
              </div>
            </div>
          </div>
        </div>
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setHiddenMessages(new Set())}
          >
            <Eye className="w-3 h-3 mr-1" />
            {hiddenCount} დამალული
          </Button>
        )}
      </div>

      {/* Messages - Compact */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="text-center py-8">
            <Radio className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-xs">{t.noSystemMessages}</p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isCollapsed = collapsedMessages.has(msg.id);
            
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[90%] w-full">
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        {msg.broadcast.title && (
                          <h4 className="font-medium text-[11px] text-amber-600 dark:text-amber-400 truncate">
                            {msg.broadcast.title}
                          </h4>
                        )}
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                          {getTimeString(msg.broadcast.sent_at || msg.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => toggleCollapse(msg.id)}
                          className="p-0.5 hover:bg-amber-500/10 rounded transition-colors"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <ChevronUp className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleHidden(msg.id)}
                          className="p-0.5 hover:bg-amber-500/10 rounded transition-colors"
                        >
                          <EyeOff className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <>
                        <p className="text-[11px] text-foreground/90 whitespace-pre-wrap mt-0.5 leading-tight">
                          {msg.broadcast.message}
                        </p>
                        {msg.broadcast.link_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1 h-5 text-[9px] gap-0.5 border-amber-500/30 hover:bg-amber-500/10 px-1.5"
                            onClick={() => window.open(msg.broadcast.link_url!, '_blank')}
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            გახსნა
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Compact */}
      <div className="flex-shrink-0 px-2 py-1 border-t border-border bg-muted/30">
        <div className="text-center text-[9px] text-muted-foreground">
          {t.systemMessages} • {t.readOnly}
        </div>
      </div>
    </div>
  );
};

export default SystemChat;
