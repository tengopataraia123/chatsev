import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Link2, Copy, Mail, Users, Loader2, Check, 
  Send, MessageCircle, ExternalLink, Share
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface EnhancedShareModalProps {
  postId: string;
  postUrl: string;
  postTitle?: string;
  postImage?: string | null;
  onClose: () => void;
  onShareComplete?: () => void;
}

interface RecentContact {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface Group {
  id: string;
  name: string;
  cover_url: string | null;
}

// Social platform configurations
const SHARE_PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: '#1877F2',
    getUrl: (url: string, title: string) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`
  },
  {
    id: 'messenger',
    name: 'Messenger',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.465 3.443.465 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
      </svg>
    ),
    color: '#0084FF',
    getUrl: (url: string) => 
      `fb-messenger://share/?link=${encodeURIComponent(url)}`
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    color: '#25D366',
    getUrl: (url: string, title: string) => 
      `https://wa.me/?text=${encodeURIComponent(title + '\n\n' + url)}`
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    color: '#0088CC',
    getUrl: (url: string, title: string) => 
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  {
    id: 'viber',
    name: 'Viber',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.474 6.644.345 9.765c-.127 3.12-.295 8.975 5.478 10.565l.006.002.002.009v2.632c0 .757.903 1.14 1.444.614l2.39-2.325c1.076.13 2.112.172 3.086.148 2.036-.05 6.096-.356 8.412-2.558 1.716-1.634 2.535-4.25 2.66-7.407.124-3.158.253-8.944-5.594-10.665C16.552.298 14.017-.005 11.398.002z"/>
      </svg>
    ),
    color: '#7360F2',
    getUrl: (url: string, title: string) => 
      `viber://forward?text=${encodeURIComponent(title + '\n\n' + url)}`
  },
  {
    id: 'twitter',
    name: 'X',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: '#000000',
    getUrl: (url: string, title: string) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    color: '#000000',
    getUrl: (url: string) => url // TikTok doesn't have direct share URL, will copy link
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: '#0A66C2',
    getUrl: (url: string, title: string) => 
      `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
  }
];

const EnhancedShareModal = ({ 
  postId, 
  postUrl, 
  postTitle = 'პოსტი',
  postImage,
  onClose, 
  onShareComplete 
}: EnhancedShareModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'external'>('feed');
  const [sharing, setSharing] = useState(false);
  const [shareText, setShareText] = useState('');
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  // Fetch contacts and groups
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Get friends
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted')
          .limit(20);

        if (friendships && friendships.length > 0) {
          const friendIds = friendships.map(f => 
            f.requester_id === user.id ? f.addressee_id : f.requester_id
          );

          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', friendIds);

          setRecentContacts(profiles || []);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchData();
  }, [user]);

  const recordShare = async (destination: string, platform?: string) => {
    if (!user) return;
    // Skip for group posts
    if (postId.startsWith('group-')) {
      console.log('[EnhancedShareModal] Skipping share recording for group post');
      return;
    }
    try {
      await supabase.from('post_shares').insert({
        post_id: postId,
        user_id: user.id,
        destination,
        platform
      });
    } catch (error) {
      console.error('Error recording share:', error);
    }
  };

  const handleShareToFeed = async () => {
    if (!user) {
      toast({ title: 'გთხოვთ შეხვიდეთ ანგარიშზე', variant: 'destructive' });
      return;
    }
    
    // Skip for group posts
    if (postId.startsWith('group-')) {
      toast({ title: 'ჯგუფის პოსტის გაზიარება შეუძლებელია', variant: 'destructive' });
      return;
    }
    
    setSharing(true);
    try {
      // Record share in post_shares table (Facebook-style share)
      // This will show in the user's activity feed with the original post embedded
      const { error: shareError } = await supabase.from('post_shares').insert({
        post_id: postId,
        user_id: user.id,
        destination: 'feed',
        share_text: shareText || null
      });

      if (shareError) {
        console.error('Share error:', shareError);
        throw shareError;
      }
      
      toast({ title: 'პოსტი გაზიარდა ფიდში!' });
      onShareComplete?.();
      onClose();
    } catch (error) {
      console.error('Error sharing to feed:', error);
      toast({ title: 'შეცდომა გაზიარებისას', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  // Group sharing removed - groups module deleted

  const handleSendToFriends = async () => {
    if (!user || selectedFriends.size === 0) return;
    
    setSharing(true);
    try {
      // Send as DM to each selected friend
      for (const friendId of selectedFriends) {
        // Find or create conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user.id})`)
          .maybeSingle();

        let convId = existingConv?.id;

        if (!convId) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ user1_id: user.id, user2_id: friendId })
            .select('id')
            .single();
          convId = newConv?.id;
        }

        if (convId) {
          await supabase.from('private_messages').insert({
            conversation_id: convId,
            sender_id: user.id,
            receiver_id: friendId,
            content: `${shareText ? shareText + '\n\n' : ''}🔗 ${postUrl}`
          });
        }
      }
      
      await recordShare('dm');
      toast({ title: `გაგზავნილია ${selectedFriends.size} მეგობართან!` });
      onShareComplete?.();
      onClose();
    } catch (error) {
      console.error('Error sending to friends:', error);
      toast({ title: 'შეცდომა გაგზავნისას', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      await recordShare('external', 'copy');
      toast({ title: 'ბმული დაკოპირდა!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: 'ბმულის კოპირება ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  const handleExternalShare = async (platform: typeof SHARE_PLATFORMS[0]) => {
    if (platform.id === 'tiktok') {
      handleCopyLink();
      return;
    }
    
    const url = platform.getUrl(postUrl, postTitle);
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      await recordShare('external', platform.id);
    }
  };

  // Try native share API
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          text: shareText || postTitle,
          url: postUrl,
        });
        await recordShare('native');
        onShareComplete?.();
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.log('Native share cancelled');
        }
      }
    }
  }, [postTitle, postUrl, shareText]);

  const toggleFriend = (friendId: string) => {
    const newSet = new Set(selectedFriends);
    if (newSet.has(friendId)) {
      newSet.delete(friendId);
    } else {
      newSet.add(friendId);
    }
    setSelectedFriends(newSet);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-lg">გაზიარება</h3>
          <div className="flex items-center gap-2">
            {typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
                title="სისტემური გაზიარება"
              >
                <Share className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: 'feed', label: 'ფიდი', icon: <Send className="w-4 h-4" /> },
            { id: 'friends', label: 'მეგობრები', icon: <MessageCircle className="w-4 h-4" /> },
            { id: 'external', label: 'გარე', icon: <ExternalLink className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Share text input (shown for feed, friends, groups) */}
          {activeTab !== 'external' && (
            <Textarea
              placeholder="დაწერე რამე ამ პოსტის შესახებ..."
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              className="mb-4 bg-secondary border-0 resize-none"
              rows={2}
            />
          )}

          {/* Feed Share */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {postImage && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img src={postImage} alt="" className="w-full h-32 object-cover" />
                </div>
              )}
              <Button
                onClick={handleShareToFeed}
                disabled={sharing}
                className="w-full"
              >
                {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                ფიდში გაზიარება
              </Button>
            </div>
          )}

          {/* Friends Share */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {loadingContacts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : recentContacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  მეგობრები არ გყავთ
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {recentContacts.map((contact) => (
                      <button
                        key={contact.user_id}
                        onClick={() => toggleFriend(contact.user_id)}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="relative">
                          <Avatar className={`w-14 h-14 transition-all ${
                            selectedFriends.has(contact.user_id) ? 'ring-2 ring-primary ring-offset-2' : ''
                          }`}>
                            <AvatarImage src={contact.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback>{contact.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {selectedFriends.has(contact.user_id) && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-center line-clamp-1 w-16">
                          {contact.username}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedFriends.size > 0 && (
                    <Button
                      onClick={handleSendToFriends}
                      disabled={sharing}
                      className="w-full"
                    >
                      {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      გაგზავნა ({selectedFriends.size})
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Groups Share removed - groups module deleted */}

          {/* External Share */}
          {activeTab === 'external' && (
            <div className="space-y-4">
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </div>
                <span className="font-medium">{copied ? 'დაკოპირდა!' : 'ბმულის კოპირება'}</span>
              </button>

              {/* Social Platforms Grid */}
              <div className="grid grid-cols-4 gap-4">
                {SHARE_PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleExternalShare(platform)}
                    className="flex flex-col items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <span className="text-[10px] text-center text-muted-foreground">
                      {platform.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Safe area */}
        <div className="h-6 pb-safe" />
      </motion.div>
    </motion.div>
  );
};

export default EnhancedShareModal;
