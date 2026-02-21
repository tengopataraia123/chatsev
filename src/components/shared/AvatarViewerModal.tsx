import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Trash2, MoreVertical, Image, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import StyledUsername from '@/components/username/StyledUsername';

interface AvatarViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  userId: string;
  username: string;
  isVideo?: boolean;
  onDelete?: () => void;
}

const AvatarViewerModal = ({
  isOpen,
  onClose,
  mediaUrl,
  userId,
  username,
  isVideo = false,
  onDelete,
}: AvatarViewerModalProps) => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const isOwner = user?.id === userId;
  const canDelete = isOwner || isAdmin || isSuperAdmin;

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleDownload = async () => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = isVideo ? 'mp4' : 'jpg';
      link.download = `avatar-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('ჩამოტვირთულია');
    } catch (error) {
      toast.error('შეცდომა ჩამოტვირთვისას');
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);
      
      if (error) throw error;
      toast.success('ავატარი წაიშალა');
      onDelete?.();
      onClose();
    } catch (error) {
      toast.error('შეცდომა წაშლისას');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(mediaUrl);
      toast.success('ბმული დაკოპირდა');
    } catch (error) {
      toast.error('შეცდომა კოპირებისას');
    }
  };

  const handleSetAsCover = async () => {
    if (!user || isVideo) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: mediaUrl })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast.success('ქოვერი განახლდა');
    } catch (error) {
      toast.error('შეცდომა');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Backdrop for closing */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      {/* Header */}
      <div 
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 w-10 h-10 rounded-full"
        >
          <X className="w-6 h-6" />
        </Button>
        
        <div className="flex-1 text-center">
          <StyledUsername 
            username={username} 
            userId={userId}
            className="text-white font-medium"
          />
        </div>
        
        {/* Actions menu */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-white hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-48 z-[200] bg-popover border border-border shadow-lg"
            sideOffset={5}
          >
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="w-4 h-4 mr-3" />
              ჩამოტვირთვა
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleCopyLink}>
              <Share2 className="w-4 h-4 mr-3" />
              ბმულის კოპირება
            </DropdownMenuItem>
            
            {user && !isVideo && (
              <DropdownMenuItem onClick={handleSetAsCover}>
                <Image className="w-4 h-4 mr-3" />
                ქოვერად დაყენება
              </DropdownMenuItem>
            )}
            
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  წაშლა
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media content - full image without cropping */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            loop
            playsInline
            controls
          />
        ) : (
          <img
            src={mediaUrl}
            alt={`${username}-ის ავატარი`}
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Footer info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-center text-white/60 text-sm">
          {isVideo ? 'ვიდეო ავატარი' : 'პროფილის ფოტო'}
        </p>
      </div>
    </div>,
    document.body
  );
};

export default AvatarViewerModal;
