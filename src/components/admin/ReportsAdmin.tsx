import { useState, useEffect } from 'react';
import { Flag, Eye, Check, X, Loader2, User, MessageSquare, Image, Video, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { logAdminAction } from '@/hooks/useAdminActionLog';

interface Report {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  content_type: string;
  content_id: string;
  reason_type: string | null;
  reason_text: string;
  status: string;
  created_at: string;
  reviewed_by_admin_id: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  content_preview: string | null;
  reporter?: { username: string; avatar_url: string | null };
  reported?: { username: string; avatar_url: string | null };
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-yellow-500',
  reviewing: 'bg-blue-500',
  resolved: 'bg-green-500',
  dismissed: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'ახალი',
  reviewing: 'განხილვაშია',
  resolved: 'დასრულებული',
  dismissed: 'უარყოფილი',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  private_message: 'პირადი შეტყობინება',
  group_message: 'ჯგუფური შეტყობინება',
  post: 'პოსტი',
  photo: 'ფოტო',
  video: 'ვიდეო',
  story: 'სთორი',
  comment: 'კომენტარი',
  reel: 'რილსი',
  profile: 'პროფილი',
  live_comment: 'ლაივის კომენტარი',
};

const REASON_TYPE_LABELS: Record<string, string> = {
  spam: 'სპამი',
  harassment: 'შეურაცხყოფა',
  inappropriate: 'შეუფერებელი',
  fraud: 'თაღლითობა',
  violence: 'ძალადობა',
  other: 'სხვა',
};

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  private_message: <MessageSquare className="h-4 w-4" />,
  group_message: <MessageSquare className="h-4 w-4" />,
  post: <Image className="h-4 w-4" />,
  photo: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  story: <Clock className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
  reel: <Video className="h-4 w-4" />,
  profile: <User className="h-4 w-4" />,
  live_comment: <MessageSquare className="h-4 w-4" />,
};

export default function ReportsAdmin() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchReports = async () => {
    try {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles for reporters and reported users
      const userIds = [...new Set(data?.flatMap(r => [r.reporter_user_id, r.reported_user_id]) || [])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedReports = data?.map(report => ({
        ...report,
        reporter: profileMap.get(report.reporter_user_id),
        reported: profileMap.get(report.reported_user_id),
      })) || [];

      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'შეცდომა',
        description: 'საჩივრების ჩატვირთვა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    if (!user) return;
    setUpdating(true);

    const report = selectedReport;
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          reviewed_by_admin_id: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', reportId);

      if (error) throw error;

      // Log admin action
      const actionType = newStatus === 'resolved' ? 'approve' : newStatus === 'dismissed' ? 'reject' : 'review';
      await logAdminAction({
        actionType,
        actionCategory: 'report',
        targetUserId: report?.reported_user_id,
        targetContentId: reportId,
        targetContentType: 'report',
        description: `საჩივარი ${STATUS_LABELS[newStatus]}: ${report?.reason_text?.substring(0, 50) || 'უცნობი'}`,
        metadata: { 
          report_status: newStatus, 
          content_type: report?.content_type,
          reason_type: report?.reason_type 
        }
      });

      toast({
        title: 'წარმატება',
        description: `საჩივრის სტატუსი შეიცვალა: ${STATUS_LABELS[newStatus]}`,
      });

      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: 'შეცდომა',
        description: 'სტატუსის განახლება ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const newReportsCount = reports.filter(r => r.status === 'new').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-destructive" />
          <h2 className="text-xl font-semibold">საჩივრები</h2>
          {newReportsCount > 0 && (
            <Badge variant="destructive">{newReportsCount} ახალი</Badge>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ფილტრი" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ყველა</SelectItem>
            <SelectItem value="new">ახალი</SelectItem>
            <SelectItem value="reviewing">განხილვაშია</SelectItem>
            <SelectItem value="resolved">დასრულებული</SelectItem>
            <SelectItem value="dismissed">უარყოფილი</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p>საჩივრები არ მოიძებნა</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)] min-h-[400px]">
          <div className="space-y-3">
            {reports.map((report) => (
              <Card
                key={report.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  report.status === 'new' ? 'border-yellow-500/50' : ''
                }`}
                onClick={() => {
                  setSelectedReport(report);
                  setAdminNotes(report.admin_notes || '');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={STATUS_COLORS[report.status]}>
                          {STATUS_LABELS[report.status]}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {CONTENT_TYPE_ICONS[report.content_type]}
                          {CONTENT_TYPE_LABELS[report.content_type]}
                        </Badge>
                        {report.reason_type && (
                          <Badge variant="secondary">
                            {REASON_TYPE_LABELS[report.reason_type]}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-muted-foreground">მიერ:</span>
                          <span className="font-medium">{report.reporter?.username || 'უცნობი'}</span>
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">წინააღმდეგ:</span>
                          <span className="font-medium">{report.reported?.username || 'უცნობი'}</span>
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.reason_text}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {format(new Date(report.created_at), 'dd MMM yyyy, HH:mm', { locale: ka })}
                      </p>
                    </div>

                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              საჩივრის დეტალები
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">ვინ გაასაჩივრა</p>
                  <p className="font-medium">{selectedReport.reporter?.username || 'უცნობი'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">ვისი კონტენტი</p>
                  <p className="font-medium">{selectedReport.reported?.username || 'უცნობი'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">კონტენტის ტიპი</p>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    {CONTENT_TYPE_ICONS[selectedReport.content_type]}
                    {CONTENT_TYPE_LABELS[selectedReport.content_type]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">მიზეზის ტიპი</p>
                  <p className="font-medium">
                    {selectedReport.reason_type 
                      ? REASON_TYPE_LABELS[selectedReport.reason_type] 
                      : 'არ არის მითითებული'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">სტატუსი</p>
                  <Badge className={STATUS_COLORS[selectedReport.status]}>
                    {STATUS_LABELS[selectedReport.status]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">თარიღი</p>
                  <p className="font-medium">
                    {format(new Date(selectedReport.created_at), 'dd MMM yyyy, HH:mm', { locale: ka })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">მიზეზი</p>
                <Card>
                  <CardContent className="p-3">
                    <p>{selectedReport.reason_text}</p>
                  </CardContent>
                </Card>
              </div>

              {selectedReport.content_preview && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">კონტენტის preview</p>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-sm">{selectedReport.content_preview}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">ადმინის შენიშვნები</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="დაამატეთ შენიშვნა..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => updateReportStatus(selectedReport.id, 'reviewing')}
                  disabled={updating || selectedReport.status === 'reviewing'}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  განხილვაში
                </Button>
                <Button
                  variant="default"
                  onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  დასრულება
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => updateReportStatus(selectedReport.id, 'dismissed')}
                  disabled={updating}
                >
                  <X className="mr-2 h-4 w-4" />
                  უარყოფა
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
