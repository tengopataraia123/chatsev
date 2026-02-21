import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Download, ZoomIn, ZoomOut, RotateCw, MoreVertical,
  UserCircle, Image, Trash2, Ban, Link2, Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';

// Check if URL is a video
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.wmv', '.ogv'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
};

interface ProfilePhotoViewerProps {
  imageUrl: string;
  photoType: 'avatar' | 'cover';
  userId: string;
  username?: string;
  isOwnProfile: boolean;
  isSuperAdmin: boolean;
  onClose: () => void;
  onPhotoDeleted?: () => void;
}

const ProfilePhotoViewer = ({
  imageUrl,
  photoType,
  userId,
  username,
  isOwnProfile,
  isSuperAdmin,
  onClose,
  onPhotoDeleted
}: ProfilePhotoViewerProps) => {
  const isVideo = isVideoUrl(imageUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Video-specific state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; distance: number } | null>(null);
  const initialScaleRef = useRef(1);
  
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const canDelete = isOwnProfile || isSuperAdmin;

  // Video controls
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = prev / 1.5;
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
        return 1;
      }
      return newScale;
    });
  };

  // Touch handlers for pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance
      };
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleChange = distance / touchStartRef.current.distance;
      const newScale = Math.max(1, Math.min(initialScaleRef.current * scaleChange, 5));
      setScale(newScale);
      
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
    initialScaleRef.current = scale;
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = isVideo ? 'mp4' : 'jpg';
      a.download = `${photoType}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: isVideo ? 'ვიდეო ჩამოტვირთულია' : 'ფოტო ჩამოტვირთულია' });
    } catch (error) {
      toast({ title: 'შეცდომა ჩამოტვირთვისას', variant: 'destructive' });
    }
  };

  const handleSetAsProfilePic = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast({ title: 'პროფილის ფოტო განახლდა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleSetAsCover = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: imageUrl })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast({ title: 'ქოვერის ფოტო განახლდა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(imageUrl);
    toast({ title: 'ბმული დაკოპირდა' });
  };

  const handleDeletePhoto = async () => {
    setDeleting(true);
    try {
      const updateField = photoType === 'avatar' ? { avatar_url: null } : { cover_url: null };
      const { error } = await supabase
        .from('profiles')
        .update(updateField)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      toast({ title: 'ფოტო წაიშალა' });
      setShowDeleteDialog(false);
      onPhotoDeleted?.();
      onClose();
    } catch (error) {
      toast({ title: 'შეცდომა წაშლისას', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleBanUser = async () => {
    if (!isAdmin || !user) return;
    try {
      const { error } = await supabase.from('site_bans').insert({
        user_id: userId,
        banned_by: user.id,
        block_type: 'USER',
        reason: 'ადმინის მიერ დაბლოკილი ფოტოს გამო',
        status: 'ACTIVE'
      });
      
      if (error) throw error;
      toast({ title: 'მომხმარებელი დაბლოკილია' });
    } catch (error) {
      toast({ title: 'შეცდომა დაბლოკვისას', variant: 'destructive' });
    }
  };

  const modalContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={handleBackdropClick}
    >
      {/* Top controls */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="text-white/70 text-sm">
          {photoType === 'avatar' ? (isVideo ? 'პროფილის ვიდეო' : 'პროფილის ფოტო') : (isVideo ? 'ქოვერის ვიდეო' : 'ქოვერის ფოტო')}
          {username && ` - ${username}`}
        </div>
        <div className="flex items-center gap-2">
          {/* Video controls */}
          {isVideo && (
            <>
              <button
                onClick={togglePlay}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </>
          )}
          
          {/* Image zoom controls - only for images */}
          {!isVideo && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={resetZoom}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </>
          )}
          
          {/* Three dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[110]">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="w-4 h-4 mr-3" />
                ჩამოტვირთვა
              </DropdownMenuItem>
              
              {user && (
                <>
                  <DropdownMenuItem onClick={handleSetAsProfilePic}>
                    <UserCircle className="w-4 h-4 mr-3" />
                    პროფილის ფოტოდ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSetAsCover}>
                    <Image className="w-4 h-4 mr-3" />
                    ქოვერად დაყენება
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link2 className="w-4 h-4 mr-3" />
                ბმულის კოპირება
              </DropdownMenuItem>
              
              {/* Admin ban */}
              {isAdmin && !isOwnProfile && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleBanUser}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="w-4 h-4 mr-3" />
                    მომხმარებლის დაბლოკვა
                  </DropdownMenuItem>
                </>
              )}
              
              {/* Delete */}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    წაშლა
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Media viewer - Video or Image */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center overflow-hidden touch-none",
          !isVideo && isDragging && "cursor-grabbing",
          !isVideo && scale > 1 && !isDragging && "cursor-grab"
        )}
        onTouchStart={!isVideo ? handleTouchStart : undefined}
        onTouchMove={!isVideo ? handleTouchMove : undefined}
        onTouchEnd={!isVideo ? handleTouchEnd : undefined}
        onMouseDown={!isVideo ? handleMouseDown : undefined}
        onMouseMove={!isVideo ? handleMouseMove : undefined}
        onMouseUp={!isVideo ? handleMouseUp : undefined}
        onMouseLeave={!isVideo ? handleMouseUp : undefined}
        onDoubleClick={!isVideo ? handleDoubleClick : undefined}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        
        {isVideo ? (
          <video
            ref={videoRef}
            src={imageUrl}
            className={cn(
              "max-w-[90vw] max-h-[85vh] object-contain select-none transition-opacity",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onLoadedData={() => setIsLoading(false)}
            onClick={togglePlay}
          />
        ) : (
          <img
            src={imageUrl}
            alt=""
            className={cn(
              "max-w-[90vw] max-h-[85vh] object-contain select-none transition-opacity",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            onLoad={() => setIsLoading(false)}
            draggable={false}
          />
        )}
      </div>

      {/* Scale indicator - only for images */}
      {!isVideo && scale > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="px-4 py-2 bg-black/50 rounded-full text-white/60 text-sm">
            {Math.round(scale * 100)}%
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[120]">
          <AlertDialogHeader>
            <AlertDialogTitle>{isVideo ? 'ვიდეოს წაშლა' : 'ფოტოს წაშლა'}</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ {photoType === 'avatar' ? 'პროფილის' : 'ქოვერის'} {isVideo ? 'ვიდეოს' : 'ფოტოს'} წაშლა?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePhoto}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProfilePhotoViewer;
