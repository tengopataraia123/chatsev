import { useState, useEffect } from 'react';
import { Eye, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ProfileVisitor {
  id: string;
  visitor_user_id: string;
  visited_at: string;
  visitor?: {
    username: string;
    avatar_url: string | null;
  };
}

interface ProfileVisitorsProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProfile?: (userId: string) => void;
}

const ProfileVisitors = ({ isOpen, onClose, onNavigateToProfile }: ProfileVisitorsProps) => {
  const [visitors, setVisitors] = useState<ProfileVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchVisitors();
    }
  }, [isOpen, user]);

  // Realtime subscription for new visitors
  useEffect(() => {
    if (!isOpen || !user) return;

    const channel = supabase
      .channel('profile-visitors-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_visits',
          filter: `profile_user_id=eq.${user.id}`
        },
        () => {
          fetchVisitors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user]);

  const fetchVisitors = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch visitors and super admins in parallel for speed
      const [visitorsResult, superAdminsResult] = await Promise.all([
        supabase
          .from('profile_visits')
          .select('id, visitor_user_id, visited_at')
          .eq('profile_user_id', user.id)
          .order('visited_at', { ascending: false })
          .limit(50),
        supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'super_admin')
      ]);

      if (visitorsResult.error) throw visitorsResult.error;
      
      const superAdminIds = new Set(superAdminsResult.data?.map(sa => sa.user_id) || []);
      const data = visitorsResult.data;

      if (data && data.length > 0) {
        // Filter out super admins from visitors
        const filteredData = data.filter(v => !superAdminIds.has(v.visitor_user_id));
        
        if (filteredData.length > 0) {
          const visitorIds = filteredData.map(v => v.visitor_user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', visitorIds);

          const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

          // Filter out CHEGE from visitors list
          const visibleVisitors = filteredData
            .map(v => ({
              ...v,
              visitor: profilesMap.get(v.visitor_user_id) || undefined
            }))
            .filter(v => v.visitor?.username !== 'CHEGE');

          setVisitors(visibleVisitors);
        } else {
          setVisitors([]);
        }
      } else {
        setVisitors([]);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatVisitTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM, HH:mm', { locale: ka });
    } catch {
      return '';
    }
  };

  const handleVisitorClick = (visitorId: string) => {
    onClose();
    onNavigateToProfile?.(visitorId);
  };

  const clearAllVisitors = async () => {
    if (!user) return;
    setClearing(true);
    try {
      const { error } = await supabase
        .from('profile_visits')
        .delete()
        .eq('profile_user_id', user.id);
      
      if (error) throw error;
      
      setVisitors([]);
      toast.success('ვიზიტორები წაიშალა');
    } catch (error) {
      console.error('Error clearing visitors:', error);
      toast.error('შეცდომა ვიზიტორების წაშლისას');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              პროფილის ვიზიტორები
            </DialogTitle>
            {visitors.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={clearing}
                  >
                    {clearing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        გასუფთავება
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ვიზიტორების წაშლა</AlertDialogTitle>
                    <AlertDialogDescription>
                      ნამდვილად გსურთ ყველა ვიზიტორის ისტორიის წაშლა? ეს მოქმედება ვერ გაუქმდება.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>გაუქმება</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={clearAllVisitors}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      წაშლა
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>ჯერ არავის ენახა თქვენი პროფილი</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visitors.map((visitor) => (
                <button
                  key={visitor.id}
                  onClick={() => handleVisitorClick(visitor.visitor_user_id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                    {visitor.visitor?.avatar_url ? (
                      <img 
                        src={visitor.visitor.avatar_url} 
                        alt={visitor.visitor.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {visitor.visitor?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">
                      {visitor.visitor?.username || 'უცნობი მომხმარებელი'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatVisitTime(visitor.visited_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileVisitors;
