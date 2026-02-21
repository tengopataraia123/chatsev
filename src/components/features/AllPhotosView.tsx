import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, Loader2, Heart, Eye, X, Trash2, User, Filter, Image, TrendingUp,
  MoreVertical, Download, UserCircle, Ban, Link2, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PhotoZoomContainer from '@/components/shared/PhotoZoomContainer';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportButton } from '@/components/reports/ReportButton';

interface AllPhotosViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}


interface Photo {
  id: string;
  image_url: string;
  content: string | null;
  created_at: string;
  likes_count: number;
  views_count: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  source: 'post' | 'avatar' | 'cover';
}

type SortOption = 'rating' | 'newest' | 'oldest' | 'most_liked' | 'most_viewed';

const AllPhotosView = ({ onBack, onUserClick }: AllPhotosViewProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [deletePhoto, setDeletePhoto] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch privacy settings to filter private profiles
      const { data: privacySettings } = await supabase
        .from('privacy_settings')
        .select('user_id, profile_visibility');
      
      const privateUserIds = new Set(
        privacySettings
          ?.filter(ps => ps.profile_visibility === 'private' || ps.profile_visibility === 'friends_only')
          .map(ps => ps.user_id) || []
      );

      // Fetch post images
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, content, created_at, user_id')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get all user IDs from posts
      const postUserIds = [...new Set(posts?.map(p => p.user_id) || [])];
      
      // Fetch profiles for post users
      let profilesMap = new Map<string, { username: string; avatar_url: string | null }>();
      if (postUserIds.length > 0) {
        const { data: postProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', postUserIds);
        
        postProfiles?.forEach(p => {
          profilesMap.set(p.user_id, { username: p.username, avatar_url: p.avatar_url });
        });
      }

      // Get like counts for posts
      const postIds = posts?.map(p => p.id) || [];
      let likesMap = new Map<string, number>();
      
      if (postIds.length > 0) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id');
        
        likes?.forEach(l => {
          likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1);
        });
      }

      // Fetch all photo views
      const { data: photoViews } = await supabase
        .from('photo_views')
        .select('photo_id, photo_type');

      const viewsMap = new Map<string, number>();
      photoViews?.forEach(v => {
        const key = `${v.photo_type}_${v.photo_id}`;
        viewsMap.set(key, (viewsMap.get(key) || 0) + 1);
      });

      // Fetch profile photos (avatars and covers)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, cover_url, created_at')
        .or('avatar_url.neq.null,cover_url.neq.null');

      if (profilesError) throw profilesError;

      // Fetch story images
      const { data: stories } = await supabase
        .from('stories')
        .select('id, image_url, content, created_at, user_id')
        .eq('status', 'approved')
        .not('image_url', 'is', null);

      // Get story user profiles
      const storyUserIds = [...new Set(stories?.map(s => s.user_id) || [])];
      if (storyUserIds.length > 0) {
        const { data: storyProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', storyUserIds);
        
        storyProfiles?.forEach(p => {
          if (!profilesMap.has(p.user_id)) {
            profilesMap.set(p.user_id, { username: p.username, avatar_url: p.avatar_url });
          }
        });
      }

      // Combine all photos
      const allPhotos: Photo[] = [];

      // Helper to check if user's photos should be shown
      const shouldShowUserPhotos = (userId: string) => {
        // Always show current user's photos
        if (userId === user?.id) return true;
        // Hide private profile users' photos
        return !privateUserIds.has(userId);
      };

      // Add post photos (filter private profiles)
      posts?.forEach(post => {
        if (post.image_url && shouldShowUserPhotos(post.user_id)) {
          const viewKey = `post_${post.id}`;
          const profile = profilesMap.get(post.user_id);
          allPhotos.push({
            id: post.id,
            image_url: post.image_url,
            content: post.content,
            created_at: post.created_at,
            likes_count: likesMap.get(post.id) || 0,
            views_count: viewsMap.get(viewKey) || 0,
            user_id: post.user_id,
            username: profile?.username || 'მომხმარებელი',
            avatar_url: profile?.avatar_url || null,
            source: 'post'
          });
        }
      });

      // Add story photos as posts (filter private profiles)
      stories?.forEach(story => {
        if (story.image_url && shouldShowUserPhotos(story.user_id)) {
          const viewKey = `post_${story.id}`;
          const profile = profilesMap.get(story.user_id);
          allPhotos.push({
            id: `story_${story.id}`,
            image_url: story.image_url,
            content: story.content || 'სტორის ფოტო',
            created_at: story.created_at,
            likes_count: 0,
            views_count: viewsMap.get(viewKey) || 0,
            user_id: story.user_id,
            username: profile?.username || 'მომხმარებელი',
            avatar_url: profile?.avatar_url || null,
            source: 'post'
          });
        }
      });

      // Add avatar and cover photos (filter private profiles)
      profiles?.forEach(profile => {
        if (!shouldShowUserPhotos(profile.user_id)) return;

        if (profile.avatar_url) {
          const viewKey = `avatar_${profile.user_id}`;
          allPhotos.push({
            id: `avatar_${profile.user_id}`,
            image_url: profile.avatar_url,
            content: 'პროფილის ფოტო',
            created_at: profile.created_at,
            likes_count: 0,
            views_count: viewsMap.get(viewKey) || 0,
            user_id: profile.user_id,
            username: profile.username || 'მომხმარებელი',
            avatar_url: profile.avatar_url,
            source: 'avatar'
          });
        }
        if (profile.cover_url) {
          const viewKey = `cover_${profile.user_id}`;
          allPhotos.push({
            id: `cover_${profile.user_id}`,
            image_url: profile.cover_url,
            content: 'ქოვერის ფოტო',
            created_at: profile.created_at,
            likes_count: 0,
            views_count: viewsMap.get(viewKey) || 0,
            user_id: profile.user_id,
            username: profile.username || 'მომხმარებელი',
            avatar_url: profile.avatar_url,
            source: 'cover'
          });
        }
      });

      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({ title: 'შეცდომა ფოტოების ჩატვირთვისას', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Record photo view
  const recordPhotoView = async (photo: Photo) => {
    try {
      // Determine the real photo ID
      let photoId = photo.id;
      if (photo.source === 'avatar') {
        photoId = photo.user_id;
      } else if (photo.source === 'cover') {
        photoId = photo.user_id;
      }

      await supabase.from('photo_views').insert({
        photo_id: photoId,
        photo_type: photo.source,
        user_id: user?.id || null
      });

      // Update local state
      setPhotos(prev => prev.map(p => 
        p.id === photo.id ? { ...p, views_count: p.views_count + 1 } : p
      ));
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    recordPhotoView(photo);
  };

  const sortedPhotos = [...photos].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        // Rating = views + likes * 2 (likes count more)
        const ratingA = a.views_count + a.likes_count * 2;
        const ratingB = b.views_count + b.likes_count * 2;
        return ratingB - ratingA;
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'most_liked':
        return b.likes_count - a.likes_count;
      case 'most_viewed':
        return b.views_count - a.views_count;
      default:
        return 0;
    }
  });

  // Allow deletion if user owns the photo OR is admin
  const canDeletePhoto = (photo: Photo) => {
    return photo.user_id === user?.id || isAdmin;
  };

  const handleDeletePhoto = async () => {
    if (!deletePhoto || !canDeletePhoto(deletePhoto)) return;
    
    setDeleting(true);
    try {
      if (deletePhoto.source === 'post') {
        // Check if it's a story
        if (deletePhoto.id.startsWith('story_')) {
          const storyId = deletePhoto.id.replace('story_', '');
          const { error } = await supabase
            .from('stories')
            .delete()
            .eq('id', storyId);
          
          if (error) throw error;
        } else {
          // Delete post
          const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', deletePhoto.id);
          
          if (error) throw error;
        }
      } else if (deletePhoto.source === 'avatar') {
        // Clear avatar from profile
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('user_id', deletePhoto.user_id);
        
        if (error) throw error;
      } else if (deletePhoto.source === 'cover') {
        // Clear cover from profile
        const { error } = await supabase
          .from('profiles')
          .update({ cover_url: null })
          .eq('user_id', deletePhoto.user_id);
        
        if (error) throw error;
      }

      setPhotos(prev => prev.filter(p => p.id !== deletePhoto.id));
      toast({ title: 'ფოტო წაიშალა!' });
      setDeletePhoto(null);
      setSelectedPhoto(null);
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

  // Photo actions
  const handleDownload = async (photo: Photo) => {
    try {
      const response = await fetch(photo.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: 'ფოტო ჩამოტვირთულია' });
    } catch (error) {
      toast({ title: 'შეცდომა ჩამოტვირთვისას', variant: 'destructive' });
    }
  };

  const handleSetAsProfilePic = async (photo: Photo) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: photo.image_url })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast({ title: 'პროფილის ფოტო განახლდა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleSetAsCover = async (photo: Photo) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: photo.image_url })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast({ title: 'ქოვერის ფოტო განახლდა' });
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleCopyLink = (photo: Photo) => {
    const url = `${window.location.origin}/photo/${photo.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'ბმული დაკოპირდა' });
  };

  const handleBanUser = async (photo: Photo) => {
    if (!isAdmin || !user) return;
    try {
      // Insert site ban
      const { error } = await supabase.from('site_bans').insert({
        user_id: photo.user_id,
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              ფოტოები
            </h1>
            <p className="text-sm text-muted-foreground">{photos.length} ფოტო</p>
          </div>
          
          {/* Filter */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> რეიტინგი
                </span>
              </SelectItem>
              <SelectItem value="newest">უახლესი</SelectItem>
              <SelectItem value="oldest">უძველესი</SelectItem>
              <SelectItem value="most_liked">პოპულარული</SelectItem>
              <SelectItem value="most_viewed">ნახვადი</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="p-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p>ფოტოები არ მოიძებნა</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
            {sortedPhotos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => handlePhotoClick(photo)}
                className="relative aspect-square group overflow-hidden rounded-lg"
              >
                <img 
                  src={photo.image_url} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-3 text-white text-sm">
                    {photo.views_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {photo.views_count}
                      </span>
                    )}
                    {photo.likes_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4 fill-white" /> {photo.likes_count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/80 px-2 py-1 bg-black/40 rounded">
                    {getSourceLabel(photo.source)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal - rendered via portal for proper fixed positioning */}
      {selectedPhoto && createPortal(
        <div 
          className="fixed inset-0 bg-black z-[100] flex flex-col"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-black/80 flex-shrink-0">
            <button 
              onClick={() => {
                setSelectedPhoto(null);
                if (onUserClick) onUserClick(selectedPhoto.user_id);
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                {selectedPhoto.avatar_url ? (
                  <img src={selectedPhoto.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-medium text-sm sm:text-base">{selectedPhoto.username}</p>
                <p className="text-white/60 text-xs sm:text-sm">{getSourceLabel(selectedPhoto.source)}</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              {/* Three dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border border-border z-[110]">
                  {/* Download */}
                  <DropdownMenuItem onClick={() => handleDownload(selectedPhoto)}>
                    <Download className="w-4 h-4 mr-3" />
                    ჩამოტვირთვა
                  </DropdownMenuItem>
                  
                  {/* Set as profile photo - only for self */}
                  {user && (
                    <>
                      <DropdownMenuItem onClick={() => handleSetAsProfilePic(selectedPhoto)}>
                        <UserCircle className="w-4 h-4 mr-3" />
                        პროფილის ფოტოდ
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetAsCover(selectedPhoto)}>
                        <Image className="w-4 h-4 mr-3" />
                        ქოვერად დაყენება
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Copy link */}
                  <DropdownMenuItem onClick={() => handleCopyLink(selectedPhoto)}>
                    <Link2 className="w-4 h-4 mr-3" />
                    ბმულის კოპირება
                  </DropdownMenuItem>
                  
                  {/* View profile */}
                  <DropdownMenuItem onClick={() => {
                    setSelectedPhoto(null);
                    onUserClick?.(selectedPhoto.user_id);
                  }}>
                    <ExternalLink className="w-4 h-4 mr-3" />
                    პროფილის ნახვა
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Report - for others' photos (works for all photo types) */}
                  {selectedPhoto.user_id !== user?.id && (
                    <ReportButton
                      contentType={selectedPhoto.source === 'post' ? 'post' : 'profile'}
                      contentId={selectedPhoto.source === 'post' ? selectedPhoto.id.replace('story_', '') : selectedPhoto.user_id}
                      reportedUserId={selectedPhoto.user_id}
                      contentPreview={selectedPhoto.image_url}
                      variant="menu"
                    />
                  )}
                  
                  {/* Admin actions */}
                  {isAdmin && selectedPhoto.user_id !== user?.id && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleBanUser(selectedPhoto)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="w-4 h-4 mr-3" />
                        მომხმარებლის დაბლოკვა
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Delete - for owner or admin */}
                  {canDeletePhoto(selectedPhoto) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeletePhoto(selectedPhoto)}
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
                onClick={() => setSelectedPhoto(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Image - Full screen with pinch to zoom */}
          <PhotoZoomContainer imageUrl={selectedPhoto.image_url} />

          {/* Footer */}
          <div className="p-4 bg-black/80">
            <div className="flex items-center justify-center gap-6 text-white">
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5" /> {selectedPhoto.views_count}
              </span>
              <span className="flex items-center gap-2">
                <Heart className="w-5 h-5" /> {selectedPhoto.likes_count}
              </span>
              <span className="text-white/60 text-sm">
                {new Date(selectedPhoto.created_at).toLocaleDateString('ka-GE')}
              </span>
            </div>
            {selectedPhoto.content && selectedPhoto.source === 'post' && (
              <p className="text-white/80 text-center mt-2 text-sm max-w-lg mx-auto">
                {selectedPhoto.content}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePhoto} onOpenChange={() => setDeletePhoto(null)}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>ფოტოს წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხართ რომ გსურთ ამ ფოტოს წაშლა?
              {deletePhoto?.source === 'post' && ' ეს წაშლის მთლიან პოსტს.'}
              {deletePhoto?.source === 'avatar' && ' ეს წაშლის მომხმარებლის პროფილის ფოტოს.'}
              {deletePhoto?.source === 'cover' && ' ეს წაშლის მომხმარებლის ქოვერის ფოტოს.'}
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

export default AllPhotosView;