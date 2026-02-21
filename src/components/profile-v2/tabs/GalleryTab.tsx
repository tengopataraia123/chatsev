import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Image as ImageIcon, Lock, Users as UsersIcon, Globe, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useS3Upload } from '@/hooks/useS3Upload';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface GalleryPhoto {
  id: string;
  image_url: string;
  privacy: string;
  caption: string | null;
  created_at: string;
}

interface GalleryTabProps {
  userId: string;
  isOwnProfile?: boolean;
}

const GalleryTab = ({ userId, isOwnProfile = true }: GalleryTabProps) => {
  const { isSuperAdmin } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const { toast } = useToast();
  const { upload: s3Upload } = useS3Upload();
  
  const canManage = isOwnProfile || isSuperAdmin;

  useEffect(() => {
    fetchPhotos();
  }, [userId]);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('user_gallery')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'ფაილი ძალიან დიდია (მაქს. 10MB)', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const result = await s3Upload(file, 'gallery');
      if (!result) throw new Error('Upload failed');

      const { error } = await supabase
        .from('user_gallery')
        .insert({
          user_id: userId,
          image_url: result.url,
          privacy: 'public',
        });

      if (error) throw error;

      toast({ title: 'ფოტო დაემატა!' });
      fetchPhotos();
    } catch (error) {
      console.error('Error uploading:', error);
      toast({ title: 'ატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      const { error } = await supabase
        .from('user_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== id));
      setActiveOverlay(null);
      toast({ title: 'ფოტო წაიშალა' });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'წაშლა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrivacyChange = async (id: string, privacy: string) => {
    try {
      const { error } = await supabase
        .from('user_gallery')
        .update({ privacy })
        .eq('id', id);

      if (error) throw error;

      setPhotos(prev => prev.map(p => p.id === id ? { ...p, privacy } : p));
    } catch (error) {
      console.error('Error updating privacy:', error);
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'private': return <Lock className="w-3 h-3" />;
      case 'friends': return <UsersIcon className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const toggleOverlay = (photoId: string) => {
    setActiveOverlay(prev => prev === photoId ? null : photoId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">ფოტო გალერეა ({photos.length})</h3>
          {!isOwnProfile && isSuperAdmin && (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">
              <Shield className="w-3 h-3" />
            </span>
          )}
        </div>
        {canManage && (
          <label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleUpload} 
              className="hidden" 
              disabled={uploading}
            />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                ფოტოს დამატება
              </span>
            </Button>
          </label>
        )}
      </div>

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>გალერეა ცარიელია</p>
          <p className="text-sm mt-1">დაამატეთ თქვენი ფოტოები</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="relative aspect-square rounded-lg overflow-hidden bg-muted"
              onClick={() => canManage && toggleOverlay(photo.id)}
            >
              <img 
                src={photo.image_url} 
                alt="" 
                className="w-full h-full object-cover"
              />
              
              {/* Overlay with actions - shows on hover (desktop) or tap (mobile) */}
              {canManage && (
                <div 
                  className={`absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center gap-2 ${
                    activeOverlay === photo.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={photo.privacy}
                    onValueChange={(value) => handlePrivacyChange(photo.id, value)}
                  >
                    <SelectTrigger className="w-32 h-8 bg-white/20 border-white/30 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="public">
                        <span className="flex items-center gap-2">
                          <Globe className="w-3 h-3" /> ყველას
                        </span>
                      </SelectItem>
                      <SelectItem value="friends">
                        <span className="flex items-center gap-2">
                          <UsersIcon className="w-3 h-3" /> მეგობრებს
                        </span>
                      </SelectItem>
                      <SelectItem value="private">
                        <span className="flex items-center gap-2">
                          <Lock className="w-3 h-3" /> მხოლოდ მე
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(photo.id);
                    }}
                    disabled={deletingId === photo.id}
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        წაშლა
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Privacy indicator */}
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white">
                {getPrivacyIcon(photo.privacy)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>ფოტოს წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ ამ ფოტოს წაშლა? ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GalleryTab;
