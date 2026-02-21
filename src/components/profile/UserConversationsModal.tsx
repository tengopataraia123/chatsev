import { useState, useEffect } from 'react';
import { X, Loader2, MessageSquare, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface Conversation {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherAvatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  messageCount: number;
}

interface Message {
  id: string;
  content: string | null;
  sender_id: string;
  created_at: string;
  senderUsername?: string;
  senderAvatarUrl?: string | null;
}

interface UserConversationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

const UserConversationsModal = ({ isOpen, onClose, userId, username }: UserConversationsModalProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchConversations();
    }
  }, [isOpen, userId]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Get all conversations where user is involved
      const { data: convData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get other user profiles and last message for each conversation
      const conversationsWithDetails: Conversation[] = [];

      for (const conv of convData || []) {
        const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

        // Get other user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('user_id', otherUserId)
          .maybeSingle();

        // Get last message and count
        const { data: lastMsg } = await supabase
          .from('private_messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from('private_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        conversationsWithDetails.push({
          id: conv.id,
          otherUserId,
          otherUsername: profileData?.username || 'უცნობი',
          otherAvatarUrl: profileData?.avatar_url,
          lastMessage: lastMsg?.content,
          lastMessageAt: lastMsg?.created_at,
          messageCount: count || 0
        });
      }

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data: messagesData, error } = await supabase
        .from('private_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profiles for all senders
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const messagesWithProfiles = messagesData?.map(msg => ({
        ...msg,
        senderUsername: profileMap.get(msg.sender_id)?.username || 'უცნობი',
        senderAvatarUrl: profileMap.get(msg.sender_id)?.avatar_url
      })) || [];

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-500" />
            <span className="font-semibold">
              {selectedConversation 
                ? `${username} ↔ ${selectedConversation.otherUsername}` 
                : `${username}-ის მიმოწერები`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedConversation && (
              <button
                onClick={handleBack}
                className="px-3 py-1 text-sm bg-secondary rounded-lg"
              >
                უკან
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : selectedConversation ? (
            // Messages view
            <div className="p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  მესიჯები არ მოიძებნა
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 ${msg.sender_id === userId ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <img
                      src={msg.senderAvatarUrl || '/placeholder.svg'}
                      alt={msg.senderUsername}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className={`flex flex-col ${msg.sender_id === userId ? 'items-start' : 'items-end'}`}>
                      <span className="text-xs text-muted-foreground mb-1">
                        {msg.senderUsername} • {format(new Date(msg.created_at), 'dd MMM, HH:mm', { locale: ka })}
                      </span>
                      <div className={`px-3 py-2 rounded-lg max-w-xs ${
                        msg.sender_id === userId 
                          ? 'bg-secondary text-foreground' 
                          : 'bg-primary/20 text-foreground'
                      }`}>
                        {msg.content || '[მედია]'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Conversations list
            <div className="divide-y divide-border">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  მომხმარებელს მიმოწერები არ აქვს
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <img
                      src={conv.otherAvatarUrl || '/placeholder.svg'}
                      alt={conv.otherUsername}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{conv.otherUsername}</span>
                        <span className="text-xs text-muted-foreground">
                          {conv.messageCount} მესიჯი
                        </span>
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      )}
                      {conv.lastMessageAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(conv.lastMessageAt), 'dd MMM, HH:mm', { locale: ka })}
                        </p>
                      )}
                    </div>
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserConversationsModal;
