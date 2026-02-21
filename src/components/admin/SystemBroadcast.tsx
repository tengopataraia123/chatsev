import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Radio, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Trash2,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface Broadcast {
  id: string;
  title: string | null;
  message: string;
  link_url: string | null;
  target_type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export const SystemBroadcast = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Preview & confirm dialogs
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [showBroadcastDetails, setShowBroadcastDetails] = useState(false);
  
  // Stats for selected broadcast
  const [recipientStats, setRecipientStats] = useState({ queued: 0, sent: 0, failed: 0, seen: 0 });

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setBroadcasts(data);
    }
    setLoading(false);
  };

  const getTargetCount = async (): Promise<number> => {
    if (targetType === 'admins') {
      const { count } = await supabase
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .in('role', ['super_admin', 'admin', 'moderator']);
      return count || 0;
    }
    
    // For all/girls/boys - count with filters
    let query = supabase.from('profiles').select('user_id', { count: 'exact', head: true });
    
    if (targetType === 'girls') {
      query = query.eq('gender', 'female');
    } else if (targetType === 'boys') {
      query = query.eq('gender', 'male');
    }
    
    // Exclude banned users
    query = query.or('is_site_banned.is.null,is_site_banned.eq.false');
    
    const { count } = await query;
    return count || 0;
  };

  const handleCreateBroadcast = async () => {
    if (!message.trim()) {
      toast({ title: 'შეცდომა', description: 'შეტყობინება აუცილებელია', variant: 'destructive' });
      return;
    }
    
    if (!sendNow && (!scheduledDate || !scheduledTime)) {
      toast({ title: 'შეცდომა', description: 'გთხოვთ აირჩიოთ თარიღი და დრო', variant: 'destructive' });
      return;
    }
    
    setSending(true);
    
    try {
      const scheduledAt = !sendNow 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;
      
      // Create broadcast
      const { data: broadcast, error: broadcastError } = await supabase
        .from('system_broadcasts')
        .insert({
          created_by: user?.id,
          title: title.trim() || null,
          message: message.trim(),
          link_url: linkUrl.trim() || null,
          target_type: targetType,
          status: sendNow ? 'sending' : 'scheduled',
          scheduled_at: scheduledAt,
        })
        .select()
        .single();
      
      if (broadcastError) throw broadcastError;
      
      if (sendNow) {
        // Get target users
        const targetUsers = await getTargetUsers();
        
        // Create recipient records in batches
        const BATCH_SIZE = 500;
        let sentCount = 0;
        
        // Update total recipients
        await supabase
          .from('system_broadcasts')
          .update({ total_recipients: targetUsers.length })
          .eq('id', broadcast.id);
        
        let failedCount = 0;
        for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
          const batch = targetUsers.slice(i, i + BATCH_SIZE);
          const recipients = batch.map(userId => ({
            broadcast_id: broadcast.id,
            user_id: userId,
            delivery_status: 'sent',
            delivered_at: new Date().toISOString(),
          }));
          
          const { error: recipientError } = await supabase
            .from('system_broadcast_recipients')
            .insert(recipients);
          
          if (recipientError) {
            console.error('Broadcast recipient insert error:', recipientError);
            failedCount += batch.length;
          } else {
            sentCount += batch.length;
          }
          
          // Update progress
          await supabase
            .from('system_broadcasts')
            .update({ sent_count: sentCount, failed_count: failedCount })
            .eq('id', broadcast.id);
        }
        
        // Mark as sent
        await supabase
          .from('system_broadcasts')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(),
            sent_count: sentCount
          })
          .eq('id', broadcast.id);
        
        toast({ 
          title: failedCount > 0 ? 'ნაწილობრივ გაიგზავნა' : 'გაიგზავნა!', 
          description: failedCount > 0 
            ? `გაეგზავნა ${sentCount} მომხმარებელს, ${failedCount} ვერ გაიგზავნა`
            : `შეტყობინება გაეგზავნა ${sentCount} მომხმარებელს`,
          variant: failedCount > 0 ? 'destructive' : 'default'
        });
      } else {
        toast({ title: 'დაგეგმილია!', description: 'შეტყობინება დაგეგმილია გასაგზავნად' });
      }
      
      // Reset form
      setTitle('');
      setMessage('');
      setLinkUrl('');
      setTargetType('all');
      setSendNow(true);
      setShowConfirm(false);
      setActiveTab('history');
      fetchBroadcasts();
      
    } catch (error) {
      console.error('Error creating broadcast:', error);
      toast({ title: 'შეცდომა', description: 'შეტყობინების გაგზავნა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const getTargetUsers = async (): Promise<string[]> => {
    let userIds: string[] = [];
    const PAGE_SIZE = 1000;
    
    if (targetType === 'admins') {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'admin', 'moderator']);
      userIds = data?.map(r => r.user_id) || [];
    } else {
      // Paginate to get ALL users (Supabase default limit is 1000)
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        let query = supabase
          .from('profiles')
          .select('user_id')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (targetType === 'girls') {
          query = query.eq('gender', 'female');
        } else if (targetType === 'boys') {
          query = query.eq('gender', 'male');
        }
        
        // Exclude banned users
        query = query.or('is_site_banned.is.null,is_site_banned.eq.false');
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching users page:', page, error);
          break;
        }
        
        if (data && data.length > 0) {
          userIds.push(...data.map(p => p.user_id));
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`Total users fetched: ${userIds.length} (${page} pages)`);
    }
    
    return userIds;
  };

  const handleCancelScheduled = async (broadcastId: string) => {
    const { error } = await supabase
      .from('system_broadcasts')
      .update({ status: 'canceled' })
      .eq('id', broadcastId);
    
    if (!error) {
      toast({ title: 'გაუქმებულია' });
      fetchBroadcasts();
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;
    
    const { error } = await supabase
      .from('system_broadcasts')
      .delete()
      .eq('id', broadcastId);
    
    if (!error) {
      toast({ title: 'წაიშალა' });
      fetchBroadcasts();
      setShowBroadcastDetails(false);
    }
  };

  const viewBroadcastDetails = async (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast);
    
    // Fetch recipient stats
    const { data: stats } = await supabase
      .from('system_broadcast_recipients')
      .select('delivery_status')
      .eq('broadcast_id', broadcast.id);
    
    if (stats) {
      setRecipientStats({
        queued: stats.filter(s => s.delivery_status === 'queued').length,
        sent: stats.filter(s => s.delivery_status === 'sent').length,
        failed: stats.filter(s => s.delivery_status === 'failed').length,
        seen: stats.filter(s => s.delivery_status === 'seen').length,
      });
    }
    
    setShowBroadcastDetails(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">დრაფტი</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500">დაგეგმილი</Badge>;
      case 'sending':
        return <Badge className="bg-yellow-500">იგზავნება...</Badge>;
      case 'sent':
        return <Badge className="bg-green-500">გაგზავნილი</Badge>;
      case 'canceled':
        return <Badge variant="destructive">გაუქმებული</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTargetLabel = (type: string) => {
    switch (type) {
      case 'all': return 'ყველას';
      case 'girls': return 'გოგოებს';
      case 'boys': return 'ბიჭებს';
      case 'admins': return 'ადმინებს';
      default: return type;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)] overflow-hidden">
      <div className="flex items-center gap-2 flex-shrink-0 pb-4">
        <Radio className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">სისტემური გზავნილები</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
          <TabsTrigger value="create">ახლის შექმნა</TabsTrigger>
          <TabsTrigger value="history">ისტორია</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="flex-1 overflow-y-auto mt-4 pb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                ახალი შეტყობინება
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sender info */}
              <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">System</Badge>
                <span className="text-sm text-muted-foreground">ChatSev System</span>
              </div>
              
              {/* Title */}
              <div className="space-y-2">
                <Label>სათაური (არასავალდებულო)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="შეტყობინების სათაური..."
                  maxLength={100}
                />
              </div>
              
              {/* Message */}
              <div className="space-y-2">
                <Label>შეტყობინება *</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="შეიყვანეთ შეტყობინება..."
                  maxLength={2000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/2000
                </p>
              </div>
              
              {/* Link URL */}
              <div className="space-y-2">
                <Label>ლინკი (არასავალდებულო)</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              
              {/* Target recipients */}
              <div className="space-y-3">
                <Label>მიმღებები</Label>
                <RadioGroup value={targetType} onValueChange={setTargetType}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 p-2 border rounded-lg">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="cursor-pointer flex items-center gap-1">
                        <Users className="h-4 w-4" /> ყველას
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 border rounded-lg">
                      <RadioGroupItem value="girls" id="girls" />
                      <Label htmlFor="girls" className="cursor-pointer">👩 გოგოებს</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 border rounded-lg">
                      <RadioGroupItem value="boys" id="boys" />
                      <Label htmlFor="boys" className="cursor-pointer">👨 ბიჭებს</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 border rounded-lg">
                      <RadioGroupItem value="admins" id="admins" />
                      <Label htmlFor="admins" className="cursor-pointer">🛡️ ადმინებს</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Delivery options */}
              <div className="space-y-3">
                <Label>გაგზავნის დრო</Label>
                <RadioGroup value={sendNow ? 'now' : 'schedule'} onValueChange={(v) => setSendNow(v === 'now')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="now" id="now" />
                    <Label htmlFor="now" className="cursor-pointer">ახლავე გაგზავნა</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="schedule" id="schedule" />
                    <Label htmlFor="schedule" className="cursor-pointer">დაგეგმვა</Label>
                  </div>
                </RadioGroup>
                
                {!sendNow && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <Label className="text-xs">თარიღი</Label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">დრო</Label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPreview(true)}
                  disabled={!message.trim()}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  გადახედვა
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setShowConfirm(true)}
                  disabled={!message.trim() || sending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {sendNow ? 'გაგზავნა' : 'დაგეგმვა'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 overflow-y-auto mt-4 pb-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">გაგზავნილი შეტყობინებები</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchBroadcasts}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : broadcasts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  ჯერ არ გაგზავნილა შეტყობინება
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {broadcasts.map(broadcast => (
                      <div
                        key={broadcast.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => viewBroadcastDetails(broadcast)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(broadcast.status)}
                              <Badge variant="outline" className="text-xs">
                                {getTargetLabel(broadcast.target_type)}
                              </Badge>
                            </div>
                            {broadcast.title && (
                              <p className="font-medium text-sm truncate">{broadcast.title}</p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {broadcast.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {broadcast.sent_count}/{broadcast.total_recipients}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(broadcast.created_at), 'dd MMM, HH:mm', { locale: ka })}
                              </span>
                            </div>
                          </div>
                          {broadcast.status === 'scheduled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelScheduled(broadcast.id);
                              }}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
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
        </TabsContent>
      </Tabs>
      
      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>შეტყობინების გადახედვა</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">System</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(), 'dd MMM, HH:mm', { locale: ka })}
              </span>
            </div>
            {title && <p className="font-medium">{title}</p>}
            <p className="text-sm whitespace-pre-wrap">{message}</p>
            {linkUrl && (
              <a href={linkUrl} className="text-primary text-sm hover:underline block">
                {linkUrl}
              </a>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              დახურვა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              დარწმუნებული ხარ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            შეტყობინება გაეგზავნება <strong>{getTargetLabel(targetType)}</strong>.
            {sendNow 
              ? ' გაგზავნა დაიწყება დაუყოვნებლივ.'
              : ` გაიგზავნება ${scheduledDate} ${scheduledTime}-ზე.`
            }
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={sending}>
              გაუქმება
            </Button>
            <Button onClick={handleCreateBroadcast} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  იგზავნება...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  დადასტურება
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Broadcast Details Dialog */}
      <Dialog open={showBroadcastDetails} onOpenChange={setShowBroadcastDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>შეტყობინების დეტალები</DialogTitle>
          </DialogHeader>
          {selectedBroadcast && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedBroadcast.status)}
                <Badge variant="outline">{getTargetLabel(selectedBroadcast.target_type)}</Badge>
              </div>
              
              {selectedBroadcast.title && (
                <div>
                  <Label className="text-xs text-muted-foreground">სათაური</Label>
                  <p className="font-medium">{selectedBroadcast.title}</p>
                </div>
              )}
              
              <div>
                <Label className="text-xs text-muted-foreground">შეტყობინება</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedBroadcast.message}</p>
              </div>
              
              {selectedBroadcast.link_url && (
                <div>
                  <Label className="text-xs text-muted-foreground">ლინკი</Label>
                  <a href={selectedBroadcast.link_url} className="text-primary text-sm hover:underline block">
                    {selectedBroadcast.link_url}
                  </a>
                </div>
              )}
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{recipientStats.queued}</p>
                  <p className="text-[10px] text-muted-foreground">რიგში</p>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{recipientStats.sent}</p>
                  <p className="text-[10px] text-muted-foreground">გაგზავნილი</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{recipientStats.failed}</p>
                  <p className="text-[10px] text-muted-foreground">ჩავარდა</p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">{recipientStats.seen}</p>
                  <p className="text-[10px] text-muted-foreground">ნანახი</p>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>შექმნილია: {format(new Date(selectedBroadcast.created_at), 'dd MMM yyyy, HH:mm', { locale: ka })}</p>
                {selectedBroadcast.sent_at && (
                  <p>გაგზავნილია: {format(new Date(selectedBroadcast.sent_at), 'dd MMM yyyy, HH:mm', { locale: ka })}</p>
                )}
                {selectedBroadcast.scheduled_at && selectedBroadcast.status === 'scheduled' && (
                  <p>დაგეგმილია: {format(new Date(selectedBroadcast.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: ka })}</p>
                )}
              </div>
              
              <div className="flex gap-2 pt-2">
                {selectedBroadcast.status === 'scheduled' && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCancelScheduled(selectedBroadcast.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    გაუქმება
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDeleteBroadcast(selectedBroadcast.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  წაშლა
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
