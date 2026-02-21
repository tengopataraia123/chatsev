import { useState, useEffect } from 'react';
import { ArrowLeft, Crown, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import VipBadge from '@/components/vip/VipBadge';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface VipMember {
  user_id: string;
  vip_type: string;
  expires_at: string;
  username: string;
  avatar_url: string | null;
}

interface VipMembersViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

const VipMembersView = ({ onBack, onUserClick }: VipMembersViewProps) => {
  const [members, setMembers] = useState<VipMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVipMembers = async () => {
      const { data } = await supabase
        .from('vip_purchases')
        .select('user_id, vip_type, expires_at')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false });

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        // Deduplicate - one entry per user (latest)
        const seen = new Set<string>();
        const enriched: VipMember[] = [];
        for (const vip of data) {
          if (seen.has(vip.user_id)) continue;
          seen.add(vip.user_id);
          const p = profileMap.get(vip.user_id);
          enriched.push({
            ...vip,
            username: p?.username || 'მომხმარებელი',
            avatar_url: p?.avatar_url || null,
          });
        }
        setMembers(enriched);
      }
      setLoading(false);
    };
    fetchVipMembers();
  }, []);

  const vipOrder = ['vip_diamond', 'vip_gold', 'vip_silver', 'vip_bronze'];
  const sorted = [...members].sort((a, b) => vipOrder.indexOf(a.vip_type) - vipOrder.indexOf(b.vip_type));

  return (
    <ScrollArea className="h-[calc(100vh-80px)]">
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-secondary/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            VIP მომხმარებლები
          </h1>
          <Badge variant="secondary" className="ml-auto">{members.length}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">ჯერ VIP მომხმარებლები არ არიან</p>
            <p className="text-xs text-muted-foreground mt-1">აქტივობის ქულებით შეგიძლია VIP შეიძინო!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((member) => (
              <Card
                key={member.user_id}
                className="cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => onUserClick?.(member.user_id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-yellow-500/30">
                    <AvatarImage src={member.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-yellow-500/10 text-yellow-600 font-bold">
                      {member.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{member.username}</p>
                      <VipBadge vipType={member.vip_type} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ვადა: {formatDistanceToNow(new Date(member.expires_at), { locale: ka, addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default VipMembersView;
