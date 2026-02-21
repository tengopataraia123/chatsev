import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Eye, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
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

interface ProfileVisitorsFullPageProps {
  onBack: () => void;
  onNavigateToProfile?: (userId: string) => void;
  initialVisitors?: ProfileVisitor[];
}

const ProfileVisitorsFullPage = ({ onBack, onNavigateToProfile, initialVisitors }: ProfileVisitorsFullPageProps) => {
  const [visitors, setVisitors] = useState<ProfileVisitor[]>(initialVisitors || []);
  const [loading, setLoading] = useState(!initialVisitors || initialVisitors.length === 0);
  const [clearing, setClearing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (user && (!initialVisitors || initialVisitors.length === 0)) {
      fetchVisitors();
    } else if (initialVisitors && initialVisitors.length > 0) {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-visitors-fullpage')
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
  }, [user]);

  const fetchVisitors = async () => {
    if (!user) return;
    setLoading(true);

    try {
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
        const filteredData = data.filter(v => !superAdminIds.has(v.visitor_user_id));
        
        if (filteredData.length > 0) {
          const visitorIds = filteredData.map(v => v.visitor_user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', visitorIds);

          const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

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

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div 
        className="bg-card border-b border-border flex-shrink-0"
      >
        <div className="flex items-center justify-between px-3 h-[52px]">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">ვიზიტორები</h1>
            </div>
          </div>

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
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ვიზიტორების წაშლა</AlertDialogTitle>
                  <AlertDialogDescription>
                    ნამდვილად გსურთ ყველა ვიზიტორის ისტორიის წაშლა?
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">იტვირთება...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Eye className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">ჯერ არავის ენახა თქვენი პროფილი</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visitors.map((visitor) => (
              <button
                key={visitor.id}
                onClick={() => handleVisitorClick(visitor.visitor_user_id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors active:bg-secondary"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden flex-shrink-0">
                  {visitor.visitor?.avatar_url ? (
                    <img 
                      src={visitor.visitor.avatar_url} 
                      alt={visitor.visitor.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {visitor.visitor?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {visitor.visitor?.username || 'უცნობი მომხმარებელი'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatVisitTime(visitor.visited_at)}
                  </p>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ProfileVisitorsFullPage;
