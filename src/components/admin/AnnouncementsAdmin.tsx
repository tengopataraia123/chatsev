import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Save,
  Send,
  Calendar,
  Upload,
  X,
  Archive,
  Search,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { logAdminAction } from '@/hooks/useAdminActionLog';

type AnnouncementStatus = 'draft' | 'published' | 'archived';

interface Announcement {
  id: string;
  title: string;
  content_html: string;
  content_json: unknown;
  status: AnnouncementStatus;
  priority: number;
  audience: string;
  publish_start: string | null;
  publish_end: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_username?: string;
  publish_as_system?: boolean;
}

interface Attachment {
  id: string;
  announcement_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'ყველა' },
  { value: 'draft', label: 'დრაფტი' },
  { value: 'published', label: 'გამოქვეყნებული' },
  { value: 'archived', label: 'დაარქივებული' },
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'video/mp4'
];

export const AnnouncementsAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [showEditor, setShowEditor] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [priority, setPriority] = useState(0);
  const [publishStart, setPublishStart] = useState('');
  const [publishEnd, setPublishEnd] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [publishAsSystem, setPublishAsSystem] = useState(false);
  
  // Dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as AnnouncementStatus);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch creator usernames
      const creatorIds = [...new Set((data || []).map(a => a.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', creatorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      
      const announcementsWithUsernames = (data || []).map(a => ({
        ...a,
        creator_username: profileMap.get(a.created_by) || 'Unknown'
      })) as Announcement[];
      
      setAnnouncements(announcementsWithUsernames);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({ title: 'შეცდომა', description: 'განცხადებების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setTitle('');
    setContentHtml('');
    setStatus('draft');
    setPriority(0);
    setPublishStart('');
    setPublishEnd('');
    setAttachments([]);
    setEditingAnnouncement(null);
    setPublishAsSystem(false);
  };

  const openEditor = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setTitle(announcement.title);
      setContentHtml(announcement.content_html);
      setStatus(announcement.status === 'archived' ? 'draft' : announcement.status);
      setPriority(announcement.priority);
      setPublishStart(announcement.publish_start ? announcement.publish_start.slice(0, 16) : '');
      setPublishEnd(announcement.publish_end ? announcement.publish_end.slice(0, 16) : '');
      setPublishAsSystem(announcement.publish_as_system ?? false);
      // Fetch attachments
      fetchAttachments(announcement.id);
    } else {
      resetForm();
    }
    setShowEditor(true);
  };

  const fetchAttachments = async (announcementId: string) => {
    const { data } = await supabase
      .from('announcement_attachments')
      .select('*')
      .eq('announcement_id', announcementId);
    setAttachments(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingFile(true);
    
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          toast({ title: 'შეცდომა', description: `${file.name} აჭარბებს 25MB ლიმიტს`, variant: 'destructive' });
          continue;
        }
        
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast({ title: 'შეცდომა', description: `${file.name} - არასწორი ფაილის ტიპი`, variant: 'destructive' });
          continue;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `announcements/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(storagePath, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: 'შეცდომა', description: `${file.name} ატვირთვა ვერ მოხერხდა`, variant: 'destructive' });
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('public-assets')
          .getPublicUrl(storagePath);
        
        // If editing, save to DB. Otherwise, store temporarily
        if (editingAnnouncement) {
          const { data: attachment, error: insertError } = await supabase
            .from('announcement_attachments')
            .insert({
              announcement_id: editingAnnouncement.id,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              storage_path: storagePath,
              public_url: publicUrl
            })
            .select()
            .single();
          
          if (!insertError && attachment) {
            setAttachments(prev => [...prev, attachment]);
          }
        } else {
          // Temporary attachment (will be saved when announcement is created)
          setAttachments(prev => [...prev, {
            id: `temp-${Date.now()}`,
            announcement_id: '',
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: storagePath,
            public_url: publicUrl,
            created_at: new Date().toISOString()
          }]);
        }
      }
      
      toast({ title: 'ფაილები აიტვირთა' });
    } catch (error) {
      console.error('File upload error:', error);
      toast({ title: 'შეცდომა', description: 'ფაილის ატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const removeAttachment = async (attachment: Attachment) => {
    try {
      // Delete from storage
      await supabase.storage.from('public-assets').remove([attachment.storage_path]);
      
      // Delete from DB if it exists
      if (!attachment.id.startsWith('temp-')) {
        await supabase.from('announcement_attachments').delete().eq('id', attachment.id);
      }
      
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
  };

  const handleSave = async (publishNow = false) => {
    if (!title.trim()) {
      toast({ title: 'შეცდომა', description: 'სათაური აუცილებელია', variant: 'destructive' });
      return;
    }
    
    if (!contentHtml.trim()) {
      toast({ title: 'შეცდომა', description: 'შინაარსი აუცილებელია', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    
    try {
      const finalStatus: AnnouncementStatus = publishNow ? 'published' : status;
      
      const announcementData = {
        title: title.trim(),
        content_html: contentHtml,
        status: finalStatus,
        priority,
        audience: 'all_users' as const,
        publish_start: publishStart ? new Date(publishStart).toISOString() : null,
        publish_end: publishEnd ? new Date(publishEnd).toISOString() : null,
        publish_as_system: publishAsSystem,
      };
      
      if (editingAnnouncement) {
        // Update existing
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id);
        
        if (error) throw error;
        
        await logAdminAction({
          actionType: 'edit',
          actionCategory: 'content',
          targetContentId: editingAnnouncement.id,
          targetContentType: 'announcement',
          description: `განცხადება განახლდა: ${title}`,
          metadata: { status: finalStatus }
        });
        
        toast({ title: 'განცხადება განახლდა' });
      } else {
        // Create new
        const { data: newAnnouncement, error } = await supabase
          .from('announcements')
          .insert({
            ...announcementData,
            created_by: user!.id
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Save temporary attachments
        for (const att of attachments.filter(a => a.id.startsWith('temp-'))) {
          await supabase.from('announcement_attachments').insert({
            announcement_id: newAnnouncement.id,
            file_name: att.file_name,
            file_type: att.file_type,
            file_size: att.file_size,
            storage_path: att.storage_path,
            public_url: att.public_url
          });
        }
        
        await logAdminAction({
          actionType: 'approve',
          actionCategory: 'content',
          targetContentId: newAnnouncement.id,
          targetContentType: 'announcement',
          description: `ახალი განცხადება შეიქმნა: ${title}`,
          metadata: { status: finalStatus }
        });
        
        toast({ title: finalStatus === 'published' ? 'განცხადება გამოქვეყნდა' : 'განცხადება შეინახა' });
      }
      
      setShowEditor(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast({ title: 'შეცდომა', description: 'შენახვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', deletingId);
      
      if (error) throw error;
      
      await logAdminAction({
        actionType: 'delete',
        actionCategory: 'content',
        targetContentId: deletingId,
        targetContentType: 'announcement',
        description: 'განცხადება წაიშალა'
      });
      
      toast({ title: 'განცხადება წაიშალა' });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ status: 'archived' as const })
        .in('id', selectedIds);
      
      if (error) throw error;
      
      toast({ title: `${selectedIds.length} განცხადება დაარქივდა` });
      setSelectedIds([]);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error archiving:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .in('id', selectedIds);
      
      if (error) throw error;
      
      toast({ title: `${selectedIds.length} განცხადება წაიშალა` });
      setSelectedIds([]);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (announcementStatus: AnnouncementStatus) => {
    switch (announcementStatus) {
      case 'draft':
        return <Badge variant="secondary">დრაფტი</Badge>;
      case 'published':
        return <Badge className="bg-primary text-primary-foreground">გამოქვეყნებული</Badge>;
      case 'archived':
        return <Badge variant="outline">დაარქივებული</Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            განცხადებები
          </h2>
          <p className="text-sm text-muted-foreground">
            მართეთ საიტის განცხადებები
          </p>
        </div>
        
        <Button onClick={() => openEditor()} className="gap-2">
          <Plus className="h-4 w-4" />
          ახალი განცხადება
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ძებნა..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="სტატუსი" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={fetchAnnouncements}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                არჩეულია: {selectedIds.length}
              </span>
              <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                <Archive className="h-4 w-4 mr-1" />
                დაარქივება
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                წაშლა
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              განცხადებები არ მოიძებნა
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y">
                {filteredAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.includes(announcement.id)}
                      onCheckedChange={() => toggleSelect(announcement.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{announcement.title}</span>
                        {getStatusBadge(announcement.status)}
                        {announcement.priority > 0 && (
                          <Badge variant="outline" className="text-xs">
                            P{announcement.priority}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {announcement.publish_as_system ? (
                          <span className="font-medium">SYSTEM</span>
                        ) : (
                          <span>{announcement.creator_username}</span>
                        )}
                        <span>•</span>
                        <span>{format(new Date(announcement.created_at), 'dd MMM yyyy HH:mm', { locale: ka })}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditor(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(announcement.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'რედაქტირება' : 'ახალი განცხადება'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>სათაური *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="განცხადების სათაური"
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/120</p>
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <Label>შინაარსი * (HTML)</Label>
              <Textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="<p>განცხადების ტექსტი...</p>"
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                მხარდაჭერილია: &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;h1&gt;-&lt;h3&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;a&gt;, &lt;blockquote&gt;
              </p>
            </div>
            
            {/* Priority & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>პრიორიტეტი</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                />
              </div>
              
              <div className="space-y-2">
                <Label>დასაწყისი</Label>
                <Input
                  type="datetime-local"
                  value={publishStart}
                  onChange={(e) => setPublishStart(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>დასასრული</Label>
                <Input
                  type="datetime-local"
                  value={publishEnd}
                  onChange={(e) => setPublishEnd(e.target.value)}
                />
              </div>
            </div>
            
            {/* Publish as SYSTEM option */}
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="publish-as-system"
                checked={publishAsSystem}
                onCheckedChange={(checked) => setPublishAsSystem(checked === true)}
              />
              <Label htmlFor="publish-as-system" className="cursor-pointer">
                გამოქვეყნება როგორც <span className="font-bold">SYSTEM</span>
              </Label>
              <span className="text-xs text-muted-foreground ml-auto">
                (თქვენი სახელი არ გამოჩნდება)
              </span>
            </div>
            
            {/* Attachments */}
            <div className="space-y-2">
              <Label>მიმაგრებული ფაილები</Label>
              
              <div className="border rounded-lg p-3 space-y-2">
                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-sm truncate">{att.file_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(att.file_size)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeAttachment(att)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    ფაილები არ არის მიმაგრებული
                  </p>
                )}
                
                <div className="pt-2 border-t">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip,.mp4"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      disabled={uploadingFile}
                      asChild
                    >
                      <span>
                        {uploadingFile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        ფაილის ატვირთვა
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    მაქს. 25MB • jpg, png, pdf, doc, xls, zip, mp4
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              გაუქმება
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              დრაფტად შენახვა
            </Button>
            <Button 
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              გამოქვეყნება
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>წაშლის დადასტურება</DialogTitle>
          </DialogHeader>
          <p>ნამდვილად გსურთ ამ განცხადების წაშლა?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              გაუქმება
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              წაშლა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsAdmin;
