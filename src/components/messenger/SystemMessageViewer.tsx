import { useEffect, useState } from 'react';
import { ArrowLeft, Radio, Pin, Trash2, ExternalLink, Image as ImageIcon, Video, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { SystemMessageDelivery } from '@/hooks/useSystemMessages';
import { toast } from 'sonner';

interface SystemMessageViewerProps {
  delivery: SystemMessageDelivery;
  onBack: () => void;
  onMarkAsOpened: (deliveryId: string) => Promise<boolean>;
  onDelete: (deliveryId: string) => Promise<boolean>;
}

const SystemMessageViewer = ({
  delivery,
  onBack,
  onMarkAsOpened,
  onDelete,
}: SystemMessageViewerProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const message = delivery.message;

  // Mark as opened when viewing
  useEffect(() => {
    if (!delivery.opened_at) {
      onMarkAsOpened(delivery.id);
    }
  }, [delivery.id, delivery.opened_at, onMarkAsOpened]);

  const handleDelete = async () => {
    setDeleting(true);
    const success = await onDelete(delivery.id);
    setDeleting(false);
    
    if (success) {
      toast.success('შეტყობინება წაიშალა');
      onBack();
    } else {
      toast.error('წაშლა ვერ მოხერხდა');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card">
        <button 
          onClick={onBack} 
          className="p-1.5 hover:bg-secondary rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Radio className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">სისტემა</span>
            <Badge 
              variant="secondary" 
              className="text-[9px] px-1 py-0 h-4 bg-amber-500/20 text-amber-600"
            >
              SYSTEM
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">სისტემური შეტყობინებები</p>
        </div>
        
        {message.allow_user_delete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Message Card */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
            {/* Title */}
            {message.title && (
              <h2 className="font-semibold text-lg text-amber-600 dark:text-amber-400">
                {message.title}
              </h2>
            )}
            
            {/* Body */}
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.body}
            </p>
            
            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <div className="space-y-3 pt-2">
                {message.attachments.map((att, index) => (
                  <div key={index} className="rounded-lg overflow-hidden bg-background/50">
                    {att.type === 'image' && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={att.url} 
                          alt={att.name}
                          className="max-h-60 w-full object-cover rounded-lg"
                        />
                      </a>
                    )}
                    {att.type === 'video' && (
                      <video 
                        src={att.url}
                        controls
                        className="max-h-60 w-full rounded-lg"
                      />
                    )}
                    {att.type === 'audio' && (
                      <div className="p-3 bg-secondary rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getFileIcon(att.type)}
                          <span className="text-sm truncate">{att.name}</span>
                        </div>
                        <audio src={att.url} controls className="w-full" />
                      </div>
                    )}
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      {att.name} • {formatFileSize(att.size)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Timestamp */}
            <div className="flex items-center justify-between pt-2 border-t border-amber-500/10">
              <span className="text-xs text-muted-foreground">
                {format(
                  new Date(message.sent_at || message.created_at), 
                  'dd MMMM yyyy, HH:mm', 
                  { locale: ka }
                )}
              </span>
              {!delivery.opened_at && (
                <Badge variant="secondary" className="text-xs">ახალი</Badge>
              )}
            </div>
          </div>
          
          {/* Info */}
          <div className="text-center text-xs text-muted-foreground py-2">
            ეს არის სისტემური შეტყობინება
          </div>
        </div>
      </ScrollArea>
      
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>შეტყობინების წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ ამ სისტემური შეტყობინების წაშლა?
              ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'იშლება...' : 'წაშლა'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SystemMessageViewer;
