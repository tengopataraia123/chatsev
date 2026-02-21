import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Database } from '@/integrations/supabase/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Send, 
  Radio, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Trash2,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Music,
  Upload,
  X,
  Pin,
  FileText,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { logAdminAction } from '@/hooks/useAdminActionLog';

interface SystemMessage {
  id: string;
  title: string | null;
  body: string;
  attachments: AttachmentMeta[];
  audience_type: string;
  allow_user_delete: boolean;
  pin_until_open: boolean;
  status: string;
  created_by: string;
  created_at: string;
  sent_at: string | null;
}

interface AttachmentMeta {
  url: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  size: number;
}

const AUDIENCE_OPTIONS = [
  { value: 'everyone', label: 'ყველას', icon: '👥' },
  { value: 'active_7d', label: 'აქტიური 7 დღე', icon: '📅' },
  { value: 'active_3d', label: 'აქტიური 3 დღე', icon: '⏰' },
  { value: 'admins', label: 'ადმინისტრატორები', icon: '🛡️' },
  { value: 'girls', label: 'გოგონები', icon: '👩' },
  { value: 'boys', label: 'ბიჭები', icon: '👨' },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav'];

export const SystemMessagesAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceType, setAudienceType] = useState('everyone');
  const [allowUserDelete, setAllowUserDelete] = useState(false);
  const [pinUntilOpen, setPinUntilOpen] = useState(true);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  // Dialogs
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);
  const [showMessageDetails, setShowMessageDetails] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_messages')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMessages(data.map(m => ({
        ...m,
        attachments: (m.attachments as unknown as AttachmentMeta[]) || []
      })));
    }
    setLoading(false);
  };

  const getTargetCount = useCallback(async (): Promise<number> => {
    try {
      let count = 0;
      
      switch (audienceType) {
        case 'everyone': {
          const { count: c } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          count = c || 0;
          break;
        }
        case 'active_7d': {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const { count: c } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_seen', sevenDaysAgo.toISOString());
          count = c || 0;
          break;
        }
        case 'active_3d': {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const { count: c } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_seen', threeDaysAgo.toISOString());
          count = c || 0;
          break;
        }
        case 'admins': {
          const { count: c } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .in('role', ['super_admin', 'admin', 'moderator']);
          count = c || 0;
          break;
        }
        case 'girls': {
          const { count: c } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('gender', 'female');
          count = c || 0;
          break;
        }
        case 'boys': {
          const { count: c } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('gender', 'male');
          count = c || 0;
          break;
        }
      }
      
      return count;
    } catch (error) {
      console.error('Error getting target count:', error);
      return 0;
    }
  }, [audienceType]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingFile(true);
    
    try {
      for (const file of Array.from(files)) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast({ 
            title: 'ფაილი ძალიან დიდია', 
            description: `მაქსიმალური ზომა: 50MB`, 
            variant: 'destructive' 
          });
          continue;
        }
        
        // Determine file type
        let fileType: 'image' | 'video' | 'audio' | null = null;
        if (ALLOWED_IMAGE_TYPES.includes(file.type)) fileType = 'image';
        else if (ALLOWED_VIDEO_TYPES.includes(file.type)) fileType = 'video';
        else if (ALLOWED_AUDIO_TYPES.includes(file.type)) fileType = 'audio';
        
        if (!fileType) {
          toast({ 
            title: 'ფაილის ტიპი არ არის დაშვებული', 
            description: 'დაშვებულია: JPG, PNG, WEBP, MP4, WEBM, MOV, MP3, M4A, WAV', 
            variant: 'destructive' 
          });
          continue;
        }
        
        // Upload to storage
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('system-attachments')
          .upload(fileName, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('system-attachments')
          .getPublicUrl(fileName);
        
        setAttachments(prev => [...prev, {
          url: urlData.publicUrl,
          type: fileType!,
          name: file.name,
          size: file.size
        }]);
      }
      
      toast({ title: 'ფაილი აიტვირთა' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'ატვირთვის შეცდომა', variant: 'destructive' });
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (!body.trim()) {
      toast({ title: 'შეცდომა', description: 'შეტყობინება აუცილებელია', variant: 'destructive' });
      return;
    }
    
    setSending(true);
    
    try {
      if (editingMessageId) {
        // Update existing draft
        const { error } = await supabase
          .from('system_messages')
          .update({
            title: title.trim() || null,
            body: body.trim(),
            attachments: attachments as unknown as Json,
            audience_type: audienceType as Database['public']['Enums']['system_message_audience'],
            allow_user_delete: allowUserDelete,
            pin_until_open: pinUntilOpen,
          })
          .eq('id', editingMessageId)
          .eq('status', 'draft');
        
        if (error) throw error;
        toast({ title: 'დრაფტი განახლდა' });
      } else {
        // Create new draft
        const { error } = await supabase
          .from('system_messages')
          .insert({
            created_by: user?.id!,
            title: title.trim() || null,
            body: body.trim(),
            attachments: attachments as unknown as Json,
            audience_type: audienceType as Database['public']['Enums']['system_message_audience'],
            allow_user_delete: allowUserDelete,
            pin_until_open: pinUntilOpen,
            status: 'draft' as Database['public']['Enums']['system_message_status'],
          });
        
        if (error) throw error;
        toast({ title: 'დრაფტი შეინახა' });
      }
      
      resetForm();
      fetchMessages();
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handlePreSend = async () => {
    if (!body.trim()) {
      toast({ title: 'შეცდომა', description: 'შეტყობინება აუცილებელია', variant: 'destructive' });
      return;
    }
    
    const count = await getTargetCount();
    setRecipientCount(count);
    setShowConfirm(true);
  };

  const handleSendMessage = async () => {
    setSending(true);
    
    try {
      let messageId = editingMessageId;
      
      if (!messageId) {
        // Create message first
        const { data: newMsg, error: createError } = await supabase
          .from('system_messages')
          .insert({
            created_by: user?.id!,
            title: title.trim() || null,
            body: body.trim(),
            attachments: attachments as unknown as Json,
            audience_type: audienceType as Database['public']['Enums']['system_message_audience'],
            allow_user_delete: allowUserDelete,
            pin_until_open: pinUntilOpen,
            status: 'draft' as Database['public']['Enums']['system_message_status'],
          })
          .select()
          .single();
        
        if (createError) throw createError;
        messageId = newMsg.id;
      }
      
      // Use the database function to send
      const { data: sentCount, error: sendError } = await supabase
        .rpc('send_system_message', { p_message_id: messageId });
      
      if (sendError) throw sendError;
      
      toast({ 
        title: 'გაიგზავნა!', 
        description: `შეტყობინება გაეგზავნა ${sentCount} მომხმარებელს` 
      });
      
      resetForm();
      setShowConfirm(false);
      fetchMessages();
      setActiveTab('history');
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ 
        title: 'გაგზავნის შეცდომა', 
        description: error.message || 'სცადეთ თავიდან', 
        variant: 'destructive' 
      });
    } finally {
      setSending(false);
    }
  };

  const handleEditDraft = (message: SystemMessage) => {
    setEditingMessageId(message.id);
    setTitle(message.title || '');
    setBody(message.body);
    setAttachments(message.attachments || []);
    setAudienceType(message.audience_type);
    setAllowUserDelete(message.allow_user_delete);
    setPinUntilOpen(message.pin_until_open);
    setActiveTab('create');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;
    
    const { error } = await supabase
      .from('system_messages')
      .delete()
      .eq('id', messageId);
    
    if (!error) {
      toast({ title: 'წაიშალა' });
      fetchMessages();
      setShowMessageDetails(false);
      
      await logAdminAction({
        actionType: 'delete',
        actionCategory: 'moderation',
        targetContentId: messageId,
        targetContentType: 'system_message',
        description: 'წაშალა სისტემური შეტყობინება'
      });
    }
  };

  const viewMessageDetails = async (message: SystemMessage) => {
    setSelectedMessage(message);
    setShowMessageDetails(true);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setAttachments([]);
    setAudienceType('everyone');
    setAllowUserDelete(false);
    setPinUntilOpen(true);
    setEditingMessageId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">დრაფტი</Badge>;
      case 'sent':
        return <Badge className="bg-green-500">გაგზავნილი</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAudienceLabel = (type: string) => {
    const option = AUDIENCE_OPTIONS.find(o => o.value === type);
    return option ? `${option.icon} ${option.label}` : type;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-200px)] overflow-hidden">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0 pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h2 className="text-base sm:text-xl font-bold">სისტემური შეტყობინებები V2</h2>
        </div>
        <Badge variant="outline" className="self-start sm:ml-auto text-xs">Super Admin Only</Badge>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 flex-shrink-0 h-9 sm:h-10">
          <TabsTrigger value="create" className="text-xs sm:text-sm">
            {editingMessageId ? 'რედაქტირება' : 'ახლის შექმნა'}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">ისტორია ({messages.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="flex-1 overflow-y-auto mt-3 sm:mt-4 pb-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                {editingMessageId ? 'შეტყობინების რედაქტირება' : 'ახალი შეტყობინება'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              {/* Sender info */}
              <div className="p-2 sm:p-3 bg-muted rounded-lg flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-xs">SYSTEM</Badge>
                <span className="text-xs sm:text-sm text-muted-foreground">სისტემური გზავნილი</span>
              </div>
              
              {/* Title */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">სათაური (არასავალდებულო)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="შეტყობინების სათაური..."
                  maxLength={100}
                  className="text-sm h-9 sm:h-10"
                />
              </div>
              
              {/* Message */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">შეტყობინება *</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="შეიყვანეთ შეტყობინება..."
                  maxLength={5000}
                  rows={3}
                  className="text-sm min-h-[80px] sm:min-h-[100px]"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground text-right">
                  {body.length}/5000
                </p>
              </div>
              
              {/* Attachments */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">ფაილები (არასავალდებულო)</Label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {attachments.map((att, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-secondary rounded-lg text-xs sm:text-sm"
                    >
                      {getFileIcon(att.type)}
                      <span className="max-w-[60px] sm:max-w-[100px] truncate">{att.name}</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        ({formatFileSize(att.size)})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploadingFile}
                    className="text-xs sm:text-sm h-8 sm:h-9"
                  >
                    {uploadingFile ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-1" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    )}
                    ფაილის ატვირთვა
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  დაშვებული: JPG, PNG, WEBP, MP4, WEBM, MOV, MP3, M4A, WAV (მაქს. 50MB)
                </p>
              </div>
              
              {/* Target audience - Mobile optimized grid */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-xs sm:text-sm">აუდიტორია</Label>
                <RadioGroup value={audienceType} onValueChange={setAudienceType}>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {AUDIENCE_OPTIONS.map((option) => (
                      <div 
                        key={option.value}
                        className={`flex items-center space-x-1.5 sm:space-x-2 p-1.5 sm:p-2 border rounded-lg transition-colors ${
                          audienceType === option.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border'
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <Label htmlFor={option.value} className="cursor-pointer flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-xs sm:text-sm">{option.icon}</span>
                          <span className="text-[11px] sm:text-sm truncate">{option.label}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
              
              {/* Pin behavior */}
              <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Pin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  პინის ქცევა
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pin-until-open"
                    checked={pinUntilOpen}
                    onCheckedChange={(checked) => setPinUntilOpen(checked as boolean)}
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  />
                  <Label htmlFor="pin-until-open" className="text-[11px] sm:text-sm cursor-pointer">
                    პინირებული სანამ მომხმარებელი არ გახსნის
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="allow-delete"
                    checked={allowUserDelete}
                    onCheckedChange={(checked) => setAllowUserDelete(checked as boolean)}
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  />
                  <Label htmlFor="allow-delete" className="text-[11px] sm:text-sm cursor-pointer">
                    მომხმარებელს შეუძლია წაშლა
                  </Label>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-3 sm:pt-4">
                <Button
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                  onClick={handleSaveDraft}
                  disabled={!body.trim() || sending}
                >
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  დრაფტი
                </Button>
                <Button
                  className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                  onClick={handlePreSend}
                  disabled={!body.trim() || sending}
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  )}
                  გაგზავნა
                </Button>
              </div>
              
              {editingMessageId && (
                <Button
                  variant="ghost"
                  className="w-full text-xs sm:text-sm h-8 sm:h-9"
                  onClick={resetForm}
                >
                  გაუქმება
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 overflow-hidden mt-3 sm:mt-4">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2 sm:pb-3 flex-shrink-0 flex flex-row items-center justify-between px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base">ისტორია</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMessages}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center p-6 sm:p-8">
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center p-6 sm:p-8 text-muted-foreground text-sm">
                    შეტყობინებები არ არის
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2 p-2 sm:p-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-2 sm:p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => viewMessageDetails(msg)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                              {getStatusBadge(msg.status)}
                              {msg.pin_until_open && (
                                <Pin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                              )}
                            </div>
                            {msg.title && (
                              <h4 className="font-medium text-xs sm:text-sm truncate">{msg.title}</h4>
                            )}
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {msg.body}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                              <span>{getAudienceLabel(msg.audience_type)}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(msg.created_at), 'dd MMM yyyy HH:mm', { locale: ka })}
                              </span>
                              {msg.attachments?.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{msg.attachments.length} ფაილი</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {msg.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditDraft(msg);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(msg.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">შეტყობინების გაგზავნა</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <p className="text-sm sm:text-base">
              შეტყობინება გაეგზავნება <strong>{recipientCount}</strong> მომხმარებელს.
            </p>
            <div className="p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-xs sm:text-sm font-medium">{title || '(უსათაურო)'}</p>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{body}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Badge variant="outline" className="text-[10px] sm:text-xs">{getAudienceLabel(audienceType)}</Badge>
              {pinUntilOpen && <Badge variant="outline" className="text-[10px] sm:text-xs">📌 პინირებული</Badge>}
              {allowUserDelete && <Badge variant="outline" className="text-[10px] sm:text-xs">🗑️ წაშლადი</Badge>}
              {attachments.length > 0 && (
                <Badge variant="outline" className="text-[10px] sm:text-xs">📎 {attachments.length} ფაილი</Badge>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10">
              გაუქმება
            </Button>
            <Button onClick={handleSendMessage} disabled={sending} className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10">
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              )}
              გაგზავნა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Message Details Dialog */}
      <Dialog open={showMessageDetails} onOpenChange={setShowMessageDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              {getStatusBadge(selectedMessage?.status || '')}
              <span className="truncate">{selectedMessage?.title || 'სისტემური შეტყობინება'}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-3 sm:space-y-4">
              <div className="p-2 sm:p-3 bg-muted rounded-lg">
                <p className="text-xs sm:text-sm whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>
              
              {selectedMessage.attachments?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">ფაილები</Label>
                  {selectedMessage.attachments.map((att, index) => (
                    <div key={index} className="p-2 border rounded-lg">
                      {att.type === 'image' && (
                        <img 
                          src={att.url} 
                          alt={att.name}
                          className="max-h-32 sm:max-h-40 rounded object-cover"
                        />
                      )}
                      {att.type === 'video' && (
                        <video 
                          src={att.url}
                          controls
                          className="max-h-32 sm:max-h-40 rounded w-full"
                        />
                      )}
                      {att.type === 'audio' && (
                        <audio src={att.url} controls className="w-full h-8" />
                      )}
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {att.name} ({formatFileSize(att.size)})
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">აუდიტორია:</span>
                  <p className="truncate">{getAudienceLabel(selectedMessage.audience_type)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">შექმნილია:</span>
                  <p>{format(new Date(selectedMessage.created_at), 'dd MMM yyyy HH:mm', { locale: ka })}</p>
                </div>
                {selectedMessage.sent_at && (
                  <div>
                    <span className="text-muted-foreground">გაგზავნილია:</span>
                    <p>{format(new Date(selectedMessage.sent_at), 'dd MMM yyyy HH:mm', { locale: ka })}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">პარამეტრები:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedMessage.pin_until_open && <Badge variant="outline" className="text-[10px] sm:text-xs">📌</Badge>}
                    {selectedMessage.allow_user_delete && <Badge variant="outline" className="text-[10px] sm:text-xs">🗑️</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            {selectedMessage?.status === 'draft' && (
              <Button
                variant="outline"
                className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
                onClick={() => {
                  handleEditDraft(selectedMessage);
                  setShowMessageDetails(false);
                }}
              >
                რედაქტირება
              </Button>
            )}
            <Button
              variant="destructive"
              className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
              onClick={() => handleDeleteMessage(selectedMessage?.id || '')}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              წაშლა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemMessagesAdmin;
