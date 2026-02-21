import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, Heart, MessageCircle, X, Plus, ImagePlus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';
import { createPendingApproval } from '@/hooks/useModerationQueue';
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

interface PhotosViewProps {
  onBack: () => void;
}

interface Photo {
  id: string;
  image_url: string;
  content: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

const PhotosView = ({ onBack }: PhotosViewProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { upload: s3Upload } = useS3Upload({ folder: S3_FOLDERS.PHOTOS });

  const fetchPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, image_url, content, created_at')
        .eq('user_id', user.id)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get counts for each post in parallel
      const photosWithCounts = await Promise.all(
        (data || []).map(async (post) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
          ]);

          return {
            ...post,
            image_url: post.image_url!,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          };
        })
      );

      setPhotos(photosWithCounts);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [user]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'მხოლოდ სურათები დაშვებულია', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'ფაილი ძალიან დიდია (მაქს. 10MB)', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      // Use S3 upload
      const result = await s3Upload(file, S3_FOLDERS.PHOTOS);
      
      if (!result) throw new Error('Upload failed');

      // Create post with the image - goes to moderation
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image_url: result.url,
          content: '',
          is_approved: false, // Pending moderation
        })
        .select()
        .single();

      if (postError) throw postError;

      // Create pending approval for moderation
      if (postData) {
        await createPendingApproval({
          type: 'post_image',
          userId: user.id,
          contentId: postData.id,
          contentData: {
            content: '',
            image_url: result.url,
          },
        });
      }

      toast({ title: 'ფოტო გაიგზავნა მოდერაციაზე' });
      fetchPhotos();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'ატვირთვის შეცდომა', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete || !user) return;

    try {
      // Delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', photoToDelete.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Also delete the related activity from user_activities (by image_url match)
      await supabase
        .from('user_activities')
        .delete()
        .eq('user_id', user.id)
        .eq('activity_type', 'album_photo')
        .eq('image_url', photoToDelete.image_url);

      toast({ title: 'ფოტო წაიშალა' });
      setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'წაშლის შეცდომა', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setPhotoToDelete(null);
    }
  };

  const openDeleteDialog = (photo: Photo) => {
    setPhotoToDelete(photo);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div className="flex-none z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">ჩემი ფოტოები</h1>
            <span className="text-sm text-muted-foreground">{photos.length} ფოტო</span>
          </div>
          <Button
            size="sm"
            onClick={handleUploadClick}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">დამატება</span>
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <ImagePlus className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-1">ფოტოები არ გაქვს</p>
            <p className="text-sm text-muted-foreground mb-4">დაამატე პირველი ფოტო შენს ალბომში</p>
            <Button onClick={handleUploadClick} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              ფოტოს დამატება
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="relative aspect-square group overflow-hidden rounded-sm"
              >
                <img 
                  src={photo.image_url} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <span className="flex items-center gap-1 text-white text-sm">
                    <Heart className="w-4 h-4 fill-white" /> {photo.likes_count}
                  </span>
                  <span className="flex items-center gap-1 text-white text-sm">
                    <MessageCircle className="w-4 h-4 fill-white" /> {photo.comments_count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full z-10 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => openDeleteDialog(selectedPhoto)}
            className="absolute top-4 left-4 p-2 bg-red-500/70 hover:bg-red-500 rounded-full z-10 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
          <img 
            src={selectedPhoto.image_url} 
            alt="" 
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-6 text-white">
            <span className="flex items-center gap-2">
              <Heart className="w-6 h-6" /> {selectedPhoto.likes_count}
            </span>
            <span className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" /> {selectedPhoto.comments_count}
            </span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ფოტოს წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხარ რომ გსურს ამ ფოტოს წაშლა? ეს მოქმედება ვერ გაუქმდება.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhoto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PhotosView;
