import { useState } from 'react';
import { Flag, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

export type ContentType = 
  | 'private_message' 
  | 'group_message' 
  | 'messenger_message'
  | 'post' 
  | 'photo' 
  | 'video' 
  | 'story' 
  | 'comment' 
  | 'reel' 
  | 'profile' 
  | 'live_comment';

export type ReasonType = 'spam' | 'harassment' | 'inappropriate' | 'fraud' | 'violence' | 'other';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
  reportedUserId: string;
  contentPreview?: string;
}

const REASON_OPTIONS: { value: ReasonType; label: string }[] = [
  { value: 'spam', label: 'სპამი' },
  { value: 'harassment', label: 'შეურაცხყოფა' },
  { value: 'inappropriate', label: 'შეუფერებელი კონტენტი' },
  { value: 'fraud', label: 'თაღლითობა' },
  { value: 'violence', label: 'ძალადობა' },
  { value: 'other', label: 'სხვა' },
];

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  private_message: 'პირადი შეტყობინება',
  group_message: 'ჯგუფური შეტყობინება',
  messenger_message: 'მესენჯერის შეტყობინება',
  post: 'პოსტი',
  photo: 'ფოტო',
  video: 'ვიდეო',
  story: 'სთორი',
  comment: 'კომენტარი',
  reel: 'რილსი',
  profile: 'პროფილი',
  live_comment: 'ლაივის კომენტარი',
};

export function ReportModal({
  open,
  onOpenChange,
  contentType,
  contentId,
  reportedUserId,
  contentPreview,
}: ReportModalProps) {
  const [reasonType, setReasonType] = useState<ReasonType | ''>('');
  const [reasonText, setReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ გაიაროთ ავტორიზაცია',
        variant: 'destructive',
      });
      return;
    }

    if (reasonText.length < 5) {
      toast({
        title: 'შეცდომა',
        description: 'მიზეზი უნდა შეიცავდეს მინიმუმ 5 სიმბოლოს',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create report
      const { error: reportError } = await supabase.from('reports').insert({
        reporter_user_id: user.id,
        reported_user_id: reportedUserId,
        content_type: contentType,
        content_id: contentId,
        reason_type: reasonType || null,
        reason_text: reasonText,
        content_preview: contentPreview?.substring(0, 200),
      });

      if (reportError) {
        if (reportError.code === '23505') {
          toast({
            title: 'შეცდომა',
            description: 'თქვენ უკვე გაასაჩივრეთ ეს კონტენტი',
            variant: 'destructive',
          });
          return;
        }
        throw reportError;
      }

      // Get reporter profile for notification
      const { data: reporterProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      // Get reported user profile
      const { data: reportedProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', reportedUserId)
        .single();

      // Get all admin/moderator users
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin', 'moderator']);

      if (adminUsers && adminUsers.length > 0) {
        const reasonLabel = reasonType 
          ? REASON_OPTIONS.find(r => r.value === reasonType)?.label 
          : 'სხვა';
        
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          from_user_id: user.id,
          type: 'report',
          message: `${reporterProfile?.username || 'მომხმარებელმა'} გაასაჩივრა ${reportedProfile?.username || 'მომხმარებლის'} ${CONTENT_TYPE_LABELS[contentType]} — მიზეზი: ${reasonLabel}`,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast({
        title: 'წარმატება',
        description: 'თქვენი საჩივარი მიღებულია',
      });

      setReasonType('');
      setReasonText('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: 'შეცდომა',
        description: 'საჩივრის გაგზავნა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label>მიზეზის ტიპი</Label>
        <Select value={reasonType} onValueChange={(v) => setReasonType(v as ReasonType)}>
          <SelectTrigger>
            <SelectValue placeholder="აირჩიეთ მიზეზი (არასავალდებულო)" />
          </SelectTrigger>
          <SelectContent>
            {REASON_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>მიზეზი *</Label>
        <Textarea
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          placeholder="აღწერეთ რატომ ასაჩივრებთ ამ კონტენტს (მინ. 5 სიმბოლო)"
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {reasonText.length}/5 მინიმუმ
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || reasonText.length < 5}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            იგზავნება...
          </>
        ) : (
          <>
            <Flag className="mr-2 h-4 w-4" />
            გასაჩივრება
          </>
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              კონტენტის გასაჩივრება
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            კონტენტის გასაჩივრება
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
