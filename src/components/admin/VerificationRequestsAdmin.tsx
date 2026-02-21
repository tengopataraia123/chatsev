import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, BadgeCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import VerifiedBadge from '@/components/verified/VerifiedBadge';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  requested_note: string | null;
  admin_note: string | null;
  created_at: string;
  decided_at: string | null;
  profile?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export const VerificationRequestsAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching requests:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for each request
    const userIds = data?.map(r => r.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, is_verified')
      .in('user_id', userIds);

    const requestsWithProfiles = data?.map(r => ({
      ...r,
      profile: profiles?.find(p => p.user_id === r.user_id)
    })) || [];

    setRequests(requestsWithProfiles);
    setLoading(false);
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequest || !user) return;
    
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await supabase.functions.invoke('verify-user', {
        body: {
          action: action === 'approve' ? 'verify' : 'reject',
          targetUserId: selectedRequest.user_id,
          requestId: selectedRequest.id,
          note: adminNote
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({ title: action === 'approve' ? 'მომხმარებელი ვერიფიცირდა' : 'მოთხოვნა უარყოფილია' });
      setSelectedRequest(null);
      setAdminNote('');
      fetchRequests();
    } catch (error: any) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="w-3 h-3 mr-1" /> მოლოდინში</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500"><CheckCircle className="w-3 h-3 mr-1" /> დადასტურებული</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> უარყოფილი</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 150px)' }}>
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
        <CardHeader className="px-3 sm:px-6 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BadgeCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="truncate">ვერიფიკაციის მოთხოვნები</span>
          </CardTitle>
          <ScrollArea className="w-full">
            <div className="flex gap-2 mt-2 pb-2">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className="whitespace-nowrap flex-shrink-0 text-xs sm:text-sm"
                >
                  {f === 'pending' ? 'მოლოდინში' : f === 'approved' ? 'დადასტურებული' : f === 'rejected' ? 'უარყოფილი' : 'ყველა'}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">მოთხოვნები არ არის</p>
          ) : (
            <ScrollArea className="h-full" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="space-y-3">
              {requests.map(request => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/50 rounded-lg gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="flex-shrink-0 w-10 h-10">
                      <AvatarImage src={request.profile?.avatar_url || ''} />
                      <AvatarFallback>{request.profile?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{request.profile?.username}</span>
                        {request.profile?.is_verified && <VerifiedBadge size="xs" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                      {request.requested_note && (
                        <p className="text-xs sm:text-sm mt-1 text-muted-foreground line-clamp-1">
                          {request.requested_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end flex-shrink-0">
                    {getStatusBadge(request.status)}
                    {request.status === 'pending' && (
                      <Button size="sm" onClick={() => setSelectedRequest(request)} className="whitespace-nowrap">
                        განხილვა
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ვერიფიკაციის მოთხოვნა</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedRequest.profile?.avatar_url || ''} />
                  <AvatarFallback>{selectedRequest.profile?.username?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRequest.profile?.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedRequest.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              {selectedRequest.requested_note && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">მომხმარებლის შეტყობინება:</p>
                  <p className="text-sm">{selectedRequest.requested_note}</p>
                </div>
              )}
              
              <Textarea
                placeholder="ადმინის შენიშვნა (არასავალდებულო)"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={processing}>
              გაუქმება
            </Button>
            <Button variant="destructive" onClick={() => handleAction('reject')} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              უარყოფა
            </Button>
            <Button onClick={() => handleAction('approve')} disabled={processing} className="bg-emerald-500 hover:bg-emerald-600">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              დადასტურება
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationRequestsAdmin;
