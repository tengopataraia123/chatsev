import { useState, useEffect } from 'react';
import { Crown, Shield, Users, History, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { hasRootControls, ROOT_USER_IDS } from '@/utils/rootUtils';
import { RoleManagement } from './RoleManagement';
import { format } from 'date-fns';

interface SuperAdmin {
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  last_seen: string | null;
  is_root: boolean;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  description: string;
  target_user_id: string | null;
  created_at: string;
  metadata: any;
  admin_username?: string;
  target_username?: string;
}

export const RootControlsAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<SuperAdmin | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // Only show to root accounts
  const isRoot = hasRootControls(user?.id);

  useEffect(() => {
    if (isRoot) {
      fetchSuperAdmins();
      fetchAuditLogs();
    }
  }, [isRoot]);

  const fetchSuperAdmins = async () => {
    setLoading(true);
    try {
      // Get all super_admin roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin');

      if (!roles || roles.length === 0) {
        setSuperAdmins([]);
        setLoading(false);
        return;
      }

      // Get profiles for super admins
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, created_at, last_seen')
        .in('user_id', roles.map(r => r.user_id));

      const admins: SuperAdmin[] = (profiles || []).map(p => ({
        ...p,
        is_root: ROOT_USER_IDS.includes(p.user_id as typeof ROOT_USER_IDS[number])
      }));

      // Sort: root accounts first, then by username
      admins.sort((a, b) => {
        if (a.is_root && !b.is_root) return -1;
        if (!a.is_root && b.is_root) return 1;
        return a.username.localeCompare(b.username);
      });

      setSuperAdmins(admins);
    } catch (error) {
      console.error('Error fetching super admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await supabase
        .from('admin_action_logs')
        .select('*')
        .eq('action_type', 'role_change')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        // Fetch usernames for admin_id and target_user_id
        const userIds = [...new Set([
          ...data.map(l => l.admin_id),
          ...data.filter(l => l.target_user_id).map(l => l.target_user_id!)
        ])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);

        const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username]));

        setAuditLogs(data.map(log => ({
          ...log,
          admin_username: usernameMap.get(log.admin_id) || 'Unknown',
          target_username: log.target_user_id ? usernameMap.get(log.target_user_id) : undefined
        })));
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  if (!isRoot) {
    return null;
  }

  const filteredAdmins = superAdmins.filter(admin =>
    admin.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg">
          <Crown className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Root Controls</h2>
          <p className="text-sm text-muted-foreground">
            Super Admin როლების მართვა
          </p>
        </div>
      </div>

      {/* Super Admins List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            Super Admins ({superAdmins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredAdmins.map((admin) => (
                  <div
                    key={admin.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUser?.user_id === admin.user_id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedUser(admin)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={admin.avatar_url || undefined} />
                        <AvatarFallback>{admin.username[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.username}</span>
                          {admin.is_root && (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                              <Crown className="w-3 h-3 mr-1" />
                              Root
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {admin.last_seen
                            ? `ბოლოს: ${format(new Date(admin.last_seen), 'dd.MM.yyyy HH:mm')}`
                            : 'არ ყოფილა'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredAdmins.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Super Admin ვერ მოიძებნა
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Selected User Role Management */}
      {selectedUser && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              {selectedUser.username} - როლის მართვა
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoleManagement
              targetUserId={selectedUser.user_id}
              targetUsername={selectedUser.username}
              onRoleChanged={fetchSuperAdmins}
            />
          </CardContent>
        </Card>
      )}

      {/* Audit Logs */}
      <Collapsible open={showAuditLogs} onOpenChange={setShowAuditLogs}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="w-full">
              <CardTitle className="flex items-center justify-between text-base cursor-pointer hover:text-primary transition-colors">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Audit Log - როლების ცვლილებები
                </div>
                {showAuditLogs ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </CardTitle>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-muted/30 border text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{log.admin_username}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{log.description}</p>
                      {log.target_username && (
                        <p className="text-xs mt-1">
                          სამიზნე: <span className="font-medium">{log.target_username}</span>
                        </p>
                      )}
                    </div>
                  ))}

                  {auditLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      აუდიტის ჩანაწერები არ არის
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default RootControlsAdmin;
