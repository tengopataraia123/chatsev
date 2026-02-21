import { useState, useEffect, useMemo } from 'react';
import { Image, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import PhotoViewerModal, { PhotoItem } from '@/components/shared/PhotoViewerModal';
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

interface ProfilePhotosProps {
  userId: string;
  onUserClick?: (userId: string) => void;
}

interface Photo {
  id: string;
  image_url: string;
  source: 'post' | 'avatar' | 'cover';
  created_at: string;
}

const ProfilePhotos = ({ userId, onUserClick }: ProfilePhotosProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [deletePhoto, setDeletePhoto] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [profileData, setProfileData] = useState<{ username: string; avatar_url?: string } | null>(null);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const allPhotos: Photo[] = [];

        // Get posts with images
        const { data: posts } = await supabase
          .from('posts')
          .select('id, image_url, created_at')
          .eq('user_id', userId)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false });

        posts?.forEach(p => {
          if (p.image_url) {
            allPhotos.push({
              id: p.id,
              image_url: p.image_url,
              source: 'post',
              created_at: p.created_at
            });
          }
        });

        // Get profile avatar and cover
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, cover_url, created_at')
          .eq('user_id', userId)
          .single();

        if (profile) {
          setProfileData({ username: profile.username, avatar_url: profile.avatar_url || undefined });
        }

        if (profile?.avatar_url) {
          allPhotos.push({
            id: `avatar_${userId}`,
            image_url: profile.avatar_url,
            source: 'avatar',
            created_at: profile.created_at
          });
        }

        if (profile?.cover_url) {
          allPhotos.push({
            id: `cover_${userId}`,
            image_url: profile.cover_url,
            source: 'cover',
            created_at: profile.created_at
          });
        }

        setPhotos(allPhotos);
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [userId]);

  const handleDeletePhoto = async () => {
    if (!deletePhoto) return;
    
    // Allow owner or admin to delete
    const isOwner = user?.id === userId;
    if (!isOwner && !isAdmin) return;

    setDeleting(true);
    try {
      if (deletePhoto.source === 'post') {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', deletePhoto.id);
        
        if (error) throw error;
      } else if (deletePhoto.source === 'avatar') {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else if (deletePhoto.source === 'cover') {
        const { error } = await supabase
          .from('profiles')
          .update({ cover_url: null })
          .eq('user_id', userId);
        
        if (error) throw error;
      }

      setPhotos(prev => prev.filter(p => p.id !== deletePhoto.id));
      toast({ title: 'ფოტო წაიშალა!' });
      setDeletePhoto(null);
      setSelectedPhotoIndex(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({ title: 'შეცდომა წაშლისას', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'post': return 'პოსტი';
      case 'avatar': return 'პროფილის ფოტო';
      case 'cover': return 'ქოვერი';
      default: return '';
    }
  };

  // Convert photos to PhotoItem format for gallery
  const photoItems: PhotoItem[] = useMemo(() => {
    if (!profileData) return [];
    return photos.map(photo => ({
      imageUrl: photo.image_url,
      photoId: photo.id,
      postId: photo.source === 'post' ? photo.id : undefined,
      userId: userId,
      username: profileData.username,
      avatarUrl: profileData.avatar_url,
      createdAt: photo.created_at,
      source: photo.source
    }));
  }, [photos, profileData, userId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-primary/5 border-b border-border">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              ფოტოები
            </h2>
          </div>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            ფოტოები
            <span className="text-sm text-muted-foreground">({photos.length})</span>
          </h2>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Image className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">ფოტოები არ არის</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhotoIndex(index)}
                className="relative aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity group"
              >
                <img 
                  src={photo.image_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white px-2 py-1 bg-black/50 rounded">
                    {getSourceLabel(photo.source)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal with Gallery Navigation */}
      {selectedPhotoIndex !== null && profileData && photoItems.length > 0 && (
        <PhotoViewerModal
          isOpen={selectedPhotoIndex !== null}
          onClose={() => setSelectedPhotoIndex(null)}
          imageUrl={photoItems[selectedPhotoIndex]?.imageUrl || ''}
          photoId={photoItems[selectedPhotoIndex]?.photoId}
          userId={userId}
          username={profileData.username}
          avatarUrl={profileData.avatar_url}
          createdAt={photoItems[selectedPhotoIndex]?.createdAt}
          source={photoItems[selectedPhotoIndex]?.source}
          postId={photoItems[selectedPhotoIndex]?.postId}
          onUserClick={onUserClick}
          onDelete={() => {
            const photoId = photos[selectedPhotoIndex]?.id;
            if (photoId) {
              setPhotos(prev => prev.filter(p => p.id !== photoId));
            }
            setSelectedPhotoIndex(null);
          }}
          showActions={true}
          photos={photoItems}
          initialIndex={selectedPhotoIndex}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePhoto} onOpenChange={() => setDeletePhoto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ფოტოს წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ ამ ფოტოს წაშლა?
              {deletePhoto?.source === 'post' && ' ეს წაშლის მთლიან პოსტს.'}
              {deletePhoto?.source === 'avatar' && ' ეს წაშლის პროფილის ფოტოს.'}
              {deletePhoto?.source === 'cover' && ' ეს წაშლის ქოვერის ფოტოს.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePhoto}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePhotos;
