import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Ban, 
  Search, 
  Clock, 
  User, 
  Globe, 
  AtSign,
  Unlock,
  Edit,
  Eye,
  AlertTriangle,
  Filter,
  RefreshCw,
  MessageSquare,
  Shield
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { logAdminAction } from '@/hooks/useAdminActionLog';

interface SiteBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  created_at: string;
  banned_until: string | null;
  block_type: string;
  blocked_nickname: string | null;
  blocked_ip: string | null;
  blocked_by_role: string | null;
  status: string;
  removed_by: string | null;
  removed_at: string | null;
  metadata: any;
  user_profile?: { username: string; avatar_url: string | null };
  admin_profile?: { username: string };
}

interface GroupChatBan {
  id: string;
  user_id: string;
  is_banned: boolean;
  is_muted: boolean;
  banned_until: string | null;
  muted_until: string | null;
  banned_by: string | null;
  muted_by: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: { username: string; avatar_url: string | null };
  admin_profile?: { username: string };
  admin_role?: string;
}

interface BlockStats {
  activeSiteBans: number;
  activeGroupChatBans: number;
  expiredBans: number;
  permanentBans: number;
}

export const BlockedUsersView = () => {
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const { toast } = useToast();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'site' | 'groupchat'>('site');
  
  // Site bans state
  const [siteBans, setSiteBans] = useState<SiteBan[]>([]);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  // Default to 'all' to show all bans including old ones
  const [siteStatusFilter, setSiteStatusFilter] = useState<string>('all');
  const [siteTypeFilter, setSiteTypeFilter] = useState<string>('all');
  
  // Group chat bans state
  const [groupChatBans, setGroupChatBans] = useState<GroupChatBan[]>([]);
  const [groupChatLoading, setGroupChatLoading] = useState(true);
  const [groupChatSearchQuery, setGroupChatSearchQuery] = useState('');
  const [groupChatStatusFilter, setGroupChatStatusFilter] = useState<string>('all');
  
  // Shared state
  const [selectedBan, setSelectedBan] = useState<SiteBan | null>(null);
  const [selectedGroupBan, setSelectedGroupBan] = useState<GroupChatBan | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDuration, setEditDuration] = useState('');
  const [editUnit, setEditUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [refreshing, setRefreshing] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState<BlockStats>({
    activeSiteBans: 0,
    activeGroupChatBans: 0,
    expiredBans: 0,
    permanentBans: 0
  });

  useEffect(() => {
    fetchSiteBans();
    fetchGroupChatBans();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchSiteBans();
  }, [siteStatusFilter, siteTypeFilter]);

  useEffect(() => {
    fetchGroupChatBans();
  }, [groupChatStatusFilter]);

  // Real-time subscription for site ban changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-site-bans-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_bans'
        },
        () => {
          fetchSiteBans();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteStatusFilter, siteTypeFilter]);

  // Real-time subscription for group chat bans
  useEffect(() => {
    const channel = supabase
      .channel('admin-groupchat-bans-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_chat_status'
        },
        () => {
          fetchGroupChatBans();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupChatStatusFilter]);

  const fetchStats = async () => {
    try {
      const [activeSiteRes, activeGroupRes, expiredRes, permanentRes] = await Promise.all([
        supabase.from('site_bans').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('user_chat_status').select('id', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('site_bans').select('id', { count: 'exact', head: true }).eq('status', 'EXPIRED'),
        supabase.from('site_bans').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').is('banned_until', null)
      ]);

      setStats({
        activeSiteBans: activeSiteRes.count || 0,
        activeGroupChatBans: activeGroupRes.count || 0,
        expiredBans: expiredRes.count || 0,
        permanentBans: permanentRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSiteBans = async () => {
    setSiteLoading(true);
    try {
      let query = supabase
        .from('site_bans')
        .select('*')
        .order('created_at', { ascending: false });

      if (siteStatusFilter !== 'all') {
        query = query.eq('status', siteStatusFilter);
      }

      if (siteTypeFilter !== 'all') {
        query = query.eq('block_type', siteTypeFilter);
      }

      const { data: bansData, error } = await query;

      if (error) throw error;

      if (bansData && bansData.length > 0) {
        const userIds = [...new Set(bansData.map(b => b.user_id).filter(Boolean))];
        const adminIds = [...new Set(bansData.map(b => b.banned_by).filter(Boolean))];
        const allIds = [...new Set([...userIds, ...adminIds])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', allIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const enrichedBans = bansData.map(ban => ({
          ...ban,
          user_profile: profilesMap.get(ban.user_id),
          admin_profile: profilesMap.get(ban.banned_by)
        }));

        setSiteBans(enrichedBans);
      } else {
        setSiteBans([]);
      }
    } catch (error) {
      console.error('Error fetching site bans:', error);
      toast({ title: 'შეცდომა', description: 'ბლოკების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setSiteLoading(false);
    }
  };

  const fetchGroupChatBans = async () => {
    setGroupChatLoading(true);
    try {
      let query = supabase
        .from('user_chat_status')
        .select('*')
        .order('updated_at', { ascending: false });

      if (groupChatStatusFilter === 'active') {
        query = query.eq('is_banned', true);
      } else if (groupChatStatusFilter === 'muted') {
        query = query.eq('is_muted', true);
      } else if (groupChatStatusFilter === 'all') {
        query = query.or('is_banned.eq.true,is_muted.eq.true');
      }

      const { data: bansData, error } = await query;

      if (error) throw error;

      if (bansData && bansData.length > 0) {
        const userIds = [...new Set(bansData.map(b => b.user_id).filter(Boolean))];
        const adminIds = [...new Set([
          ...bansData.map(b => b.banned_by).filter(Boolean),
          ...bansData.map(b => b.muted_by).filter(Boolean)
        ])];
        const allIds = [...new Set([...userIds, ...adminIds])];

        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', allIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', adminIds)
        ]);

        const profilesMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
        const rolesMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);

        const enrichedBans: GroupChatBan[] = bansData.map(ban => ({
          ...ban,
          user_profile: profilesMap.get(ban.user_id),
          admin_profile: profilesMap.get(ban.banned_by || ban.muted_by),
          admin_role: rolesMap.get(ban.banned_by || ban.muted_by) || 'უცნობი'
        }));

        setGroupChatBans(enrichedBans);
      } else {
        setGroupChatBans([]);
      }
    } catch (error) {
      console.error('Error fetching group chat bans:', error);
      toast({ title: 'შეცდომა', description: 'ჩატის ბლოკების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setGroupChatLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSiteBans(), fetchGroupChatBans(), fetchStats()]);
    setRefreshing(false);
  };

  const handleUnblockSite = async (ban: SiteBan) => {
    if (!isSuperAdmin) {
      toast({ title: 'მხოლოდ სუპერ ადმინს შეუძლია განბლოკვა', variant: 'destructive' });
      return;
    }
    
    if (!confirm('ნამდვილად გინდა ამ ბლოკის მოხსნა?')) return;

    try {
      const { error } = await supabase
        .from('site_bans')
        .update({
          status: 'REMOVED',
          removed_by: user?.id,
          removed_at: new Date().toISOString()
        })
        .eq('id', ban.id);

      if (error) throw error;

      if (ban.block_type === 'USER' && ban.user_id) {
        await supabase
          .from('profiles')
          .update({ is_site_banned: false })
          .eq('user_id', ban.user_id);
      }

      await logAdminAction({
        actionType: 'unblock',
        actionCategory: 'security',
        targetUserId: ban.user_id,
        targetContentId: ban.id,
        targetContentType: 'site_ban',
        description: `საიტის ბლოკი მოიხსნა: ${ban.user_profile?.username || ban.blocked_nickname || ban.blocked_ip || 'უცნობი'}`,
        metadata: { block_type: ban.block_type, reason: ban.reason }
      });

      toast({ title: 'ბლოკი მოიხსნა' });
      fetchSiteBans();
      fetchStats();
    } catch (error) {
      console.error('Error unblocking:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleUnblockGroupChat = async (ban: GroupChatBan) => {
    if (!isSuperAdmin) {
      toast({ title: 'მხოლოდ სუპერ ადმინს შეუძლია განბლოკვა', variant: 'destructive' });
      return;
    }
    
    if (!confirm('ნამდვილად გინდა ამ ბლოკის მოხსნა?')) return;

    try {
      const { error } = await supabase
        .from('user_chat_status')
        .update({
          is_banned: false,
          banned_by: null,
          banned_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ban.id);

      if (error) throw error;

      await logAdminAction({
        actionType: 'unblock',
        actionCategory: 'chat',
        targetUserId: ban.user_id,
        targetContentId: ban.id,
        targetContentType: 'group_chat_ban',
        description: `ჯგუფური ჩატის ბლოკი მოიხსნა: ${ban.user_profile?.username || 'უცნობი'}`,
        metadata: {}
      });

      toast({ title: 'ჩატის ბლოკი მოიხსნა' });
      fetchGroupChatBans();
      fetchStats();
    } catch (error) {
      console.error('Error unblocking from group chat:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleUnmuteGroupChat = async (ban: GroupChatBan) => {
    if (!isSuperAdmin) {
      toast({ title: 'მხოლოდ სუპერ ადმინს შეუძლია მიუტის მოხსნა', variant: 'destructive' });
      return;
    }
    
    if (!confirm('ნამდვილად გინდა მიუტის მოხსნა?')) return;

    try {
      const { error } = await supabase
        .from('user_chat_status')
        .update({
          is_muted: false,
          muted_by: null,
          muted_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ban.id);

      if (error) throw error;

      await logAdminAction({
        actionType: 'unmute',
        actionCategory: 'chat',
        targetUserId: ban.user_id,
        targetContentId: ban.id,
        targetContentType: 'group_chat_mute',
        description: `ჯგუფური ჩატის მიუტი მოიხსნა: ${ban.user_profile?.username || 'უცნობი'}`,
        metadata: {}
      });

      toast({ title: 'მიუტი მოიხსნა' });
      fetchGroupChatBans();
      fetchStats();
    } catch (error) {
      console.error('Error unmuting from group chat:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleEditDuration = async () => {
    if (!selectedBan || !editDuration) return;

    const durationValue = parseInt(editDuration);
    if (isNaN(durationValue) || durationValue <= 0) {
      toast({ title: 'არასწორი ხანგრძლივობა', variant: 'destructive' });
      return;
    }

    let milliseconds = durationValue * 60 * 1000;
    if (editUnit === 'hours') milliseconds = durationValue * 60 * 60 * 1000;
    if (editUnit === 'days') milliseconds = durationValue * 24 * 60 * 60 * 1000;

    const newExpiresAt = new Date(Date.now() + milliseconds).toISOString();

    try {
      const { error } = await supabase
        .from('site_bans')
        .update({ banned_until: newExpiresAt })
        .eq('id', selectedBan.id);

      if (error) throw error;

      toast({ title: 'ხანგრძლივობა განახლდა' });
      setShowEditModal(false);
      setSelectedBan(null);
      fetchSiteBans();
    } catch (error) {
      console.error('Error updating duration:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getRemainingTime = (expiresAt: string | null) => {
    if (!expiresAt) return 'სამუდამო';
    const expires = new Date(expiresAt);
    if (expires < new Date()) return 'ვადაგასული';
    return formatDistanceToNow(expires, { locale: ka, addSuffix: true });
  };

  const getBlockTypeIcon = (type: string) => {
    switch (type) {
      case 'IP': return <Globe className="w-4 h-4" />;
      case 'NICKNAME': return <AtSign className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getBlockTypeLabel = (type: string) => {
    switch (type) {
      case 'IP': return 'IP ბლოკი';
      case 'NICKNAME': return 'მეტსახელის ბლოკი';
      default: return 'მომხმარებლის ბლოკი';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-red-500">აქტიური</Badge>;
      case 'EXPIRED':
        return <Badge variant="secondary">ვადაგასული</Badge>;
      case 'REMOVED':
        return <Badge variant="outline">მოხსნილი</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'სუპერ ადმინი';
      case 'admin': return 'ადმინი';
      case 'moderator': return 'მოდერატორი';
      default: return role || 'უცნობი';
    }
  };

  const filteredSiteBans = siteBans.filter(ban => {
    if (!siteSearchQuery) return true;
    const query = siteSearchQuery.toLowerCase();
    return (
      ban.user_profile?.username?.toLowerCase().includes(query) ||
      ban.blocked_nickname?.toLowerCase().includes(query) ||
      ban.blocked_ip?.includes(query) ||
      ban.reason?.toLowerCase().includes(query)
    );
  });

  const filteredGroupChatBans = groupChatBans.filter(ban => {
    if (!groupChatSearchQuery) return true;
    const query = groupChatSearchQuery.toLowerCase();
    return ban.user_profile?.username?.toLowerCase().includes(query);
  });

  return (
    <>
      <ScrollArea className="h-[calc(100vh-120px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-4 pr-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-500" />
            ბლოკირებული მომხმარებლები
          </h2>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            განახლება
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-3 text-center">
              <Globe className="w-5 h-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{stats.activeSiteBans}</p>
              <p className="text-xs text-muted-foreground">საიტზე ბლოკი</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 dark:border-orange-900">
            <CardContent className="p-3 text-center">
              <MessageSquare className="w-5 h-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{stats.activeGroupChatBans}</p>
              <p className="text-xs text-muted-foreground">ჩატში ბლოკი</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
              <p className="text-2xl font-bold text-gray-600">{stats.expiredBans}</p>
              <p className="text-xs text-muted-foreground">ვადაგასული</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 dark:border-purple-900">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">{stats.permanentBans}</p>
              <p className="text-xs text-muted-foreground">სამუდამო</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'site' | 'groupchat')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="site" className="gap-2">
              <Globe className="w-4 h-4" />
              საიტზე ბლოკი
            </TabsTrigger>
            <TabsTrigger value="groupchat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              ჯგუფურ ჩატში
            </TabsTrigger>
          </TabsList>

          {/* Site Bans Tab */}
          <TabsContent value="site" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ძებნა სახელით, IP-ით..."
                      value={siteSearchQuery}
                      onChange={(e) => setSiteSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={siteStatusFilter} onValueChange={setSiteStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="სტატუსი" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა</SelectItem>
                      <SelectItem value="ACTIVE">აქტიური</SelectItem>
                      <SelectItem value="EXPIRED">ვადაგასული</SelectItem>
                      <SelectItem value="REMOVED">მოხსნილი</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={siteTypeFilter} onValueChange={setSiteTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="ბლოკის ტიპი" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა ტიპი</SelectItem>
                      <SelectItem value="USER">მომხმარებელი</SelectItem>
                      <SelectItem value="NICKNAME">მეტსახელი</SelectItem>
                      <SelectItem value="IP">IP მისამართი</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Site Bans List */}
            {siteLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredSiteBans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ban className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ბლოკები ვერ მოიძებნა</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSiteBans.map(ban => (
                  <Card key={ban.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={ban.user_profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {getBlockTypeIcon(ban.block_type)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {ban.block_type === 'USER' && ban.user_profile?.username}
                              {ban.block_type === 'NICKNAME' && ban.blocked_nickname}
                              {ban.block_type === 'IP' && ban.blocked_ip}
                            </span>
                            {getStatusBadge(ban.status)}
                            <Badge variant="outline" className="gap-1">
                              {getBlockTypeIcon(ban.block_type)}
                              {getBlockTypeLabel(ban.block_type)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            <span className="font-medium">მიზეზი:</span> {ban.reason || 'მითითებული არ არის'}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(ban.created_at), 'dd.MM.yyyy HH:mm')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              <strong>{ban.admin_profile?.username || 'უცნობი'}</strong>
                              {ban.blocked_by_role && ` (${getRoleLabel(ban.blocked_by_role)})`}
                            </span>
                            <span className="text-primary font-medium">
                              {getRemainingTime(ban.banned_until)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBan(ban);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {ban.status === 'ACTIVE' && isSuperAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedBan(ban);
                                  setEditDuration('');
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleUnblockSite(ban)}
                              >
                                <Unlock className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Group Chat Bans Tab */}
          <TabsContent value="groupchat" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ძებნა სახელით..."
                      value={groupChatSearchQuery}
                      onChange={(e) => setGroupChatSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={groupChatStatusFilter} onValueChange={setGroupChatStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="სტატუსი" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა</SelectItem>
                      <SelectItem value="active">დაბანილი</SelectItem>
                      <SelectItem value="muted">დამიუტებული</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Group Chat Bans List */}
            {groupChatLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredGroupChatBans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ჩატში ბლოკირებული არავინ არ არის</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGroupChatBans.map(ban => (
                  <Card key={ban.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={ban.user_profile?.avatar_url || ''} />
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {ban.user_profile?.username || 'უცნობი'}
                            </span>
                            {ban.is_banned && (
                              <Badge className="bg-red-500">დაბანილი</Badge>
                            )}
                            {ban.is_muted && (
                              <Badge className="bg-yellow-500">დამიუტებული</Badge>
                            )}
                            <Badge variant="outline" className="gap-1">
                              <MessageSquare className="w-3 h-3" />
                              ჯგუფური ჩატი
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(ban.updated_at), 'dd.MM.yyyy HH:mm')}
                            </span>
                            {ban.is_banned && ban.admin_profile && (
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                დაბანა: <strong>{ban.admin_profile?.username || 'უცნობი'}</strong>
                                {ban.admin_role && ` (${getRoleLabel(ban.admin_role)})`}
                              </span>
                            )}
                            {ban.is_banned && (
                              <span className="text-red-500 font-medium">
                                {getRemainingTime(ban.banned_until)}
                              </span>
                            )}
                            {ban.is_muted && (
                              <span className="text-yellow-500 font-medium">
                                მიუტი: {getRemainingTime(ban.muted_until)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {ban.is_banned && isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleUnblockGroupChat(ban)}
                              title="განბლოკვა"
                            >
                              <Unlock className="w-4 h-4" />
                            </Button>
                          )}
                          {ban.is_muted && isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleUnmuteGroupChat(ban)}
                              title="მიუტის მოხსნა"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              ბლოკის დეტალები
            </DialogTitle>
          </DialogHeader>
          {selectedBan && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={selectedBan.user_profile?.avatar_url || ''} />
                  <AvatarFallback>{getBlockTypeIcon(selectedBan.block_type)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedBan.block_type === 'USER' && selectedBan.user_profile?.username}
                    {selectedBan.block_type === 'NICKNAME' && selectedBan.blocked_nickname}
                    {selectedBan.block_type === 'IP' && selectedBan.blocked_ip}
                  </p>
                  <p className="text-sm text-muted-foreground">ID: {selectedBan.user_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">ბლოკის ტიპი</p>
                  <p className="font-medium">{getBlockTypeLabel(selectedBan.block_type)}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">სტატუსი</p>
                  <div className="mt-1">{getStatusBadge(selectedBan.status)}</div>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">დაბლოკვის დრო</p>
                  <p className="font-medium">{format(new Date(selectedBan.created_at), 'dd.MM.yyyy HH:mm')}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">ვადა</p>
                  <p className="font-medium">{getRemainingTime(selectedBan.banned_until)}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted col-span-2">
                  <p className="text-xs text-muted-foreground">დაბლოკა</p>
                  <p className="font-medium">
                    {selectedBan.admin_profile?.username || 'უცნობი'} 
                    {selectedBan.blocked_by_role && ` (${getRoleLabel(selectedBan.blocked_by_role)})`}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted col-span-2">
                  <p className="text-xs text-muted-foreground">მიზეზი</p>
                  <p className="font-medium">{selectedBan.reason || 'მითითებული არ არის'}</p>
                </div>
                {selectedBan.removed_at && (
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 col-span-2">
                    <p className="text-xs text-muted-foreground">მოხსნილია</p>
                    <p className="font-medium text-green-600">
                      {format(new Date(selectedBan.removed_at), 'dd.MM.yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Duration Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              ხანგრძლივობის შეცვლა
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="რაოდენობა"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="flex-1"
              />
              <Select value={editUnit} onValueChange={(v: 'minutes' | 'hours' | 'days') => setEditUnit(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">წუთი</SelectItem>
                  <SelectItem value="hours">საათი</SelectItem>
                  <SelectItem value="days">დღე</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              გაუქმება
            </Button>
            <Button onClick={handleEditDuration}>
              შენახვა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
