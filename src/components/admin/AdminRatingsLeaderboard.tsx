import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Medal, 
  Award,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  Ban,
  Trash2,
  Edit,
  Eye,
  Shield,
  RefreshCw,
  Crown,
  Target,
  Zap
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface AdminRating {
  id: string;
  admin_id: string;
  total_score: number;
  actions_count: number;
  approvals_count: number;
  rejections_count: number;
  blocks_count: number;
  unblocks_count: number;
  deletions_count: number;
  edits_count: number;
  mutes_count: number;
  unmutes_count: number;
  reviews_count: number;
  warnings_count: number;
  other_actions_count: number;
  last_action_at: string | null;
  created_at: string;
  updated_at: string;
  admin_profile?: {
    username: string;
    avatar_url: string | null;
  };
  admin_role?: string;
}

export const AdminRatingsLeaderboard = () => {
  const { userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRatings();
    }
  }, [isSuperAdmin]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const { data: ratingsData, error } = await supabase
        .from('admin_ratings')
        .select('*')
        .order('total_score', { ascending: false });

      if (error) throw error;

      if (ratingsData && ratingsData.length > 0) {
        const adminIds = ratingsData.map(r => r.admin_id);
        
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', adminIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', adminIds).in('role', ['super_admin', 'admin', 'moderator'])
        ]);

        const profilesMap = new Map(profilesRes.data?.map(p => [p.user_id, { username: p.username, avatar_url: p.avatar_url }]) || []);
        const rolesMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);

        const enrichedRatings: AdminRating[] = ratingsData.map(rating => ({
          ...rating,
          admin_profile: profilesMap.get(rating.admin_id),
          admin_role: rolesMap.get(rating.admin_id) || 'admin'
        }));

        setRatings(enrichedRatings);
      } else {
        setRatings([]);
      }
    } catch (error) {
      console.error('Error fetching admin ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRatings();
    setRefreshing(false);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Admin</Badge>;
      case 'moderator':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Moderator</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getActivityStatus = (lastActionAt: string | null) => {
    if (!lastActionAt) return { label: 'არააქტიური', color: 'text-gray-500' };
    const diff = Date.now() - new Date(lastActionAt).getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return { label: 'აქტიური', color: 'text-green-500' };
    if (hours < 24) return { label: 'დღეს აქტიური', color: 'text-blue-500' };
    if (hours < 168) return { label: 'კვირაში აქტიური', color: 'text-yellow-500' };
    return { label: 'არააქტიური', color: 'text-gray-500' };
  };

  // Calculate totals
  const totalActions = ratings.reduce((sum, r) => sum + r.actions_count, 0);
  const totalScore = ratings.reduce((sum, r) => sum + r.total_score, 0);
  const activeAdmins = ratings.filter(r => {
    if (!r.last_action_at) return false;
    const hours = (Date.now() - new Date(r.last_action_at).getTime()) / (1000 * 60 * 60);
    return hours < 168;
  }).length;

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>მხოლოდ სუპერ ადმინებს აქვთ წვდომა</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-120px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-4 pr-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold">ადმინისტრაციის რეიტინგი</h2>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            განახლება
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600">{totalActions}</p>
              <p className="text-xs text-muted-foreground">მთლიანი მოქმედებები</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 dark:border-purple-900/50">
            <CardContent className="p-4 text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">{totalScore}</p>
              <p className="text-xs text-muted-foreground">ჯამური ქულები</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-900/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{activeAdmins}</p>
              <p className="text-xs text-muted-foreground">აქტიური ადმინი</p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              ლიდერბორდი
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ratings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>რეიტინგი ცარიელია</p>
                <p className="text-sm mt-2">ადმინების მოქმედებები ავტომატურად აისახება აქ</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {ratings.map((rating, index) => {
                  const activityStatus = getActivityStatus(rating.last_action_at);
                  return (
                    <div
                      key={rating.id}
                      className={`p-3 sm:p-4 hover:bg-muted/50 transition-colors ${
                        index === 0 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' :
                        index === 1 ? 'bg-gray-50/50 dark:bg-gray-800/10' :
                        index === 2 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                      }`}
                    >
                      {/* Mobile: stacked layout */}
                      <div className="flex items-start gap-3">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-8 flex justify-center pt-1">
                          {getRankIcon(index)}
                        </div>

                        {/* Avatar */}
                        <Avatar className={`w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ring-2 ${
                          index === 0 ? 'ring-yellow-400' :
                          index === 1 ? 'ring-gray-400' :
                          index === 2 ? 'ring-amber-500' : 'ring-border'
                        }`}>
                          <AvatarImage src={rating.admin_profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-sm">
                            {rating.admin_profile?.username?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info + Score */}
                        <div className="flex-1 min-w-0">
                          {/* Name row with score */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-semibold text-sm sm:text-base block truncate">
                                {rating.admin_profile?.username || 'უცნობი'}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {getRoleBadge(rating.admin_role || 'admin')}
                                <span className={`text-[11px] ${activityStatus.color}`}>
                                  • {activityStatus.label}
                                </span>
                              </div>
                            </div>
                            
                            {/* Score - always visible on right */}
                            <div className="flex-shrink-0 text-right">
                              <div className={`text-xl sm:text-2xl font-bold leading-tight ${
                                index === 0 ? 'text-yellow-600' :
                                index === 1 ? 'text-gray-600' :
                                index === 2 ? 'text-amber-600' : 'text-foreground'
                              }`}>
                                {rating.total_score}
                              </div>
                              <p className="text-[11px] text-muted-foreground">ქულა</p>
                              <p className="text-[11px] text-muted-foreground">
                                {rating.actions_count} მოქმედება
                              </p>
                            </div>
                          </div>
                          
                          {/* Action breakdown */}
                          <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-2 text-xs text-muted-foreground">
                            {rating.approvals_count > 0 && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                {rating.approvals_count}
                              </span>
                            )}
                            {rating.blocks_count > 0 && (
                              <span className="flex items-center gap-1 text-red-600">
                                <Ban className="w-3 h-3 flex-shrink-0" />
                                {rating.blocks_count}
                              </span>
                            )}
                            {rating.deletions_count > 0 && (
                              <span className="flex items-center gap-1 text-orange-600">
                                <Trash2 className="w-3 h-3 flex-shrink-0" />
                                {rating.deletions_count}
                              </span>
                            )}
                            {rating.edits_count > 0 && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <Edit className="w-3 h-3 flex-shrink-0" />
                                {rating.edits_count}
                              </span>
                            )}
                            {rating.reviews_count > 0 && (
                              <span className="flex items-center gap-1 text-purple-600">
                                <Eye className="w-3 h-3 flex-shrink-0" />
                                {rating.reviews_count}
                              </span>
                            )}
                          </div>

                          {rating.last_action_at && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              ბოლო: {formatDistanceToNow(new Date(rating.last_action_at), { locale: ka, addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default AdminRatingsLeaderboard;
