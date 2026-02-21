import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface Violation {
  id: string;
  user_id: string;
  target_user_id: string | null;
  original_text: string;
  detected_domain: string;
  context_type: string;
  created_at: string;
  user_profile?: { username: string };
  target_profile?: { username: string };
}

export const AdViolationAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const adminCheckedRef = useRef<string | null>(null);

  // Check admin status - only once per user ID
  useEffect(() => {
    const userId = user?.id;
    
    if (!userId) {
      setIsAdmin(false);
      adminCheckedRef.current = null;
      return;
    }

    // Skip if already checked for this user
    if (adminCheckedRef.current === userId) {
      return;
    }

    const checkAdmin = async () => {
      try {
        adminCheckedRef.current = userId;
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        if (error) {
          console.error('AdViolationAlert: Error checking admin status:', error);
          return;
        }

        const hasAdminRole = data?.some(r => 
          r.role === 'admin' || r.role === 'super_admin' || r.role === 'moderator'
        );
        
        setIsAdmin(!!hasAdminRole);
      } catch (err) {
        console.error('AdViolationAlert: Error in checkAdmin:', err);
      }
    };

    checkAdmin();
  }, [user?.id]);

  // Subscribe to violations when admin - listen for both INSERT and UPDATE
  useEffect(() => {
    const userId = user?.id;
    if (!isAdmin || !userId) {
      return;
    }

    const channel = supabase
      .channel('ad-violations-alert-' + userId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ad_violations'
        },
        async (payload) => {
          const violation = payload.new as Violation;

          // Fetch user profiles
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', violation.user_id)
            .maybeSingle();

          let targetProfile = null;
          if (violation.target_user_id) {
            const { data } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', violation.target_user_id)
              .maybeSingle();
            targetProfile = data;
          }

          const newViolation = {
            ...violation,
            user_profile: userProfile || undefined,
            target_profile: targetProfile || undefined
          };
          setViolations((prev) => [newViolation, ...prev]);
          setIsOpen(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ad_violations'
        },
        (payload) => {
          const updated = payload.new as Violation & { is_read: boolean };
          
          // If violation is marked as read, remove it from all admins' screens
          if (updated.is_read) {
            setViolations((prev) => {
              const newList = prev.filter((v) => v.id !== updated.id);
              if (newList.length === 0) {
                setIsOpen(false);
              }
              return newList;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user?.id]);

  // Update open state when violations change
  useEffect(() => {
    if (violations.length > 0) {
      setIsOpen(true);
    }
  }, [violations]);

  const dismissViolation = useCallback(async (id: string) => {
    // Remove from local state first
    setViolations((prev) => {
      const newList = prev.filter((v) => v.id !== id);
      if (newList.length === 0) {
        setIsOpen(false);
      }
      return newList;
    });
    
    // Mark as read in database
    try {
      await supabase
        .from('ad_violations')
        .update({ is_read: true })
        .eq('id', id);
    } catch (err) {
      console.error('Error marking violation as read:', err);
    }
  }, []);

  const goToProfile = useCallback((targetUserId: string, violationId: string) => {
    // Close dialog and clear local state immediately
    setIsOpen(false);
    setViolations((prev) => prev.filter((v) => v.id !== violationId));
    
    // Mark as read in database - this will trigger UPDATE event for all admins
    supabase
      .from('ad_violations')
      .update({ is_read: true })
      .eq('id', violationId)
      .then(() => {});
    
    // Navigate to profile after dialog closes
    setTimeout(() => {
      window.location.href = `/?view=profile&userId=${targetUserId}`;
    }, 150);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && violations.length > 0) {
      // Dismiss current violation when closing
      dismissViolation(violations[0].id);
    }
    setIsOpen(open);
  }, [violations, dismissViolation]);

  const contextLabels: Record<string, string> = {
    private_messages: 'პირადი შეტყობინება',
    private_message: 'პირადი შეტყობინება',
    group_chat_messages: 'ჯგუფური ჩატი',
    group_chat: 'ჯგუფური ჩატი',
    post_comments: 'კომენტარი',
    comment: 'კომენტარი',
    posts: 'პოსტი',
    post: 'პოსტი',
    unknown: 'უცნობი'
  };

  // Don't render if not admin or no violations
  if (!isAdmin) {
    return null;
  }

  const currentViolation = violations[0];

  return (
    <Dialog open={isOpen && !!currentViolation} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            <span className="text-xl font-bold">🚨 რეკლამა!</span>
          </DialogTitle>
        </DialogHeader>

        {currentViolation && (
          <div className="space-y-4">
            {/* Violation info */}
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">
                  {currentViolation.user_profile?.username || 'უცნობი მომხმარებელი'}
                </span>
                {currentViolation.target_profile && (
                  <>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {currentViolation.target_profile.username}
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">აღმოჩენილი დომენი: </span>
                  <span className="text-destructive font-bold">{currentViolation.detected_domain}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">კონტექსტი: </span>
                  <span>{contextLabels[currentViolation.context_type] || currentViolation.context_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ორიგინალი ტექსტი: </span>
                  <span className="italic break-all">"{currentViolation.original_text}"</span>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(currentViolation.created_at), 'dd MMMM yyyy, HH:mm', { locale: ka })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => goToProfile(currentViolation.user_id, currentViolation.id)}
              >
                <User className="w-4 h-4 mr-2" />
                პროფილზე გადასვლა
              </Button>
              <Button
                variant="outline"
                onClick={() => dismissViolation(currentViolation.id)}
              >
                დახურვა
              </Button>
            </div>

            {/* More violations indicator */}
            {violations.length > 1 && (
              <p className="text-center text-sm text-muted-foreground">
                + {violations.length - 1} სხვა დარღვევა
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
