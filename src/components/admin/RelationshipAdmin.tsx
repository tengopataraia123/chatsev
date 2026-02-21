import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, Users, Heart, HeartCrack, BarChart3, Edit, Trash2, RefreshCw, Clock, User, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { RELATIONSHIP_STATUS_LABELS, RelationshipStatusType } from '@/hooks/useRelationshipStatus';

interface RelationshipAdminProps {
  onBack: () => void;
}

interface RelationshipStats {
  totalCouples: number;
  marriedCouples: number;
  engagedCouples: number;
  inRelationship: number;
  pendingRequests: number;
  todayNewCouples: number;
}

interface RelationshipCouple {
  id: string;
  user_id: string;
  partner_id: string | null;
  status: RelationshipStatusType;
  privacy_level: string;
  hide_partner_name: boolean;
  relationship_started_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { user_id: string; username: string; avatar_url: string | null; age: number; gender: string };
  partner?: { user_id: string; username: string; avatar_url: string | null; age: number; gender: string };
}

interface PendingRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  proposed_status: RelationshipStatusType;
  message: string | null;
  status: string;
  created_at: string;
  sender?: { user_id: string; username: string; avatar_url: string | null };
  receiver?: { user_id: string; username: string; avatar_url: string | null };
}

const RelationshipAdmin = ({ onBack }: RelationshipAdminProps) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState<RelationshipStats | null>(null);
  const [couples, setCouples] = useState<RelationshipCouple[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingCouple, setEditingCouple] = useState<RelationshipCouple | null>(null);
  const [newStatus, setNewStatus] = useState<RelationshipStatusType>('in_relationship');
  
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    try {
      // Total couples (users with partner_id)
      const { count: totalCouples } = await supabase
        .from('relationship_statuses')
        .select('*', { count: 'exact', head: true })
        .not('partner_id', 'is', null);
      
      // Married couples
      const { count: marriedCouples } = await supabase
        .from('relationship_statuses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'married')
        .not('partner_id', 'is', null);
      
      // Engaged couples
      const { count: engagedCouples } = await supabase
        .from('relationship_statuses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'engaged')
        .not('partner_id', 'is', null);
      
      // In relationship
      const { count: inRelationship } = await supabase
        .from('relationship_statuses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_relationship')
        .not('partner_id', 'is', null);
      
      // Pending requests
      const { count: pendingRequests } = await supabase
        .from('relationship_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      // Today's new couples
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayNewCouples } = await supabase
        .from('relationship_statuses')
        .select('*', { count: 'exact', head: true })
        .not('partner_id', 'is', null)
        .gte('relationship_started_at', today.toISOString());

      setStats({
        totalCouples: Math.floor((totalCouples || 0) / 2), // Divide by 2 since each couple has 2 entries
        marriedCouples: Math.floor((marriedCouples || 0) / 2),
        engagedCouples: Math.floor((engagedCouples || 0) / 2),
        inRelationship: Math.floor((inRelationship || 0) / 2),
        pendingRequests: pendingRequests || 0,
        todayNewCouples: Math.floor((todayNewCouples || 0) / 2)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchCouples = useCallback(async () => {
    try {
      let query = supabase
        .from('relationship_statuses')
        .select('*')
        .not('partner_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as RelationshipStatusType);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set([...data.map(r => r.user_id), ...data.map(r => r.partner_id).filter(Boolean)])];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, age, gender')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]));

        // Only show unique couples (one entry per couple)
        const seenPairs = new Set<string>();
        let enrichedCouples = data
          .filter(r => {
            const pairKey = [r.user_id, r.partner_id].sort().join('-');
            if (seenPairs.has(pairKey)) return false;
            seenPairs.add(pairKey);
            return true;
          })
          .map(r => ({
            ...r,
            user: profilesMap.get(r.user_id),
            partner: r.partner_id ? profilesMap.get(r.partner_id) : undefined
          }));

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          enrichedCouples = enrichedCouples.filter(c => 
            c.user?.username?.toLowerCase().includes(query) ||
            c.partner?.username?.toLowerCase().includes(query)
          );
        }

        setCouples(enrichedCouples);
      } else {
        setCouples([]);
      }
    } catch (error) {
      console.error('Error fetching couples:', error);
    }
  }, [statusFilter, searchQuery]);

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('relationship_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set([...data.map(r => r.sender_id), ...data.map(r => r.receiver_id)])];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]));

        const enrichedRequests = data.map(r => ({
          ...r,
          sender: profilesMap.get(r.sender_id),
          receiver: profilesMap.get(r.receiver_id)
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, []);

  const handleEndRelationship = async (couple: RelationshipCouple) => {
    if (!confirm(`დარწმუნებული ხართ რომ გსურთ ${couple.user?.username} და ${couple.partner?.username}-ის ურთიერთობის დასრულება?`)) return;
    
    try {
      // Update both users' statuses
      await supabase
        .from('relationship_statuses')
        .update({ 
          status: 'single',
          partner_id: null,
          relationship_started_at: null,
          updated_at: new Date().toISOString()
        })
        .in('user_id', [couple.user_id, couple.partner_id].filter((id): id is string => id !== null));

      // Send notifications
      if (couple.user_id) {
        await supabase.from('notifications').insert({
          user_id: couple.user_id,
          from_user_id: user?.id,
          type: 'relationship_ended',
          message: 'ურთიერთობა დასრულდა ადმინისტრატორის მიერ'
        });
      }
      if (couple.partner_id) {
        await supabase.from('notifications').insert({
          user_id: couple.partner_id,
          from_user_id: user?.id,
          type: 'relationship_ended',
          message: 'ურთიერთობა დასრულდა ადმინისტრატორის მიერ'
        });
      }

      toast({ title: 'ურთიერთობა დასრულდა' });
      fetchCouples();
      fetchStats();
    } catch (error) {
      console.error('Error ending relationship:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingCouple) return;
    
    try {
      await supabase
        .from('relationship_statuses')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('user_id', [editingCouple.user_id, editingCouple.partner_id].filter((id): id is string => id !== null));

      toast({ title: 'სტატუსი განახლდა' });
      setEditingCouple(null);
      fetchCouples();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('დარწმუნებული ხართ?')) return;
    
    try {
      await supabase
        .from('relationship_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      toast({ title: 'შეთავაზება გაუქმდა' });
      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error('Error canceling request:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchCouples(), fetchRequests()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchCouples, fetchRequests]);

  const getStatusEmoji = (status: RelationshipStatusType) => {
    const emojis: Record<RelationshipStatusType, string> = {
      single: '💔',
      in_relationship: '❤️',
      engaged: '💍',
      married: '💒',
      complicated: '💫',
      separated: '💢',
      divorced: '📜',
      widowed: '🕯️',
      secret: '🤫'
    };
    return emojis[status] || '❤️';
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Heart className="w-5 h-5 text-pink-500 shrink-0" />
        <h1 className="text-base sm:text-lg font-semibold truncate">ურთიერთობის სტატუსი</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 mx-3 sm:mx-4 mt-2 gap-1 flex-shrink-0" style={{ width: 'calc(100% - 1.5rem)' }}>
          <TabsTrigger value="stats" className="text-xs px-2">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden xs:inline">სტატისტიკა</span>
            <span className="xs:hidden">სტატ.</span>
          </TabsTrigger>
          <TabsTrigger value="couples" className="text-xs px-2">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden xs:inline">წყვილები</span>
            <span className="xs:hidden">წყვილ.</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-xs px-2 relative">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden xs:inline">შეთავაზებები</span>
            <span className="xs:hidden">შეთ.</span>
            {stats && stats.pendingRequests > 0 && (
              <Badge className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 p-0 flex items-center justify-center text-[10px] sm:text-xs">
                {stats.pendingRequests}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats" className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm text-muted-foreground">სულ წყვილები</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-pink-500">{stats.totalCouples}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm text-muted-foreground">💒 დაქორწინებული</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-2xl sm:text-3xl font-bold">{stats.marriedCouples}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm text-muted-foreground">💍 ნიშნიანი</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-2xl sm:text-3xl font-bold">{stats.engagedCouples}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm text-muted-foreground">❤️ ურთიერთობაში</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-2xl sm:text-3xl font-bold">{stats.inRelationship}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm text-muted-foreground">მოლოდინში</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-amber-500">{stats.pendingRequests}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs sm:text-sm text-muted-foreground">დღეს ახალი</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-green-500">{stats.todayNewCouples}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Couples Tab */}
        <TabsContent value="couples" className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 sm:p-4 pb-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="ძებნა..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა სტატუსი</SelectItem>
                <SelectItem value="married">💒 დაქორწინებული</SelectItem>
                <SelectItem value="engaged">💍 ნიშნიანი</SelectItem>
                <SelectItem value="in_relationship">❤️ ურთიერთობაში</SelectItem>
                <SelectItem value="complicated">💫 რთული</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 min-h-0 px-3 sm:px-4 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {couples.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                წყვილები არ მოიძებნა
              </div>
            ) : (
              <div className="space-y-3">
                {couples.map(couple => (
                  <Card key={couple.id}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col gap-3">
                        {/* Couple avatars and names */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <div className="flex flex-col items-center">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-pink-500/50">
                              <AvatarImage src={couple.user?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{couple.user?.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs sm:text-sm font-medium mt-1 max-w-[60px] sm:max-w-[80px] truncate">{couple.user?.username}</p>
                          </div>
                          <div className="text-xl sm:text-2xl">{getStatusEmoji(couple.status)}</div>
                          <div className="flex flex-col items-center">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-pink-500/50">
                              <AvatarImage src={couple.partner?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{couple.partner?.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs sm:text-sm font-medium mt-1 max-w-[60px] sm:max-w-[80px] truncate">{couple.partner?.username}</p>
                          </div>
                        </div>
                        
                        {/* Status and date */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            {RELATIONSHIP_STATUS_LABELS[couple.status]}
                          </Badge>
                          {couple.relationship_started_at && (
                            <span className="text-[10px] sm:text-xs">
                              {format(new Date(couple.relationship_started_at), 'dd MMM yyyy', { locale: ka })}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs h-8"
                            onClick={() => {
                              setEditingCouple(couple);
                              setNewStatus(couple.status);
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            რედაქტირება
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="flex-1 text-xs h-8"
                            onClick={() => handleEndRelationship(couple)}
                          >
                            <HeartCrack className="w-3 h-3 mr-1" />
                            დასრულება
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 min-h-0 p-3 sm:p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                მოლოდინში შეთავაზებები არ არის
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(request => (
                  <Card key={request.id}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col gap-3">
                        {/* Sender -> Receiver */}
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={request.sender?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{request.sender?.username?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm font-medium truncate max-w-[80px]">{request.sender?.username}</span>
                          <span className="text-muted-foreground text-xs">→</span>
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={request.receiver?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{request.receiver?.username?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm font-medium truncate max-w-[80px]">{request.receiver?.username}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge className="text-[10px] sm:text-xs bg-pink-500/20 text-pink-500">
                            {getStatusEmoji(request.proposed_status)} {RELATIONSHIP_STATUS_LABELS[request.proposed_status]}
                          </Badge>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {format(new Date(request.created_at), 'dd MMM, HH:mm', { locale: ka })}
                          </span>
                        </div>

                        {request.message && (
                          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            "{request.message}"
                          </p>
                        )}

                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          გაუქმება
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Edit Status Dialog */}
      <Dialog open={!!editingCouple} onOpenChange={() => setEditingCouple(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">სტატუსის რედაქტირება</DialogTitle>
          </DialogHeader>
          {editingCouple && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={editingCouple.user?.avatar_url || undefined} />
                    <AvatarFallback>{editingCouple.user?.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium mt-1">{editingCouple.user?.username}</p>
                </div>
                <Heart className="w-6 h-6 text-pink-500" />
                <div className="flex flex-col items-center">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={editingCouple.partner?.avatar_url || undefined} />
                    <AvatarFallback>{editingCouple.partner?.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium mt-1">{editingCouple.partner?.username}</p>
                </div>
              </div>

              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as RelationshipStatusType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_relationship">❤️ ურთიერთობაშია</SelectItem>
                  <SelectItem value="engaged">💍 ნიშნიანია</SelectItem>
                  <SelectItem value="married">💒 დაქორწინებულია</SelectItem>
                  <SelectItem value="complicated">💫 რთულია</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingCouple(null)}>გაუქმება</Button>
            <Button onClick={handleUpdateStatus} className="bg-pink-500 hover:bg-pink-600">შენახვა</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RelationshipAdmin;
