import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Search,
  User,
  MessageSquare,
  Ban,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  AlertTriangle,
  Filter,
  Calendar,
  UserPlus,
  FileText,
  Image,
  Video,
  Heart,
  Flag,
  Lock,
  Unlock,
  Eye,
  RefreshCw
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface AdminAction {
  id: string;
  admin_id: string;
  admin_role: string;
  action_type: string;
  action_category: string;
  target_user_id: string | null;
  target_content_id: string | null;
  target_content_type: string | null;
  description: string;
  metadata: Json;
  created_at: string;
  admin_profile?: {
    username: string;
    avatar_url: string | null;
  };
  target_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

const ACTION_CATEGORIES = [
  { value: 'all', label: 'ყველა კატეგორია' },
  { value: 'user', label: 'მომხმარებლები' },
  { value: 'content', label: 'კონტენტი' },
  { value: 'chat', label: 'ჩატი' },
  { value: 'room_clear', label: 'ოთახების გასუფთავება' },
  { value: 'message', label: 'შეტყობინებები' },
  { value: 'security', label: 'უსაფრთხოება' },
  { value: 'moderation', label: 'მოდერაცია' }
];

const ACTION_TYPES = [
  { value: 'all', label: 'ყველა ტიპი' },
  { value: 'approve', label: 'დადასტურება' },
  { value: 'reject', label: 'უარყოფა' },
  { value: 'delete', label: 'წაშლა' },
  { value: 'room_clear', label: 'ოთახის გასუფთავება' },
  { value: 'block', label: 'დაბლოკვა' },
  { value: 'unblock', label: 'განბლოკვა' },
  { value: 'edit', label: 'რედაქტირება' },
  { value: 'mute', label: 'დადუმება' },
  { value: 'unmute', label: 'დადუმების გაუქმება' }
];

const DATE_FILTERS = [
  { value: 'all', label: 'ყველა დრო' },
  { value: 'today', label: 'დღეს' },
  { value: 'week', label: 'ეს კვირა' },
  { value: 'month', label: 'ეს თვე' }
];

const ROLE_FILTERS = [
  { value: 'all', label: 'ყველა როლი' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' }
];

export const AdminActionsLog = () => {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    
    let query = supabase
      .from('admin_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    
    // Apply date filter
    if (dateFilter === 'today') {
      query = query.gte('created_at', startOfDay(new Date()).toISOString());
    } else if (dateFilter === 'week') {
      query = query.gte('created_at', subWeeks(new Date(), 1).toISOString());
    } else if (dateFilter === 'month') {
      query = query.gte('created_at', subMonths(new Date(), 1).toISOString());
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      query = query.eq('action_category', categoryFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      query = query.eq('action_type', typeFilter);
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      query = query.eq('admin_role', roleFilter);
    }
    
    const { data: actionLogs, error } = await query;
    
    if (error || !actionLogs) {
      console.error('Error fetching admin actions:', error);
      setLoading(false);
      return;
    }

    // Get all unique user IDs
    const userIds = [...new Set([
      ...actionLogs.map(a => a.admin_id).filter(Boolean),
      ...actionLogs.map(a => a.target_user_id).filter(Boolean)
    ])] as string[];

    let profileMap = new Map<string, { username: string; avatar_url: string | null }>();
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      if (profiles) {
        profileMap = new Map(profiles.map(p => [p.user_id, { username: p.username, avatar_url: p.avatar_url }]));
      }
    }

    const enrichedActions = actionLogs.map(action => ({
      ...action,
      admin_profile: profileMap.get(action.admin_id),
      target_profile: action.target_user_id ? profileMap.get(action.target_user_id) : undefined
    }));

    // Apply search filter client-side
    let filteredActions = enrichedActions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredActions = enrichedActions.filter(action => 
        action.admin_profile?.username?.toLowerCase().includes(q) ||
        action.target_profile?.username?.toLowerCase().includes(q) ||
        action.description?.toLowerCase().includes(q)
      );
    }

    setActions(filteredActions);
    setLoading(false);
  }, [categoryFilter, typeFilter, dateFilter, roleFilter, searchQuery]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-actions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_action_logs'
        },
        async (payload) => {
          const newAction = payload.new as AdminAction;
          
          // Fetch profiles for the new action
          const userIds = [newAction.admin_id, newAction.target_user_id].filter(Boolean) as string[];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, { username: p.username, avatar_url: p.avatar_url }]) || []);
          
          const enrichedAction = {
            ...newAction,
            admin_profile: profileMap.get(newAction.admin_id),
            target_profile: newAction.target_user_id ? profileMap.get(newAction.target_user_id) : undefined
          };
          
          setActions(prev => [enrichedAction, ...prev.slice(0, 199)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActionIcon = (actionType: string, category: string) => {
    switch (actionType) {
      case 'approve': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'reject': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'room_clear': return <Trash2 className="h-4 w-4 text-purple-500" />;
      case 'block': return <Ban className="h-4 w-4 text-red-500" />;
      case 'unblock': return <Unlock className="h-4 w-4 text-green-500" />;
      case 'edit': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'mute': return <Lock className="h-4 w-4 text-orange-500" />;
      case 'unmute': return <Unlock className="h-4 w-4 text-green-500" />;
      default:
        switch (category) {
          case 'user': return <User className="h-4 w-4" />;
          case 'content': return <FileText className="h-4 w-4" />;
          case 'chat': return <MessageSquare className="h-4 w-4" />;
          case 'room_clear': return <Trash2 className="h-4 w-4 text-purple-500" />;
          case 'security': return <Shield className="h-4 w-4" />;
          default: return <AlertTriangle className="h-4 w-4" />;
        }
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Admin</Badge>;
      case 'moderator':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Moderator</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20 text-[10px]">{role}</Badge>;
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'approve':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">დადასტურება</Badge>;
      case 'reject':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">უარყოფა</Badge>;
      case 'delete':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">წაშლა</Badge>;
      case 'room_clear':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">ოთახის გასუფთავება</Badge>;
      case 'block':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">დაბლოკვა</Badge>;
      case 'unblock':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">განბლოკვა</Badge>;
      case 'edit':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">რედაქტირება</Badge>;
      case 'mute':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">დადუმება</Badge>;
      case 'unmute':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">დადუმების გაუქმება</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20 text-[10px]">{actionType}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      user: 'მომხმარებლები',
      content: 'კონტენტი',
      chat: 'ჯგუფური ჩატი',
      room_clear: 'ოთახის გასუფთავება',
      message: 'პირადი შეტყობინებები',
      security: 'უსაფრთხოება',
      moderation: 'მოდერაცია'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-120px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
    <div className="space-y-3 px-1 pr-4">
      {/* Header with title and realtime indicator - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="font-semibold text-base sm:text-lg truncate">ადმინისტრაციის მოქმედებები</h2>
          <div className="flex items-center gap-1 text-green-500 flex-shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs whitespace-nowrap">Live</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchActions()}
          className="gap-1.5 flex-shrink-0 self-end sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="whitespace-nowrap">განახლება</span>
        </Button>
      </div>

      {/* Search and Filter Toggle - Mobile optimized */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ძებნა ადმინით ან მომხმარებლით..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5 flex-shrink-0"
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="whitespace-nowrap">ფილტრები</span>
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="კატეგორია" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="ტიპი" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="როლი" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_FILTERS.map(role => (
                    <SelectItem key={role.value} value={role.value} className="text-xs">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="თარიღი" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FILTERS.map(date => (
                    <SelectItem key={date.value} value={date.value} className="text-xs">
                      {date.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions List */}
        <div className="space-y-2">
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">მოქმედებები არ მოიძებნა</p>
            </div>
          ) : (
            actions.map(action => (
              <div 
                key={action.id} 
                className="p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Admin Avatar */}
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={action.admin_profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {action.admin_profile?.username?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    {/* Admin info and action type */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {action.admin_profile?.username || 'უცნობი'}
                      </span>
                      {getRoleBadge(action.admin_role)}
                      {getActionBadge(action.action_type)}
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-muted-foreground mt-1">
                      {action.description}
                    </p>

                    {/* Target user if exists */}
                    {action.target_profile && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-xs text-muted-foreground">სამიზნე:</span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={action.target_profile.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {action.target_profile.username?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {action.target_profile.username}
                        </span>
                      </div>
                    )}

                    {/* Metadata preview if exists */}
                    {action.metadata && typeof action.metadata === 'object' && Object.keys(action.metadata as object).length > 0 && (
                      <div className="mt-2 p-2 bg-secondary/30 rounded text-xs">
                        {(action.metadata as { original_content?: string }).original_content && (
                          <p className="text-muted-foreground truncate">
                            ორიგინალი: "{(action.metadata as { original_content: string }).original_content}"
                          </p>
                        )}
                        {(action.metadata as { reason?: string }).reason && (
                          <p className="text-muted-foreground">
                            მიზეზი: {(action.metadata as { reason: string }).reason}
                          </p>
                        )}
                        {(action.metadata as { duration?: string }).duration && (
                          <p className="text-muted-foreground">
                            ხანგრძლივობა: {(action.metadata as { duration: string }).duration}
                          </p>
                        )}
                        {/* Room clear specific metadata */}
                        {(action.metadata as { room_name?: { ge?: string; en?: string; ru?: string } }).room_name && (
                          <p className="text-muted-foreground">
                            ოთახი: {(action.metadata as { room_name: { ge: string } }).room_name.ge}
                          </p>
                        )}
                        {(action.metadata as { deleted_count?: number }).deleted_count !== undefined && (
                          <p className="text-muted-foreground">
                            წაშლილი შეტყობინებები: {(action.metadata as { deleted_count: number }).deleted_count}
                          </p>
                        )}
                        {(action.metadata as { cleared_at?: string }).cleared_at && (
                          <p className="text-muted-foreground">
                            გასუფთავდა: {format(new Date((action.metadata as { cleared_at: string }).cleared_at), 'dd.MM.yy HH:mm:ss')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Category and timestamp */}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getActionIcon(action.action_type, action.action_category)}
                        {getCategoryLabel(action.action_category)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(action.created_at), 'dd.MM.yy HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
    </div>
    </ScrollArea>
  );
};