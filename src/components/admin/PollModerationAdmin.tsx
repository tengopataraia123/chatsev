import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Clock, BarChart3, Filter, Eye, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface PollWithProfile {
  id: string;
  user_id: string;
  title: string | null;
  question: string;
  options: string[];
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  expires_at: string | null;
  is_anonymous: boolean;
  allow_multiple_choice: boolean;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  reviewer?: {
    username: string;
  };
}

interface PollModerationAdminProps {
  onBack: () => void;
}

export const PollModerationAdmin = ({ onBack }: PollModerationAdminProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [polls, setPolls] = useState<PollWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedPoll, setSelectedPoll] = useState<PollWithProfile | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const isAdmin = ['super_admin', 'admin', 'moderator'].includes(userRole || '');

  useEffect(() => {
    if (isAdmin) {
      fetchPolls();
    }
  }, [isAdmin, activeTab]);

  const fetchPolls = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('status', activeTab)
      .order('created_at', { ascending: activeTab === 'pending' });

    if (error) {
      console.error('Error fetching polls:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for all users
    const userIds = [...new Set((data || []).map(p => p.user_id))];
    const reviewerIds = [...new Set((data || []).map(p => p.reviewed_by).filter(Boolean))];
    
    const [profilesRes, reviewersRes] = await Promise.all([
      supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds),
      reviewerIds.length > 0 
        ? supabase.from('profiles').select('user_id, username').in('user_id', reviewerIds as string[])
        : Promise.resolve({ data: [] })
    ]);

    const profilesMap = new Map<string, { username: string; avatar_url: string | null }>();
    profilesRes.data?.forEach(p => profilesMap.set(p.user_id, { username: p.username, avatar_url: p.avatar_url }));
    
    const reviewersMap = new Map<string, { username: string }>();
    reviewersRes.data?.forEach(p => reviewersMap.set(p.user_id, { username: p.username }));

    const pollsWithProfiles: PollWithProfile[] = (data || []).map(poll => ({
      ...poll,
      options: Array.isArray(poll.options) ? poll.options as string[] : [],
      profile: profilesMap.get(poll.user_id),
      reviewer: poll.reviewed_by ? reviewersMap.get(poll.reviewed_by) : undefined
    }));

    setPolls(pollsWithProfiles);
    setLoading(false);
  };

  const handleApprove = async (poll: PollWithProfile) => {
    setProcessing(true);
    
    try {
      await supabase
        .from('polls')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', poll.id);

      // Delete from pending_approvals if exists
      await supabase
        .from('pending_approvals')
        .delete()
        .eq('content_id', poll.id)
        .eq('type', 'poll');

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: poll.user_id,
        from_user_id: user?.id,
        type: 'content_approved',
        message: 'თქვენი გამოკითხვა დადასტურდა!'
      });

      toast({ title: 'გამოკითხვა დადასტურდა!' });
      fetchPolls();
      setSelectedPoll(null);
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPoll || !rejectReason.trim()) {
      toast({ title: 'გთხოვთ მიუთითოთ მიზეზი', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    
    try {
      await supabase
        .from('polls')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason.trim(),
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedPoll.id);

      // Delete from pending_approvals if exists
      await supabase
        .from('pending_approvals')
        .delete()
        .eq('content_id', selectedPoll.id)
        .eq('type', 'poll');

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: selectedPoll.user_id,
        from_user_id: user?.id,
        type: 'content_rejected',
        message: `თქვენი გამოკითხვა უარყოფილია: ${rejectReason.trim()}`
      });

      toast({ title: 'გამოკითხვა უარყოფილია' });
      fetchPolls();
      setSelectedPoll(null);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (poll: PollWithProfile) => {
    try {
      await supabase.from('polls').delete().eq('id', poll.id);
      toast({ title: 'გამოკითხვა წაიშალა' });
      fetchPolls();
    } catch {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600">მომლოდინე</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-500/20 text-green-600">დადასტურებული</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-500/20 text-red-600">უარყოფილი</Badge>;
      default: return null;
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">არ გაქვთ წვდომა</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">გამოკითხვების მოდერაცია</h1>
          <p className="text-sm text-muted-foreground">დაადასტურეთ ან უარყავით გამოკითხვები</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            მომლოდინე
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <Check className="w-4 h-4" />
            დადასტურებული
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <X className="w-4 h-4" />
            უარყოფილი
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {activeTab === 'pending' && 'მომლოდინე გამოკითხვები არ არის'}
                {activeTab === 'approved' && 'დადასტურებული გამოკითხვები არ არის'}
                {activeTab === 'rejected' && 'უარყოფილი გამოკითხვები არ არის'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)] min-h-[300px]">
              <div className="space-y-3">
                {polls.map((poll) => (
                  <Card key={poll.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={poll.profile?.avatar_url || undefined} />
                            <AvatarFallback>{poll.profile?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{poll.profile?.username || 'უცნობი'}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(poll.created_at), { locale: ka, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(poll.status)}
                      </div>

                      {/* Poll Preview */}
                      <div className="bg-secondary/30 rounded-lg p-3 mb-3">
                        {poll.title && <h4 className="font-semibold mb-1">{poll.title}</h4>}
                        <p className="text-sm mb-2">{poll.question}</p>
                        <div className="space-y-1">
                          {poll.options.slice(0, 3).map((option, i) => (
                            <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-4 h-4 rounded border border-border flex-shrink-0" />
                              {option}
                            </div>
                          ))}
                          {poll.options.length > 3 && (
                            <p className="text-xs text-muted-foreground">+{poll.options.length - 3} სხვა ვარიანტი</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {poll.is_anonymous && <Badge variant="secondary" className="text-xs">ანონიმური</Badge>}
                          {poll.allow_multiple_choice && <Badge variant="secondary" className="text-xs">მრავალი არჩევანი</Badge>}
                        </div>
                      </div>

                      {/* Rejection reason */}
                      {poll.status === 'rejected' && poll.rejection_reason && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-destructive text-sm mb-1">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">უარყოფის მიზეზი</span>
                          </div>
                          <p className="text-sm">{poll.rejection_reason}</p>
                        </div>
                      )}

                      {/* Reviewer info */}
                      {poll.reviewed_by && poll.reviewer && (
                        <p className="text-xs text-muted-foreground mb-3">
                          განიხილა: {poll.reviewer.username} • {formatDistanceToNow(new Date(poll.reviewed_at!), { locale: ka, addSuffix: true })}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {activeTab === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(poll)}
                              disabled={processing}
                              className="flex-1"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              დადასტურება
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => { setSelectedPoll(poll); setShowRejectDialog(true); }}
                              disabled={processing}
                              className="flex-1"
                            >
                              <X className="w-4 h-4 mr-1" />
                              უარყოფა
                            </Button>
                          </>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDelete(poll)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>გამოკითხვის უარყოფა</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              გთხოვთ მიუთითოთ უარყოფის მიზეზი (აუცილებელია)
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="მიზეზი..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              გაუქმება
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim() || processing}
            >
              უარყოფა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PollModerationAdmin;
