import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, User, Clock, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface DeletedUserLog {
  id: string;
  admin_id: string;
  admin_username: string | null;
  deleted_username: string | null;
  target_user_id: string;
  created_at: string;
}

export const DeletedUsersAdmin = () => {
  const [logs, setLogs] = useState<DeletedUserLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      // Fetch deletion logs
      const { data: actionLogs, error } = await supabase
        .from('admin_action_logs')
        .select('id, admin_id, target_user_id, metadata, created_at')
        .eq('action_type', 'delete')
        .eq('action_category', 'user')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch admin usernames
      const adminIds = [...new Set(actionLogs?.map(log => log.admin_id) || [])];
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', adminIds);

      const adminMap = new Map(adminProfiles?.map(p => [p.user_id, p.username]) || []);

      const formattedLogs: DeletedUserLog[] = (actionLogs || []).map(log => ({
        id: log.id,
        admin_id: log.admin_id,
        admin_username: adminMap.get(log.admin_id) || 'უცნობი',
        deleted_username: (log.metadata as Record<string, unknown>)?.deleted_username as string || 'უცნობი',
        target_user_id: log.target_user_id || '',
        created_at: log.created_at
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching deleted users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
            <span className="truncate">წაშლილი მომხმარებლები</span>
            <Badge variant="secondary" className="ml-auto text-xs">{logs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              წაშლილი მომხმარებლები არ არის
            </div>
          ) : (
            <ScrollArea style={{ height: 'calc(100vh - 220px)', minHeight: '200px', WebkitOverflowScrolling: 'touch' }}>
            <div className="space-y-2 sm:space-y-3 p-3 sm:p-0">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-card border border-border rounded-lg"
                >
                  {/* Deleted User Info */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate text-destructive">
                        {log.deleted_username}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        ID: {log.target_user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  {/* Admin Info */}
                  <div className="flex items-center gap-2 sm:gap-3 pl-10 sm:pl-0">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-[150px]">
                      {log.admin_username}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground pl-10 sm:pl-0 flex-shrink-0">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd.MM.yy HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeletedUsersAdmin;
