import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, 
  Search, 
  Ban, 
  Unlock, 
  Plus, 
  Clock, 
  Shield,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { logAdminAction } from '@/hooks/useAdminActionLog';

interface IpBan {
  id: string;
  ip_address: string;
  banned_by: string;
  reason: string | null;
  created_at: string;
  banned_until: string | null;
  is_active: boolean;
  removed_by: string | null;
  removed_at: string | null;
  metadata: any;
  admin_profile?: { username: string };
}

interface IpBanAdminProps {
  onBack?: () => void;
}

export const IpBanAdmin = ({ onBack }: IpBanAdminProps) => {
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const { toast } = useToast();

  const [ipBans, setIpBans] = useState<IpBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add ban form
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newDurationUnit, setNewDurationUnit] = useState<'hours' | 'days' | 'permanent'>('hours');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchIpBans();
    }
  }, [isSuperAdmin]);

  const fetchIpBans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ip_bans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const adminIds = [...new Set(data.map(b => b.banned_by).filter(Boolean))];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', adminIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const enrichedBans = data.map(ban => ({
          ...ban,
          admin_profile: profilesMap.get(ban.banned_by)
        }));

        setIpBans(enrichedBans);
      } else {
        setIpBans([]);
      }
    } catch (error) {
      console.error('Error fetching IP bans:', error);
      toast({ title: 'შეცდომა', description: 'IP ბანების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIpBans();
    setRefreshing(false);
  };

  const handleAddIpBan = async () => {
    if (!newIp.trim()) {
      toast({ title: 'შეიყვანეთ IP მისამართი', variant: 'destructive' });
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIp.trim())) {
      toast({ title: 'არასწორი IP ფორმატი', variant: 'destructive' });
      return;
    }

    setAdding(true);
    try {
      let bannedUntil: string | null = null;
      
      if (newDurationUnit !== 'permanent' && newDuration) {
        const durationValue = parseInt(newDuration);
        if (isNaN(durationValue) || durationValue <= 0) {
          toast({ title: 'არასწორი ხანგრძლივობა', variant: 'destructive' });
          setAdding(false);
          return;
        }

        let milliseconds = durationValue * 60 * 60 * 1000; // hours
        if (newDurationUnit === 'days') {
          milliseconds = durationValue * 24 * 60 * 60 * 1000;
        }
        bannedUntil = new Date(Date.now() + milliseconds).toISOString();
      }

      const { error } = await supabase
        .from('ip_bans')
        .insert({
          ip_address: newIp.trim(),
          banned_by: user?.id,
          reason: newReason.trim() || null,
          banned_until: bannedUntil,
          is_active: true
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'ეს IP უკვე დაბანილია', variant: 'destructive' });
        } else {
          throw error;
        }
        setAdding(false);
        return;
      }

      await logAdminAction({
        actionType: 'block',
        actionCategory: 'security',
        targetContentId: newIp.trim(),
        targetContentType: 'ip_ban',
        description: `IP დაიბანა: ${newIp.trim()}`,
        metadata: { reason: newReason.trim(), duration: bannedUntil ? 'დროებითი' : 'სამუდამო' }
      });

      toast({ title: 'IP დაიბანა' });
      setShowAddModal(false);
      setNewIp('');
      setNewReason('');
      setNewDuration('');
      setNewDurationUnit('hours');
      fetchIpBans();
    } catch (error) {
      console.error('Error adding IP ban:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleUnbanIp = async (ban: IpBan) => {
    if (!confirm(`ნამდვილად გინდა ${ban.ip_address} IP-ის განბლოკვა?`)) return;

    try {
      const { error } = await supabase
        .from('ip_bans')
        .update({
          is_active: false,
          removed_by: user?.id,
          removed_at: new Date().toISOString()
        })
        .eq('id', ban.id);

      if (error) throw error;

      await logAdminAction({
        actionType: 'unblock',
        actionCategory: 'security',
        targetContentId: ban.ip_address,
        targetContentType: 'ip_ban',
        description: `IP განბლოკდა: ${ban.ip_address}`,
        metadata: {}
      });

      toast({ title: 'IP განბლოკდა' });
      fetchIpBans();
    } catch (error) {
      console.error('Error unbanning IP:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getRemainingTime = (expiresAt: string | null) => {
    if (!expiresAt) return 'სამუდამო';
    const expires = new Date(expiresAt);
    if (expires < new Date()) return 'ვადაგასული';
    return formatDistanceToNow(expires, { locale: ka, addSuffix: true });
  };

  const filteredBans = ipBans.filter(ban => {
    if (!searchQuery) return true;
    return ban.ip_address.includes(searchQuery) || ban.reason?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeBans = filteredBans.filter(b => b.is_active);
  const inactiveBans = filteredBans.filter(b => !b.is_active);

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
        <Shield className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-bold">მხოლოდ სუპერ ადმინისთვის</h2>
        <p className="text-sm text-muted-foreground text-center">
          IP ბანის მართვა მხოლოდ სუპერ ადმინისტრატორებისთვისაა ხელმისაწვდომი
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ maxHeight: 'calc(100vh - 150px)' }}>
      {/* Header - Fixed */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Globe className="w-5 h-5 text-red-500" />
          IP მისამართების ბანი
        </h2>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            განახლება
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            IP დაბანება
          </Button>
        </div>
      </div>

      {/* Stats - Fixed */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3">
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-3 text-center">
            <Globe className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{activeBans.length}</p>
            <p className="text-xs text-muted-foreground">აქტიური IP ბანი</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-3 text-center">
            <Unlock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
            <p className="text-2xl font-bold text-gray-600">{inactiveBans.length}</p>
            <p className="text-xs text-muted-foreground">განბლოკილი</p>
          </CardContent>
        </Card>
      </div>

      {/* Search - Fixed */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ძებნა IP მისამართით..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* IP Bans List - Scrollable */}
      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredBans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>IP ბანები ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBans.map(ban => (
              <Card key={ban.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${ban.is_active ? 'bg-red-500/10' : 'bg-gray-500/10'}`}>
                        <Globe className={`w-5 h-5 ${ban.is_active ? 'text-red-500' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{ban.ip_address}</span>
                          {ban.is_active ? (
                            <Badge className="bg-red-500 text-[10px]">აქტიური</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">განბლოკილი</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {ban.reason || 'მიზეზი მითითებული არ არის'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(ban.created_at), 'dd.MM.yy HH:mm')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {ban.admin_profile?.username || 'უცნობი'}
                          </span>
                          {ban.is_active && (
                            <span className="text-primary font-medium">
                              {getRemainingTime(ban.banned_until)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {ban.is_active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 shrink-0"
                        onClick={() => handleUnbanIp(ban)}
                      >
                        <Unlock className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">განბლოკვა</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add IP Ban Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              IP მისამართის დაბანება
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>IP მისამართი</Label>
              <Input
                placeholder="192.168.1.1"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label>მიზეზი</Label>
              <Textarea
                placeholder="ბანის მიზეზი..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>ხანგრძლივობა</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="რაოდენობა"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  disabled={newDurationUnit === 'permanent'}
                  className="w-24"
                />
                <Select value={newDurationUnit} onValueChange={(v: any) => setNewDurationUnit(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">საათი</SelectItem>
                    <SelectItem value="days">დღე</SelectItem>
                    <SelectItem value="permanent">სამუდამო</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              გაუქმება
            </Button>
            <Button onClick={handleAddIpBan} disabled={adding} className="bg-red-500 hover:bg-red-600">
              {adding ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              დაბანება
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
