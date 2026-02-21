import { useState, useEffect, memo, useCallback } from 'react';
import { Users, ChevronRight, Sparkles, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useOnlineGracePeriod, getOnlineCutoffTime } from '@/hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AIChatSevButton from '@/components/ai/AIChatSevButton';

interface DesktopRightPanelProps {
  onUserClick: (userId: string) => void;
}

interface OnlineUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  gender: string;
}

interface SuggestedUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  gender: string;
}

const DesktopRightPanel = memo(({ onUserClick }: DesktopRightPanelProps) => {
  const { user } = useAuth();
  const { gracePeriodMinutes } = useOnlineGracePeriod();
  const [onlineFriends, setOnlineFriends] = useState<OnlineUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [openSections, setOpenSections] = useState({
    online: true,
    suggested: true,
  });

  const fetchOnlineFriends = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const cutoffTime = getOnlineCutoffTime(gracePeriodMinutes).toISOString();
      
      // Get user's friends (accepted friendships)
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships || friendships.length === 0) {
        setOnlineFriends([]);
        return;
      }

      // Extract friend IDs
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Get online friends
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, gender')
        .in('user_id', friendIds)
        .gte('last_seen', cutoffTime);

      if (data) {
        setOnlineFriends(data);
      }
    } catch (error) {
      console.error('Error fetching online friends:', error);
    }
  }, [user?.id, gracePeriodMinutes]);

  const fetchSuggestedUsers = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Get users who are NOT friends and have avatar
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const friendIds = new Set<string>();
      friendIds.add(user.id);
      friendships?.forEach(f => {
        friendIds.add(f.requester_id);
        friendIds.add(f.addressee_id);
      });

      // Get random users with photos, prioritize females
      const { data: females } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, gender')
        .eq('gender', 'female')
        .not('avatar_url', 'is', null)
        .neq('avatar_url', '')
        .limit(50);

      const { data: males } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, gender')
        .eq('gender', 'male')
        .not('avatar_url', 'is', null)
        .neq('avatar_url', '')
        .limit(20);

      // Filter out friends and current user
      const availableFemales = (females || []).filter(u => !friendIds.has(u.user_id));
      const availableMales = (males || []).filter(u => !friendIds.has(u.user_id));

      // Shuffle and pick - more females than males
      const shuffled = (arr: SuggestedUser[]) => arr.sort(() => Math.random() - 0.5);
      
      const selectedFemales = shuffled(availableFemales).slice(0, 6);
      const selectedMales = shuffled(availableMales).slice(0, 2);
      
      const combined = shuffled([...selectedFemales, ...selectedMales]).slice(0, 8);
      setSuggestedUsers(combined);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOnlineFriends();
    fetchSuggestedUsers();

    const interval = setInterval(fetchOnlineFriends, 30000);
    return () => clearInterval(interval);
  }, [fetchOnlineFriends, fetchSuggestedUsers]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const refreshSuggested = () => {
    fetchSuggestedUsers();
  };

  const SectionHeader = ({ 
    icon: Icon, 
    title, 
    count, 
    isOpen,
    onToggle,
    color = 'primary'
  }: { 
    icon: any; 
    title: string; 
    count?: number;
    isOpen: boolean;
    onToggle: () => void;
    color?: 'primary' | 'accent' | 'online' | 'pink';
  }) => (
    <CollapsibleTrigger 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          color === 'online' && "bg-online/20 text-online",
          color === 'primary' && "bg-primary/20 text-primary",
          color === 'accent' && "bg-accent/20 text-accent",
          color === 'pink' && "bg-pink-500/20 text-pink-500"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold">{title}</span>
        {count !== undefined && (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            color === 'online' && "bg-online/20 text-online",
            color === 'primary' && "bg-primary/20 text-primary",
            color === 'pink' && "bg-pink-500/20 text-pink-500"
          )}>
            {count}
          </span>
        )}
      </div>
      <ChevronRight className={cn(
        "w-4 h-4 text-muted-foreground transition-transform",
        isOpen && "rotate-90"
      )} />
    </CollapsibleTrigger>
  );

  const OnlineUserItem = ({ u }: { u: OnlineUser }) => (
    <button
      onClick={() => onUserClick(u.user_id)}
      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-all duration-200 group"
    >
      <div className="relative">
        <Avatar className="w-9 h-9 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
          <AvatarImage src={u.avatar_url || ''} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {u.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online rounded-full border-2 border-card" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {u.username}
        </p>
      </div>
    </button>
  );

  const SuggestedUserItem = ({ u }: { u: SuggestedUser }) => (
    <button
      onClick={() => onUserClick(u.user_id)}
      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-all duration-200 group"
    >
      <Avatar className="w-9 h-9 ring-2 ring-transparent group-hover:ring-pink-500/30 transition-all">
        <AvatarImage src={u.avatar_url || ''} className="object-cover" />
        <AvatarFallback className="bg-pink-500/10 text-pink-500 text-xs">
          {u.username?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate group-hover:text-pink-500 transition-colors">
          {u.username}
        </p>
        <p className="text-[10px] text-muted-foreground">შესაძლო ნაცნობი</p>
      </div>
      <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-pink-500 transition-colors" />
    </button>
  );


  return (
    <aside className="w-[280px] h-[calc(100vh-56px)] sticky top-[56px] border-l border-border/10 bg-card/50 overflow-y-auto scrollbar-thin p-3 space-y-3">
      {/* AI ChatSev */}
      <AIChatSevButton variant="sidebar" />

      {/* Online Friends Section */}
      <Collapsible open={openSections.online}>
        <SectionHeader 
          icon={Users} 
          title="online მეგობრები" 
          count={onlineFriends.length}
          isOpen={openSections.online}
          onToggle={() => toggleSection('online')}
          color="online"
        />
        <CollapsibleContent className="mt-3 space-y-1">
          {onlineFriends.length > 0 ? (
            onlineFriends.slice(0, 10).map((u) => (
              <OnlineUserItem key={u.id} u={u} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                ამჟამად არცერთი მეგობარი არ არის online
              </p>
            </div>
          )}
          {onlineFriends.length > 10 && (
            <button className="w-full text-center text-xs text-primary hover:underline py-2 font-medium">
              ნახე ყველა ({onlineFriends.length})
            </button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Suggested Users Section */}
      <Collapsible open={openSections.suggested}>
        <SectionHeader 
          icon={UserPlus} 
          title="შესაძლო ნაცნობები" 
          count={suggestedUsers.length}
          isOpen={openSections.suggested}
          onToggle={() => toggleSection('suggested')}
          color="pink"
        />
        <CollapsibleContent className="mt-3 space-y-1">
          {suggestedUsers.length > 0 ? (
            <>
              {suggestedUsers.map((u) => (
                <SuggestedUserItem key={u.id} u={u} />
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshSuggested}
                className="w-full text-xs text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 mt-2"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                განაახლე სია
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <UserPlus className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                შემოთავაზებები არ მოიძებნა
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Promo Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-primary/8 p-5 border border-primary/10">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">ChatSev</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            შეუერთდი საქართველოს უდიდეს სოციალურ ქსელს და გაიცანი ახალი ადამიანები!
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border/10">
        <p className="text-[10px] text-muted-foreground text-center">
          ChatSev © 2026 • ყველა უფლება დაცულია
        </p>
      </div>
    </aside>
  );
});

DesktopRightPanel.displayName = 'DesktopRightPanel';

export default DesktopRightPanel;
