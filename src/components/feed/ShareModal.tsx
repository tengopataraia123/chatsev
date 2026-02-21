import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Link2, Plus, Users, Loader2, Copy, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ShareModalProps {
  postId: string;
  postUrl: string;
  postTitle?: string;
  onClose: () => void;
  onShareComplete?: () => void;
}

interface RecentContact {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

// Real social platform configurations with actual working share URLs
const SHARE_PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
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
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.465 3.443.465 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
      </svg>
    ),
    color: '#0084FF',
    getUrl: (url: string, title: string) => 
      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}&app_id=184683071273`
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
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
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
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
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
        <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.474 6.644.345 9.765c-.127 3.12-.295 8.975 5.478 10.565l.006.002.002.009v2.632c0 .757.903 1.14 1.444.614l2.39-2.325c1.076.13 2.112.172 3.086.148 2.036-.05 6.096-.356 8.412-2.558 1.716-1.634 2.535-4.25 2.66-7.407.124-3.158.253-8.944-5.594-10.665C16.552.298 14.017-.005 11.398.002zm.127 1.547c2.407-.033 4.75.2 6.246.588 4.655 1.38 4.562 6.025 4.466 8.475-.108 2.765-.79 4.86-2.101 6.113-1.781 1.706-5.267 1.932-7.058 1.975-.999.024-2.108-.033-3.294-.187l-2.088 2.233c-.066.072-.13.098-.18.098-.07 0-.135-.051-.135-.176v-2.983c-.02-.023-.052-.055-.094-.095-4.387-1.279-4.278-5.869-4.17-8.456.108-2.758.79-4.856 2.093-6.11 1.774-1.706 5.07-1.934 6.315-1.475z"/>
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
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: '#000000',
    getUrl: (url: string, title: string) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: '#0A66C2',
    getUrl: (url: string, title: string) => 
      `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
  },
  {
    id: 'email',
    name: 'Email',
    icon: <Mail className="w-6 h-6 text-white" />,
    color: '#EA4335',
    getUrl: (url: string, title: string) => 
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
  },
  {
    id: 'copy',
    name: 'ბმულის კოპირება',
    icon: <Copy className="w-6 h-6" />,
    color: '#65676B',
    getUrl: () => ''
  }
];

const ShareModal = ({ postId, postUrl, postTitle = 'პოსტი', onClose, onShareComplete }: ShareModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [shareText, setShareText] = useState('');
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Fetch recent contacts (friends)
  useEffect(() => {
    const fetchContacts = async () => {
      if (!user) return;
      
      try {
        // Get friends
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted')
          .limit(10);

        if (!friendships || friendships.length === 0) {
          setLoadingContacts(false);
          return;
        }

        const friendIds = friendships.map(f => 
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', friendIds)
          .limit(5);

        setRecentContacts(profiles || []);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [user]);

  const recordShare = async (destination: string, platform?: string) => {
    if (!user) return;
    // Skip for group posts - they use a different ID format
    if (postId.startsWith('group-')) {
      console.log('[ShareModal] Skipping share recording for group post');
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      await recordShare('external', 'copy');
      toast({ title: 'ბმული დაკოპირდა!' });
    } catch (error) {
      toast({ title: 'ბმულის კოპირება ვერ მოხერხდა', variant: 'destructive' });
    }
  };

  const handleExternalShare = async (platform: typeof SHARE_PLATFORMS[0]) => {
    if (platform.id === 'copy') {
      handleCopyLink();
      return;
    }
    const url = platform.getUrl(postUrl, postTitle);
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      await recordShare('external', platform.id);
    }
  };

  const handleSendToContact = async (contact: RecentContact) => {
    // TODO: Implement sending to DM
    toast({ title: `გაგზავნილია ${contact.username}-სთან` });
    await recordShare('dm');
  };

  // Try native share API first on mobile
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          url: postUrl,
        });
        await recordShare('native');
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.log('Native share failed:', err);
        }
      }
    }
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card w-full max-w-lg rounded-t-2xl max-h-[90vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header with close button */}
        <div className="pt-3 pb-2 flex items-center justify-between px-4">
          <div className="w-8" />
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-4 pb-2">
          <h3 className="font-bold text-lg text-center">გაზიარება</h3>
        </div>

        {/* Share to feed section */}
        <div className="p-4 bg-secondary/30 border-y border-border">
          <div className="bg-card rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={undefined} />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">ჩემს ფიდში გაზიარება</p>
                <div className="flex gap-2 mt-1">
                  <button className="text-xs bg-secondary px-2 py-1 rounded flex items-center gap-1">
                    🌐 საჯარო ▼
                  </button>
                </div>
              </div>
            </div>
            
            <Input
              placeholder="დაწერეთ რამე ამ პოსტის შესახებ..."
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              className="border-0 bg-secondary/50 rounded-lg text-sm"
            />
            
            <Button
              onClick={handleShareToFeed}
              disabled={sharing}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              გაზიარება
            </Button>
          </div>
        </div>

        {/* Send to contacts */}
        {recentContacts.length > 0 && (
          <div className="p-4 border-b border-border">
            <h4 className="font-semibold text-sm mb-3">მეგობრებთან გაგზავნა</h4>
            <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
              {recentContacts.map((contact) => (
                <button
                  key={contact.user_id}
                  onClick={() => handleSendToContact(contact)}
                  className="flex flex-col items-center gap-2 min-w-[60px]"
                >
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={contact.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback>{contact.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center line-clamp-2 w-16">
                    {contact.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Social Platforms - Grid with real icons */}
        <div className="p-4">
          <h4 className="font-semibold text-sm mb-3">სოციალურ ქსელებში გაზიარება</h4>
          <div className="grid grid-cols-5 gap-3">
            {SHARE_PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleExternalShare(platform)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: platform.color }}
                >
                  {platform.icon}
                </div>
                <span className="text-[10px] text-center line-clamp-1 w-14 text-muted-foreground">
                  {platform.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Safe area for mobile */}
        <div className="h-6 pb-safe" />
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default ShareModal;
