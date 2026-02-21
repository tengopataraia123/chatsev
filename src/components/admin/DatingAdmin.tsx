import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, Users, Flag, CheckCircle, XCircle, Eye, Ban, Clock, Shield, Heart, Image, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface DatingAdminProps {
  onBack: () => void;
}

interface DatingStats {
  totalProfiles: number;
  activeProfiles: number;
  verifiedProfiles: number;
  totalMatches: number;
  todayMatches: number;
  pendingReports: number;
  pendingVerifications: number;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter?: { username: string; avatar_url: string | null };
  reported?: { username: string; avatar_url: string | null };
}

interface Verification {
  id: string;
  user_id: string;
  photo_url: string;
  status: string;
  created_at: string;
  user?: { username: string; avatar_url: string | null };
}

interface DatingProfile {
  id: string;
  user_id: string;
  is_active: boolean;
  is_verified: boolean;
  is_hidden: boolean;
  profile_completion_pct: number;
  created_at: string;
  last_active_at: string;
  user?: { username: string; avatar_url: string | null; age: number; gender: string };
}

const DatingAdmin = ({ onBack }: DatingAdminProps) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState<DatingStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportFilter, setReportFilter] = useState('pending');
  
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      // Total profiles
      const { count: totalProfiles } = await supabase
        .from('dating_profiles')
        .select('*', { count: 'exact', head: true });
      
      // Active profiles
      const { count: activeProfiles } = await supabase
        .from('dating_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_hidden', false);
      
      // Verified profiles
      const { count: verifiedProfiles } = await supabase
        .from('dating_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);
      
      // Total matches
      const { count: totalMatches } = await supabase
        .from('dating_matches')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Today's matches
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayMatches } = await supabase
        .from('dating_matches')
        .select('*', { count: 'exact', head: true })
        .gte('matched_at', today.toISOString());
      
      // Pending reports
      const { count: pendingReports } = await supabase
        .from('dating_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      // Pending verifications
      const { count: pendingVerifications } = await supabase
        .from('dating_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalProfiles: totalProfiles || 0,
        activeProfiles: activeProfiles || 0,
        verifiedProfiles: verifiedProfiles || 0,
        totalMatches: totalMatches || 0,
        todayMatches: todayMatches || 0,
        pendingReports: pendingReports || 0,
        pendingVerifications: pendingVerifications || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      let query = supabase
        .from('dating_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reportFilter !== 'all') {
        query = query.eq('status', reportFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set([...data.map(r => r.reporter_id), ...data.map(r => r.reported_id)])];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]));

        const enrichedReports = data.map(r => ({
          ...r,
          reporter: profilesMap.get(r.reporter_id),
          reported: profilesMap.get(r.reported_id)
        }));

        setReports(enrichedReports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  }, [reportFilter]);

  const fetchVerifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dating_verifications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(v => v.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]));

        const enrichedVerifications = data.map(v => ({
          ...v,
          user: profilesMap.get(v.user_id)
        }));

        setVerifications(enrichedVerifications);
      } else {
        setVerifications([]);
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      let query = supabase
        .from('dating_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, age, gender')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]));

        let enrichedProfiles = data.map(p => ({
          ...p,
          user: profilesMap.get(p.user_id)
        }));

        if (searchQuery) {
          enrichedProfiles = enrichedProfiles.filter(p => 
            p.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setProfiles(enrichedProfiles);
      } else {
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }, [searchQuery]);

  const handleReportAction = async (reportId: string, action: 'resolved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('dating_reports')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({ title: 'წარმატება', description: `რეპორტი ${action === 'resolved' ? 'დადასტურებულია' : 'უარყოფილია'}` });
      fetchReports();
      fetchStats();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleVerificationAction = async (verificationId: string, userId: string, action: 'approved' | 'rejected', reason?: string) => {
    try {
      // Update verification
      await supabase
        .from('dating_verifications')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null
        })
        .eq('id', verificationId);

      // If approved, update profile
      if (action === 'approved') {
        await supabase
          .from('dating_profiles')
          .update({ 
            is_verified: true,
            verified_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      toast({ title: 'წარმატება', description: `ვერიფიკაცია ${action === 'approved' ? 'დადასტურებულია' : 'უარყოფილია'}` });
      fetchVerifications();
      fetchStats();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleBanProfile = async (userId: string) => {
    if (!confirm('დარწმუნებული ხართ?')) return;
    
    try {
      await supabase
        .from('dating_profiles')
        .update({ is_active: false, is_hidden: true })
        .eq('user_id', userId);

      toast({ title: 'პროფილი დაიბლოკა' });
      fetchProfiles();
    } catch (error) {
      console.error('Error banning profile:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchReports(), fetchVerifications(), fetchProfiles()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchReports, fetchVerifications, fetchProfiles]);

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      fake_profile: 'ყალბი პროფილი',
      inappropriate_content: 'შეუფერებელი კონტენტი',
      harassment: 'შევიწროება',
      spam: 'სპამი',
      scam: 'თაღლითობა',
      underage: 'არასრულწლოვანი',
      other: 'სხვა'
    };
    return labels[reason] || reason;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Heart className="w-5 h-5 text-pink-500" />
        <h1 className="text-lg font-semibold">Dating მართვა</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-2 flex-shrink-0" style={{ width: 'calc(100% - 2rem)' }}>
          <TabsTrigger value="stats" className="text-xs">
            <BarChart3 className="w-4 h-4 mr-1" />
            სტატისტიკა
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs relative">
            <Flag className="w-4 h-4 mr-1" />
            რეპორტები
            {stats && stats.pendingReports > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                {stats.pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verify" className="text-xs relative">
            <Shield className="w-4 h-4 mr-1" />
            ვერიფიკაცია
            {stats && stats.pendingVerifications > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                {stats.pendingVerifications}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profiles" className="text-xs">
            <Users className="w-4 h-4 mr-1" />
            პროფილები
          </TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats" className="flex-1 min-h-0 p-4 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">სულ პროფილები</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalProfiles}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">აქტიური</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-500">{stats.activeProfiles}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">ვერიფიცირებული</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-500">{stats.verifiedProfiles}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">სულ მატჩები</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-pink-500">{stats.totalMatches}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">დღეს მატჩები</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.todayMatches}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">მოლოდინში</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-amber-500">
                    {stats.pendingReports + stats.pendingVerifications}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="p-4 pb-2">
            <Select value={reportFilter} onValueChange={setReportFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">მოლოდინში</SelectItem>
                <SelectItem value="resolved">გადაწყვეტილი</SelectItem>
                <SelectItem value="rejected">უარყოფილი</SelectItem>
                <SelectItem value="all">ყველა</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 min-h-0 p-4 pt-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                რეპორტები არ მოიძებნა
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={report.reported?.avatar_url || undefined} />
                          <AvatarFallback>{report.reported?.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{report.reported?.username}</p>
                            <Badge variant={
                              report.status === 'pending' ? 'secondary' :
                              report.status === 'resolved' ? 'default' : 'outline'
                            }>
                              {report.status === 'pending' ? 'მოლოდინში' :
                               report.status === 'resolved' ? 'გადაწყვეტილი' : 'უარყოფილი'}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {getReasonLabel(report.reason)}
                          </Badge>
                          {report.description && (
                            <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            გამომგზავნი: {report.reporter?.username} • {format(new Date(report.created_at), 'dd MMM HH:mm', { locale: ka })}
                          </p>
                        </div>
                      </div>
                      {report.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleReportAction(report.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            უარყოფა
                          </Button>
                          <Button 
                            size="sm"
                            className="flex-1"
                            onClick={() => handleReportAction(report.id, 'resolved')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            დადასტურება
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verify" className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {verifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ვერიფიკაციის მოთხოვნები არ არის
              </div>
            ) : (
              <div className="space-y-4">
                {verifications.map(v => (
                  <Card key={v.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={v.user?.avatar_url || undefined} />
                          <AvatarFallback>{v.user?.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{v.user?.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(v.created_at), 'dd MMM yyyy HH:mm', { locale: ka })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Verification Photo */}
                      <div className="mt-4">
                        <img 
                          src={v.photo_url} 
                          alt="Verification" 
                          className="w-full max-h-64 object-contain rounded-lg border"
                        />
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleVerificationAction(v.id, v.user_id, 'rejected', 'ფოტო არ შეესაბამება')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          უარყოფა
                        </Button>
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleVerificationAction(v.id, v.user_id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          დადასტურება
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="flex-1 flex flex-col">
          <div className="p-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ძებნა..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-4 pt-0">
            <div className="space-y-2">
              {profiles.map(p => (
                <div 
                  key={p.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={p.user?.avatar_url || undefined} />
                    <AvatarFallback>{p.user?.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.user?.username}</p>
                      {p.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.user?.age} წ</span>
                      <span>•</span>
                      <span>{p.profile_completion_pct}% შევსებული</span>
                      {!p.is_active && <Badge variant="secondary" className="text-xs">არააქტიური</Badge>}
                      {p.is_hidden && <Badge variant="destructive" className="text-xs">დამალული</Badge>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleBanProfile(p.user_id)}
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatingAdmin;
