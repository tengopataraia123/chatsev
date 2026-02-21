/**
 * Inspector Messaging View - For CHEGE and P ი კ ა S ო only
 * Allows viewing other users' private messages via Edge Function
 * P ი კ ა S ო cannot see CHEGE's messages
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, ArrowLeft, Eye, Image, Video, Mic, FileText, AlertCircle, Link2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface InspectorMessagingViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
}

interface ConversationData {
  id: string;
  other_user: {
    user_id: string;
    username: string;
    avatar_url: string | null;
    last_seen: string | null;
  };
  last_message: string | null;
  last_message_time: string | null;
  message_count: number;
  is_deleted_by_target?: boolean;
  deleted_by_target_at?: string | null;
  is_deleted_by_other?: boolean;
  deleted_by_other_at?: string | null;
}

interface MessageData {
  id: string;
  content: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  voice_url: string | null;
  gif_id: string | null;
  gif_url?: string | null;
  sender_id: string;
  sender_username: string;
  sender_avatar: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_for_everyone?: boolean;
}

// URL detection regex
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;

// Extract URLs from text
const extractUrls = (text: string | null): string[] => {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  return matches ? matches : [];
};

// Render content with clickable links
const renderContentWithLinks = (content: string | null) => {
  if (!content) return null;
  
  const parts = content.split(URL_REGEX);
  const urls = extractUrls(content);
  
  return parts.map((part, index) => {
    if (urls.includes(part)) {
      return (
        <a 
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export default function InspectorMessagingView({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
}: InspectorMessagingViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [gifCache, setGifCache] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0 && !loadingMessages) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages, loadingMessages]);

  // Fetch GIF URLs for messages that have gif_id
  const fetchGifUrls = useCallback(async (gifIds: string[]) => {
    if (gifIds.length === 0) return;
    
    const uncachedIds = gifIds.filter(id => !gifCache[id]);
    if (uncachedIds.length === 0) return;

    try {
      const { data: gifs } = await supabase
        .from('gifs')
        .select('id, file_original, file_preview')
        .in('id', uncachedIds);

      if (gifs) {
        const newCache: Record<string, string> = {};
        gifs.forEach(gif => {
          // Use file_preview or file_original as the URL
          newCache[gif.id] = gif.file_preview || gif.file_original || '';
        });
        setGifCache(prev => ({ ...prev, ...newCache }));
      }
    } catch (err) {
      console.error('Error fetching GIF URLs:', err);
    }
  }, [gifCache]);

  // Fetch target user's conversations via Edge Function
  const fetchConversations = useCallback(async () => {
    if (!targetUserId || !user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('inspect-messages', {
        body: {
          action: 'get_conversations',
          target_user_id: targetUserId
        }
      });
      
      if (fnError) {
        console.error('Edge function error:', fnError);
        setError('შეცდომა მონაცემების მიღებისას');
        return;
      }
      
      if (data?.error) {
        console.error('API error:', data.error);
        setError(data.error);
        return;
      }
      
      setConversations(data?.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('შეცდომა მონაცემების მიღებისას');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user?.id]);

  // Fetch messages for selected conversation via Edge Function
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!targetUserId || !user?.id) return;
    
    setLoadingMessages(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('inspect-messages', {
        body: {
          action: 'get_messages',
          target_user_id: targetUserId,
          conversation_id: conversationId
        }
      });
      
      if (fnError) {
        console.error('Edge function error:', fnError);
        setError('შეცდომა შეტყობინებების მიღებისას');
        return;
      }
      
      if (data?.error) {
        console.error('API error:', data.error);
        setError(data.error);
        return;
      }
      
      const msgs = data?.messages || [];
      setMessages(msgs);

      // Fetch GIF URLs for messages with gif_id
      const gifIds = msgs.filter((m: MessageData) => m.gif_id).map((m: MessageData) => m.gif_id as string);
      if (gifIds.length > 0) {
        fetchGifUrls(gifIds);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('შეცდომა შეტყობინებების მიღებისას');
    } finally {
      setLoadingMessages(false);
    }
  }, [targetUserId, user?.id, fetchGifUrls]);

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  const handleClose = () => {
    setSelectedConversation(null);
    setMessages([]);
    setError(null);
    onOpenChange(false);
  };

  const handleNavigateToProfile = (userId: string) => {
    handleClose();
    navigate(`/?view=profile&userId=${userId}`);
  };

  // Render media content
  const renderMediaContent = (msg: MessageData) => {
    const elements: JSX.Element[] = [];

    // Images
    if (msg.image_urls && msg.image_urls.length > 0) {
      elements.push(
        <div key="images" className="mt-2 space-y-2">
          {msg.image_urls.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
              <img 
                src={url} 
                alt="attachment" 
                className="max-w-full rounded-lg max-h-64 object-cover hover:opacity-90 transition-opacity cursor-pointer"
              />
            </a>
          ))}
        </div>
      );
    }

    // Video
    if (msg.video_url) {
      elements.push(
        <div key="video" className="mt-2">
          <video 
            src={msg.video_url}
            controls
            className="max-w-full rounded-lg max-h-64"
            preload="metadata"
          >
            <source src={msg.video_url} type="video/mp4" />
          </video>
          <a 
            href={msg.video_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline mt-1 flex items-center gap-1"
          >
            <Video className="w-3 h-3" />
            ვიდეოს გახსნა
          </a>
        </div>
      );
    }

    // Voice/Audio
    if (msg.voice_url) {
      elements.push(
        <div key="voice" className="mt-2">
          <div className="flex items-center gap-2 bg-black/20 rounded-lg p-2">
            <Mic className="w-5 h-5 text-green-400 flex-shrink-0" />
            <audio 
              src={msg.voice_url}
              controls
              className="h-8 w-full max-w-[200px]"
              preload="metadata"
            />
          </div>
          <a 
            href={msg.voice_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-green-400 hover:underline mt-1 flex items-center gap-1"
          >
            <Mic className="w-3 h-3" />
            აუდიოს გახსნა
          </a>
        </div>
      );
    }

    // GIF
    if (msg.gif_id) {
      const gifUrl = gifCache[msg.gif_id] || msg.gif_url;
      if (gifUrl) {
        elements.push(
          <div key="gif" className="mt-2">
            <a href={gifUrl} target="_blank" rel="noopener noreferrer">
              <img 
                src={gifUrl} 
                alt="GIF" 
                className="max-w-full rounded-lg max-h-48 object-contain hover:opacity-90 transition-opacity cursor-pointer"
              />
            </a>
          </div>
        );
      } else {
        elements.push(
          <div key="gif-placeholder" className="mt-2 flex items-center gap-2 text-orange-400 bg-orange-500/10 rounded-lg p-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm">GIF (ID: {msg.gif_id.slice(0, 8)}...)</span>
          </div>
        );
      }
    }

    // Extract and show links from content
    const urls = extractUrls(msg.content);
    if (urls.length > 0) {
      elements.push(
        <div key="links" className="mt-2 space-y-1">
          {urls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 rounded p-1.5">
              <Link2 className="w-3 h-3 flex-shrink-0" />
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline truncate"
              >
                {url.length > 50 ? url.slice(0, 50) + '...' : url}
              </a>
            </div>
          ))}
        </div>
      );
    }

    return elements;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {selectedConversation && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setSelectedConversation(null);
                  setMessages([]);
                  setError(null);
                }}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Eye className="w-5 h-5 text-amber-500" />
            <DialogTitle className="flex items-center gap-2">
              {selectedConversation ? (
                <>
                  <span>{targetUsername}</span>
                  <span className="text-muted-foreground">↔</span>
                  <span>{selectedConversation.other_user.username}</span>
                </>
              ) : (
                <>
                  <span>{targetUsername}</span>
                  <span className="text-muted-foreground text-sm">- პირადი მიმოწერა</span>
                </>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 overflow-y-auto overscroll-contain" 
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-destructive/50 mb-4" />
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => selectedConversation ? fetchMessages(selectedConversation.id) : fetchConversations()}
                className="mt-4"
              >
                ხელახლა ცდა
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedConversation ? (
            // Messages view
            <div className="p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  შეტყობინებები არ არის
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isTargetUser = msg.sender_id === targetUserId;
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex flex-col gap-1 p-3 rounded-xl max-w-[85%]",
                          isTargetUser 
                            ? "ml-auto bg-primary/10 border border-primary/20" 
                            : "mr-auto bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar 
                            className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToProfile(msg.sender_id);
                            }}
                          >
                            <AvatarImage src={msg.sender_avatar || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {msg.sender_username?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span 
                            className="font-medium text-foreground cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToProfile(msg.sender_id);
                            }}
                          >
                            {msg.sender_username}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(msg.created_at), { 
                              addSuffix: true, 
                              locale: ka 
                            })}
                          </span>
                        </div>
                        
                        <div className={cn(
                          "text-sm",
                          msg.is_deleted && "border-l-2 border-destructive pl-2"
                        )}>
                          {msg.is_deleted && (
                            <span className="text-destructive text-[10px] font-semibold uppercase tracking-wide block mb-1">
                              🗑️ წაშლილი {msg.deleted_for_everyone ? '(ყველასთვის)' : '(პირადი)'}
                            </span>
                          )}
                          {msg.content ? (
                            <p className={cn(
                              "whitespace-pre-wrap break-words",
                              msg.is_deleted && "opacity-80"
                            )}>
                              {renderContentWithLinks(msg.content)}
                            </p>
                          ) : !msg.is_deleted ? null : (
                            <p className="text-muted-foreground italic text-xs">კონტენტი არ არის შენახული</p>
                          )}
                          {renderMediaContent(msg)}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          ) : (
            // Conversations list
            <div className="divide-y">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">მიმოწერა არ არის</p>
                </div>
              ) : (
              conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left",
                      (conv.is_deleted_by_target || conv.is_deleted_by_other) && "border-l-2 border-destructive bg-destructive/5"
                    )}
                  >
                    <Avatar 
                      className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToProfile(conv.other_user.user_id);
                      }}
                    >
                      <AvatarImage src={conv.other_user.avatar_url || undefined} />
                      <AvatarFallback>
                        {conv.other_user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                     
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="font-medium truncate cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToProfile(conv.other_user.user_id);
                          }}
                        >
                          {conv.other_user.username}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {conv.message_count} შეტყობინება
                        </Badge>
                        {conv.is_deleted_by_target && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            🗑️ წაშლილია ({targetUsername})
                          </Badge>
                        )}
                        {conv.is_deleted_by_other && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            🗑️ წაშლილია ({conv.other_user.username})
                          </Badge>
                        )}
                      </div>
                      
                      {conv.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message}
                        </p>
                      )}
                      
                      {conv.last_message_time && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(conv.last_message_time), { 
                            addSuffix: true, 
                            locale: ka 
                          })}
                        </p>
                      )}
                    </div>
                    
                    <Eye className="w-4 h-4 text-amber-500/50 shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
