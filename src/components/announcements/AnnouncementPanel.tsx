import { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Megaphone,
  ChevronRight,
  ChevronLeft,
  X,
  Minus,
  Download,
  FileText,
  Loader2,
  ExternalLink,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

// Lazy load comments component
const AnnouncementComments = lazy(() => import('./AnnouncementComments'));

interface Announcement {
  id: string;
  title: string;
  content_html: string;
  priority: number;
  publish_start: string | null;
  publish_end: string | null;
  created_at: string;
  is_read: boolean;
  is_dismissed: boolean;
  publish_as_system: boolean;
  creator_username: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  public_url: string;
}

// Configure DOMPurify for safe HTML
const purifyConfig = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  ALLOW_DATA_ATTR: false,
};

const AnnouncementPanel = memo(() => {
  const { user, isAuthenticated } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Use the RPC function to get active announcements with user state
      const { data, error } = await supabase.rpc('get_active_announcements');
      
      if (error) throw error;
      
      // Add missing fields with defaults
      const announcementsWithDefaults = (data || []).map((a: Record<string, unknown>) => ({
        ...a,
        publish_as_system: (a.publish_as_system as boolean) ?? false,
        creator_username: (a.creator_username as string) ?? null
      })) as Announcement[];
      
      setAnnouncements(announcementsWithDefaults);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnnouncements();
    }
  }, [isAuthenticated, fetchAnnouncements]);

  // Subscribe to announcement changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchAnnouncements]);

  const currentAnnouncement = announcements[currentIndex];

  const fetchAttachments = async (announcementId: string) => {
    setLoadingAttachments(true);
    try {
      const { data } = await supabase
        .from('announcement_attachments')
        .select('id, file_name, file_type, file_size, public_url')
        .eq('announcement_id', announcementId);
      
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const markAsRead = async (announcement: Announcement) => {
    if (announcement.is_read) return;
    
    try {
      await supabase.rpc('mark_announcement_read', { 
        p_announcement_id: announcement.id 
      });
      
      // Update local state
      setAnnouncements(prev => 
        prev.map(a => a.id === announcement.id ? { ...a, is_read: true } : a)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const dismissAnnouncement = async (announcement: Announcement) => {
    try {
      await supabase.rpc('dismiss_announcement', { 
        p_announcement_id: announcement.id 
      });
      
      // Remove from local state
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
      setShowFullModal(false);
      setIsExpanded(false);
      
      // Reset index if needed
      if (currentIndex >= announcements.length - 1) {
        setCurrentIndex(Math.max(0, announcements.length - 2));
      }
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  };

  const openFullModal = async () => {
    if (!currentAnnouncement) return;
    
    setShowFullModal(true);
    await markAsRead(currentAnnouncement);
    await fetchAttachments(currentAnnouncement.id);
  };

  const goToNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('zip')) return '📦';
    return '📎';
  };

  // Don't render if no announcements or not authenticated
  if (!isAuthenticated || loading || announcements.length === 0) {
    return null;
  }

  return (
    <>
      {/* Collapsed Panel */}
      <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
        <div className="max-w-3xl mx-auto px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Icon */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            
            {/* Title - Clickable to open */}
            <button
              onClick={openFullModal}
              className="flex-1 text-left min-w-0"
            >
              <p className="text-sm font-medium truncate">
                {currentAnnouncement?.title}
              </p>
              <p className="text-xs text-muted-foreground">
                შეეხეთ წასაკითხად
              </p>
            </button>
            
            {/* Navigation arrows if multiple */}
            {announcements.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[2rem] text-center">
                  {currentIndex + 1}/{announcements.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToNext}
                  disabled={currentIndex === announcements.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Actions - Only show if read */}
            {currentAnnouncement?.is_read && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => dismissAnnouncement(currentAnnouncement)}
                  title="გათიშვა"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Modal (Bottom Sheet on Mobile) */}
      <Sheet open={showFullModal} onOpenChange={setShowFullModal}>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] sm:h-[80vh] rounded-t-2xl"
        >
          <SheetHeader className="flex-row items-center justify-between pb-3 border-b">
            <SheetTitle className="text-left truncate pr-2">
              {currentAnnouncement?.title}
            </SheetTitle>
            
            <div className="flex items-center gap-1 shrink-0">
              {currentAnnouncement?.is_read && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFullModal(false)}
                    title="ჩაკეცვა"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => currentAnnouncement && dismissAnnouncement(currentAnnouncement)}
                    title="გათიშვა"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100%-80px)] mt-4">
            {/* Publisher info */}
            {currentAnnouncement && (
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                {currentAnnouncement.publish_as_system ? (
                  <>
                    <Bot className="h-3.5 w-3.5" />
                    <span>SYSTEM</span>
                  </>
                ) : currentAnnouncement.creator_username ? (
                  <span>გამოქვეყნებულია: {currentAnnouncement.creator_username}</span>
                ) : null}
              </div>
            )}
            
            {/* Content */}
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(currentAnnouncement?.content_html || '', purifyConfig) 
              }}
            />
            
            {/* Attachments */}
            {(attachments.length > 0 || loadingAttachments) && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  მიმაგრებული ფაილები
                </h4>
                
                {loadingAttachments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <span className="text-xl">{getFileIcon(att.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(att.file_size)}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Comments Section */}
            {currentAnnouncement && (
              <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
                <AnnouncementComments announcementId={currentAnnouncement.id} />
              </Suspense>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
});

AnnouncementPanel.displayName = 'AnnouncementPanel';

export default AnnouncementPanel;
