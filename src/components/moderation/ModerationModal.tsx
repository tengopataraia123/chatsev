import { useState, useEffect } from 'react';
import { X, Check, Trash2, User, Image, Video, FileText, Clock, Globe, AlertCircle, Film, Users, AlertTriangle, ZoomIn, Play, Pause, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { logAdminAction } from '@/hooks/useAdminActionLog';
import { sendFriendContentNotification } from '@/hooks/useFriendNotifications';
import RegistrationDetailsModal from './RegistrationDetailsModal';
interface MatchingUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  age: number;
  gender: string;
  ip_address: string | null;
  created_at: string;
}

interface PendingItem {
  id: string;
  type: string;
  user_id: string;
  content_id: string | null;
  content_data: {
    username?: string;
    age?: number;
    gender?: string;
    image_url?: string;
    video_url?: string;
    content?: string;
    avatar_url?: string;
    cover_url?: string;
    title?: string;
    description?: string;
    thumbnail_url?: string;
  } | null;
  ip_address: string | null;
  status: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    age: number;
    gender: string;
  };
  source?: 'pending_approvals' | 'videos';
}

const typeLabels: Record<string, { label: string; icon: typeof User }> = {
  registration: { label: 'ახალი რეგისტრაცია', icon: User },
  post: { label: 'ახალი პოსტი', icon: FileText },
  post_image: { label: 'პოსტის ფოტო', icon: Image },
  post_video: { label: 'პოსტის ვიდეო', icon: Video },
  story: { label: 'ახალი სტორი', icon: Image },
  reel: { label: 'ახალი რილი', icon: Video },
  avatar: { label: 'პროფილის ფოტო', icon: User },
  cover: { label: 'ქავერის ფოტო', icon: Image },
  video: { label: 'ვიდეო', icon: Film },
};

const ModerationModal = () => {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [matchingUsers, setMatchingUsers] = useState<MatchingUser[]>([]);
  const [showMatchingUsers, setShowMatchingUsers] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [showRegistrationDetails, setShowRegistrationDetails] = useState(false);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'moderator') {
      setIsAdmin(true);
      fetchAllPendingItems();
      subscribeToChanges();
    }
  }, [userRole]);

  // Fetch matching users when current item changes (for registrations with IP)
  useEffect(() => {
    const currentItem = pendingItems[currentIndex];
    if (currentItem?.type === 'registration' && currentItem?.ip_address) {
      fetchMatchingUsers(currentItem.ip_address, currentItem.user_id);
    } else {
      setMatchingUsers([]);
    }
  }, [currentIndex, pendingItems]);

  const fetchMatchingUsers = async (ipAddress: string, excludeUserId: string) => {
    // Find other registrations with the same IP
    const { data: otherApprovals } = await supabase
      .from('pending_approvals')
      .select('user_id, ip_address, created_at')
      .eq('ip_address', ipAddress)
      .neq('user_id', excludeUserId);

    const otherUserIds = [...new Set(otherApprovals?.map(a => a.user_id) || [])];

    if (otherUserIds.length === 0) {
      setMatchingUsers([]);
      return;
    }

    // Fetch profiles for matching users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, age, gender, created_at')
      .in('user_id', otherUserIds);

    const matchingData: MatchingUser[] = (profiles || []).map(p => ({
      ...p,
      ip_address: ipAddress
    }));

    setMatchingUsers(matchingData);
  };

  const fetchAllPendingItems = async () => {
    // Fetch from all sources in parallel
    const [
      { data: approvals, error: approvalsError },
      { data: videos, error: videosError },
      { data: pendingStories, error: storiesError },
      { data: pendingPosts, error: postsError },
      { data: pendingReels, error: reelsError },
      { data: unapprovedProfiles, error: profilesError },
    ] = await Promise.all([
      supabase.from('pending_approvals').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('videos').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('stories').select('id, user_id, image_url, video_url, text_content, created_at, status').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('posts').select('id, user_id, content, image_url, video_url, created_at, is_approved').eq('is_approved', false).order('created_at', { ascending: true }),
      supabase.from('reels').select('id, user_id, video_url, description, thumbnail_url, created_at, status').eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('profiles').select('user_id, username, avatar_url, age, gender, created_at, is_approved, is_site_banned').eq('is_approved', false).or('is_site_banned.is.null,is_site_banned.eq.false').order('created_at', { ascending: true }),
    ]);

    if (approvalsError) console.error('Error fetching pending approvals:', approvalsError);
    if (videosError) console.error('Error fetching pending videos:', videosError);
    if (storiesError) console.error('Error fetching pending stories:', storiesError);
    if (postsError) console.error('Error fetching pending posts:', postsError);
    if (reelsError) console.error('Error fetching pending reels:', reelsError);
    if (profilesError) console.error('Error fetching unapproved profiles:', profilesError);

    // Get content_ids and user_ids already tracked in pending_approvals to avoid duplicates
    const trackedContentIds = new Set(
      (approvals || []).filter(a => a.content_id).map(a => a.content_id)
    );
    const trackedRegistrationUserIds = new Set(
      (approvals || []).filter(a => a.type === 'registration').map(a => a.user_id)
    );

    // Combine all user IDs for profile fetching
    const allUserIds = new Set<string>();
    approvals?.forEach(a => allUserIds.add(a.user_id));
    videos?.forEach(v => allUserIds.add(v.user_id));
    pendingStories?.forEach(s => allUserIds.add(s.user_id));
    pendingPosts?.forEach(p => allUserIds.add(p.user_id));
    pendingReels?.forEach(r => allUserIds.add(r.user_id));
    unapprovedProfiles?.forEach(p => allUserIds.add(p.user_id));

    // Fetch profiles for all users
    let profileMap = new Map<string, any>();
    if (allUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, age, gender')
        .in('user_id', Array.from(allUserIds));
      profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    }

    // Convert approvals to common format
    const approvalItems: PendingItem[] = (approvals || []).map(item => ({
      ...item,
      content_data: item.content_data as PendingItem['content_data'],
      profile: profileMap.get(item.user_id) || undefined,
      source: 'pending_approvals' as const
    }));

    // Convert videos to common format
    const videoItems: PendingItem[] = (videos || []).map(video => ({
      id: video.id,
      type: 'video',
      user_id: video.user_id,
      content_id: video.id,
      content_data: {
        video_url: video.video_url,
        title: video.title,
        description: video.description,
        thumbnail_url: video.thumbnail_url
      },
      ip_address: null,
      status: video.status,
      created_at: video.created_at,
      profile: profileMap.get(video.user_id) || undefined,
      source: 'videos' as const
    }));

    // Convert orphan pending stories (not tracked in pending_approvals)
    const orphanStoryItems: PendingItem[] = (pendingStories || [])
      .filter(s => !trackedContentIds.has(s.id))
      .map(story => ({
        id: `story-${story.id}`,
        type: 'story',
        user_id: story.user_id,
        content_id: story.id,
        content_data: {
          image_url: story.image_url,
          video_url: story.video_url,
          content: (story as any).text_content?.text || null,
        },
        ip_address: null,
        status: 'pending',
        created_at: story.created_at,
        profile: profileMap.get(story.user_id) || undefined,
        source: 'pending_approvals' as const
      }));

    // Convert orphan pending posts (not tracked in pending_approvals)
    const orphanPostItems: PendingItem[] = (pendingPosts || [])
      .filter(p => !trackedContentIds.has(p.id))
      .map(post => ({
        id: `post-${post.id}`,
        type: post.image_url ? 'post_image' : post.video_url ? 'post_video' : 'post',
        user_id: post.user_id,
        content_id: post.id,
        content_data: {
          content: post.content,
          image_url: post.image_url,
          video_url: post.video_url,
        },
        ip_address: null,
        status: 'pending',
        created_at: post.created_at,
        profile: profileMap.get(post.user_id) || undefined,
        source: 'pending_approvals' as const
      }));

    // Convert orphan pending reels (not tracked in pending_approvals)
    const orphanReelItems: PendingItem[] = (pendingReels || [])
      .filter(r => !trackedContentIds.has(r.id))
      .map(reel => ({
        id: `reel-${reel.id}`,
        type: 'reel',
        user_id: reel.user_id,
        content_id: reel.id,
        content_data: {
          video_url: reel.video_url,
          description: reel.description,
          thumbnail_url: reel.thumbnail_url,
        },
        ip_address: null,
        status: 'pending',
        created_at: reel.created_at,
        profile: profileMap.get(reel.user_id) || undefined,
        source: 'pending_approvals' as const
      }));

    // Convert orphan unapproved profiles (not tracked in pending_approvals)
    const orphanRegistrationItems: PendingItem[] = (unapprovedProfiles || [])
      .filter(p => !trackedRegistrationUserIds.has(p.user_id))
      .map(profile => ({
        id: `reg-${profile.user_id}`,
        type: 'registration',
        user_id: profile.user_id,
        content_id: null,
        content_data: {
          username: profile.username,
          avatar_url: profile.avatar_url,
          age: profile.age,
          gender: profile.gender,
        },
        ip_address: null,
        status: 'pending',
        created_at: profile.created_at,
        profile: { user_id: profile.user_id, username: profile.username, avatar_url: profile.avatar_url, age: profile.age, gender: profile.gender },
        source: 'pending_approvals' as const
      }));

    // Combine and sort by created_at
    const allItems = [
      ...approvalItems, 
      ...videoItems, 
      ...orphanStoryItems, 
      ...orphanPostItems, 
      ...orphanReelItems, 
      ...orphanRegistrationItems
    ].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    setPendingItems(allItems);
  };

  const subscribeToChanges = () => {
    // Subscribe to pending_approvals changes
    const approvalsChannel = supabase
      .channel('pending_approvals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_approvals',
        },
        () => {
          fetchAllPendingItems();
        }
      )
      .subscribe();

    // Subscribe to videos changes
    const videosChannel = supabase
      .channel('pending_videos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
        },
        () => {
          fetchAllPendingItems();
        }
      )
      .subscribe();

    // Subscribe to stories changes (for orphan pending stories)
    const storiesChannel = supabase
      .channel('pending_stories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => fetchAllPendingItems())
      .subscribe();

    // Subscribe to posts changes (for orphan pending posts)
    const postsChannel = supabase
      .channel('pending_posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchAllPendingItems())
      .subscribe();

    // Subscribe to reels changes
    const reelsChannel = supabase
      .channel('pending_reels_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => fetchAllPendingItems())
      .subscribe();

    // Subscribe to profiles changes (for orphan registrations)
    const profilesChannel = supabase
      .channel('pending_profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAllPendingItems())
      .subscribe();

    return () => {
      supabase.removeChannel(approvalsChannel);
      supabase.removeChannel(videosChannel);
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reelsChannel);
      supabase.removeChannel(profilesChannel);
    };
  };

  const sendNotificationToUser = async (userId: string, type: string, isApproved: boolean) => {
    const notificationType = isApproved ? 'content_approved' : 'content_rejected';
    const message = isApproved 
      ? `თქვენი ${typeLabels[type]?.label || type} დადასტურდა!`
      : `თქვენი ${typeLabels[type]?.label || type} უარყოფილია.`;

    await supabase.from('notifications').insert({
      user_id: userId,
      from_user_id: user?.id,
      type: notificationType,
      message: message,
    });
  };

  const handleApprove = async () => {
    if (!pendingItems[currentIndex]) return;
    
    const item = pendingItems[currentIndex];
    setLoading(true);

    // Optimistic UI update - remove item immediately for faster response
    const itemToApprove = { ...item };
    setPendingItems(prev => prev.filter((_, i) => i !== currentIndex));
    if (currentIndex >= pendingItems.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }

    try {
      // Run all operations in parallel for faster response
      const operations: PromiseLike<any>[] = [];
      
      if (itemToApprove.source === 'videos') {
        // Handle video approval
        operations.push(
          supabase
            .from('videos')
            .update({ status: 'approved' })
            .eq('id', itemToApprove.id)
            .then(({ error }) => { if (error) throw error; })
        );
        
        // Send notifications to friends after video approval (fire and forget)
        sendFriendContentNotification(itemToApprove.user_id, 'video', itemToApprove.id).catch(() => {});
      } else {
        // Handle pending_approvals - skip if this is an orphan item (no pending_approvals record)
        const isOrphan = typeof itemToApprove.id === 'string' && /^(story|post|reel|reg)-/.test(itemToApprove.id);
        if (!isOrphan) {
          operations.push(
            supabase
              .from('pending_approvals')
              .update({
                status: 'approved',
                reviewed_by: user?.id,
                reviewed_at: new Date().toISOString()
              })
              .eq('id', itemToApprove.id)
              .then(({ error }) => { if (error) throw error; })
          );
        }

        // If it's a registration, approve the user
        if (itemToApprove.type === 'registration') {
          operations.push(
            supabase
              .from('profiles')
              .update({ is_approved: true })
              .eq('user_id', itemToApprove.user_id)
              .then(({ error }) => { if (error) throw error; })
          );
        }

        // If it's a post (any type), approve the post
        if ((itemToApprove.type === 'post' || itemToApprove.type === 'post_image' || itemToApprove.type === 'post_video') && itemToApprove.content_id) {
          const postId = itemToApprove.content_id;
          operations.push(
            supabase
              .from('posts')
              .update({ is_approved: true })
              .eq('id', postId)
              .then(({ error, data }) => { 
                if (error) {
                  console.error('Failed to approve post:', postId, error);
                  throw error; 
                }
                console.log('Post approved successfully:', postId);
              })
          );
          
          // Send notifications to friends (fire and forget)
          const contentType = itemToApprove.type === 'post_image' ? 'photo' : itemToApprove.type === 'post_video' ? 'video' : 'post';
          sendFriendContentNotification(itemToApprove.user_id, contentType, postId).catch(() => {});
        }

        // If it's a story, approve the story and send notifications
        if (itemToApprove.type === 'story' && itemToApprove.content_id) {
          operations.push(
            supabase
              .from('stories')
              .update({ status: 'approved' } as any)
              .eq('id', itemToApprove.content_id)
              .then(({ error }) => { if (error) throw error; })
          );
          sendFriendContentNotification(itemToApprove.user_id, 'story', itemToApprove.content_id).catch(() => {});
        }

        // If it's a reel, approve the reel
        if (itemToApprove.type === 'reel' && itemToApprove.content_id) {
          operations.push(
            supabase
              .from('reels')
              .update({ status: 'approved' })
              .eq('id', itemToApprove.content_id)
              .then(({ error }) => { if (error) throw error; })
          );
          sendFriendContentNotification(itemToApprove.user_id, 'reel', itemToApprove.content_id).catch(() => {});
        }

        // If it's a poll, send notifications to friends
        if (itemToApprove.type === 'poll' && itemToApprove.content_id) {
          sendFriendContentNotification(itemToApprove.user_id, 'poll', itemToApprove.content_id).catch(() => {});
        }
      }

      // Run all critical operations in parallel
      await Promise.all(operations);

      // Non-critical operations (fire and forget for speed)
      sendNotificationToUser(itemToApprove.user_id, itemToApprove.type, true).catch(() => {});
      logAdminAction({
        actionType: 'approve',
        actionCategory: itemToApprove.type === 'registration' ? 'user' : 'content',
        targetUserId: itemToApprove.user_id,
        targetContentId: itemToApprove.content_id || itemToApprove.id,
        targetContentType: itemToApprove.type,
        description: `${typeLabels[itemToApprove.type]?.label || itemToApprove.type} დადასტურდა: ${itemToApprove.profile?.username || itemToApprove.content_data?.username || 'უცნობი'}`,
        metadata: { 
          type: itemToApprove.type,
          username: itemToApprove.profile?.username || itemToApprove.content_data?.username
        }
      }).catch(() => {});

      toast({
        title: 'დადასტურებულია!',
        description: `${typeLabels[itemToApprove.type]?.label || itemToApprove.type} დადასტურდა`,
        duration: 1000, // 1 second auto-dismiss
      });
    } catch (error) {
      console.error('Error approving:', error);
      // Revert optimistic update on error
      setPendingItems(prev => [...prev.slice(0, currentIndex), itemToApprove, ...prev.slice(currentIndex)]);
      toast({
        title: 'შეცდომა',
        description: 'დადასტურება ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

   const handleReject = async () => {
    if (!pendingItems[currentIndex]) return;
    
    const item = pendingItems[currentIndex];
    setLoading(true);
    console.log('[ModerationModal] Rejecting item:', item.id, 'type:', item.type, 'user:', item.user_id);

    try {
      if (item.source === 'videos') {
        // Handle video rejection - delete the video
        if (item.content_data?.video_url) {
          const urlParts = item.content_data.video_url.split('/');
          const filePath = urlParts.slice(-2).join('/');
          await supabase.storage.from('videos').remove([filePath]);
        }
        
        const { error } = await supabase
          .from('videos')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      } else {
        // Handle pending_approvals rejection - skip if orphan item
        const isOrphan = typeof item.id === 'string' && /^(story|post|reel|reg)-/.test(item.id);
        if (!isOrphan) {
          await supabase
            .from('pending_approvals')
            .update({
              status: 'rejected',
              reviewed_by: user?.id,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', item.id);
        }

        // Delete the content based on type
        if (item.type === 'registration') {
          // Block the user by adding to site_bans (ignore duplicates)
          await supabase.from('site_bans').upsert({
            user_id: item.user_id,
            blocked_nickname: item.profile?.username || item.content_data?.username,
            blocked_ip: item.ip_address,
            block_type: 'USER',
            reason: 'რეგისტრაცია უარყოფილია მოდერატორის მიერ',
            banned_by: user?.id,
            status: 'ACTIVE'
          }, { onConflict: 'user_id', ignoreDuplicates: true });
          
          // Mark profile as banned so it doesn't reappear in moderation
          await supabase
            .from('profiles')
            .update({ is_approved: false, is_site_banned: true })
            .eq('user_id', item.user_id);
        } else if ((item.type === 'post' || item.type === 'post_image' || item.type === 'post_video') && item.content_id) {
          await supabase.from('posts').delete().eq('id', item.content_id);
        } else if (item.type === 'story' && item.content_id) {
          await supabase.from('stories').delete().eq('id', item.content_id);
        } else if (item.type === 'reel' && item.content_id) {
          await supabase.from('reels').delete().eq('id', item.content_id);
        } else if (item.type === 'avatar') {
          // Remove avatar from profile - set to null when rejected
          const avatarUrl = item.content_data?.avatar_url;
          if (avatarUrl) {
            await supabase
              .from('profiles')
              .update({ avatar_url: null })
              .eq('user_id', item.user_id);
          }
        } else if (item.type === 'cover') {
          // Remove cover from profile - set to null when rejected
          const coverUrl = item.content_data?.cover_url;
          if (coverUrl) {
            await supabase
              .from('profiles')
              .update({ cover_url: null })
              .eq('user_id', item.user_id);
          }
        }
      }

      // Send notification to user
      await sendNotificationToUser(item.user_id, item.type, false);

      // Log admin action
      await logAdminAction({
        actionType: 'reject',
        actionCategory: item.type === 'registration' ? 'user' : 'content',
        targetUserId: item.user_id,
        targetContentId: item.content_id || item.id,
        targetContentType: item.type,
        description: `${typeLabels[item.type]?.label || item.type} უარყოფილია: ${item.profile?.username || item.content_data?.username || 'უცნობი'}`,
        metadata: { 
          type: item.type,
          username: item.profile?.username || item.content_data?.username
        }
      });

      toast({
        title: 'წაშლილია!',
        description: `${typeLabels[item.type]?.label || item.type} წაიშალა`,
        duration: 1000, // 1 second auto-dismiss
      });

      // Move to next item
      const newItems = pendingItems.filter(i => i.id !== item.id);
      setPendingItems(newItems);
      if (currentIndex >= newItems.length) {
        setCurrentIndex(Math.max(0, newItems.length - 1));
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      toast({
        title: 'შეცდომა',
        description: 'წაშლა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < pendingItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  if (!isAdmin || pendingItems.length === 0) {
    return null;
  }

  const currentItem = pendingItems[currentIndex];
  const TypeIcon = typeLabels[currentItem.type]?.icon || FileText;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ka-GE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // For registration items, only show the detailed registration modal
  if (currentItem.type === 'registration') {
    return (
      <RegistrationDetailsModal
        isOpen={true}
        onClose={handleSkip}
        registration={{
          id: currentItem.id,
          user_id: currentItem.user_id,
          username: currentItem.profile?.username || currentItem.content_data?.username || 'უცნობი',
          age: currentItem.profile?.age || currentItem.content_data?.age || 0,
          gender: currentItem.profile?.gender || currentItem.content_data?.gender || 'other',
          avatar_url: currentItem.profile?.avatar_url || currentItem.content_data?.avatar_url || undefined,
          ip_address: currentItem.ip_address,
          created_at: currentItem.created_at,
          city: (currentItem.content_data as any)?.city
        }}
        onApprove={async () => {
          await handleApprove();
        }}
        onReject={async () => {
          await handleReject();
        }}
        pendingCount={pendingItems.length}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[95vh] bg-card rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/20 to-accent/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">მოდერაცია</h2>
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
              {pendingItems.length} მომლოდინე
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4">
            {/* Type Badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TypeIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{typeLabels[currentItem.type]?.label || currentItem.type}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(currentItem.created_at)}
                </p>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                  {currentItem.profile?.avatar_url || currentItem.content_data?.avatar_url ? (
                    <img 
                      src={currentItem.profile?.avatar_url || currentItem.content_data?.avatar_url} 
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold">
                      {(currentItem.profile?.username || currentItem.content_data?.username || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium">
                    {currentItem.profile?.username || currentItem.content_data?.username || 'უცნობი'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {currentItem.profile?.age || currentItem.content_data?.age} წლის • {
                      (currentItem.profile?.gender || currentItem.content_data?.gender) === 'male' ? 'მამრობითი' :
                      (currentItem.profile?.gender || currentItem.content_data?.gender) === 'female' ? 'მდედრობითი' : 'სხვა'
                    }
                  </p>
                </div>
              </div>
              
              {/* IP Address */}
              {currentItem.ip_address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 rounded-lg px-3 py-2">
                  <Globe className="w-4 h-4" />
                  <span>IP: {currentItem.ip_address}</span>
                </div>
              )}
            </div>

            {/* Matching Users with Same IP - Show for registrations */}
            {currentItem.type === 'registration' && matchingUsers.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                <button
                  onClick={() => setShowMatchingUsers(!showMatchingUsers)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-600 dark:text-amber-400">
                      სხვა ანგარიშები ამ IP-დან
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      ნაპოვნია {matchingUsers.length} სხვა მომხმარებელი იგივე IP მისამართით
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {matchingUsers.length}
                  </Badge>
                </button>
                
                {showMatchingUsers && (
                  <div className="mt-3 space-y-2 border-t border-amber-500/20 pt-3">
                    {matchingUsers.map((matchUser) => (
                      <div 
                        key={matchUser.user_id}
                        className="flex items-center gap-3 p-2 bg-background/50 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden">
                          {matchUser.avatar_url ? (
                            <img 
                              src={matchUser.avatar_url} 
                              alt={matchUser.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-xs font-bold">
                              {matchUser.username[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{matchUser.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {matchUser.age} წლის • {
                              matchUser.gender === 'male' ? 'მამრ.' :
                              matchUser.gender === 'female' ? 'მდედრ.' : 'სხვა'
                            }
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(matchUser.created_at).toLocaleDateString('ka-GE')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video Title and Description */}
            {currentItem.type === 'video' && currentItem.content_data?.title && (
              <div className="bg-secondary/30 rounded-xl p-4 mb-4">
                <h4 className="font-medium mb-1">{currentItem.content_data.title}</h4>
                {currentItem.content_data.description && (
                  <p className="text-sm text-muted-foreground">{currentItem.content_data.description}</p>
                )}
              </div>
            )}

            {/* Content Preview */}
            {currentItem.content_data?.content && (
              <div className="bg-secondary/30 rounded-xl p-4 mb-4">
                <p className="text-sm">{currentItem.content_data.content}</p>
              </div>
            )}

            {/* Image Preview - Click to view fullscreen */}
            {currentItem.content_data?.image_url && (
              <div 
                className="rounded-xl overflow-hidden mb-4 cursor-pointer relative group"
                onClick={() => setFullscreenImage(currentItem.content_data?.image_url || null)}
              >
                <img 
                  src={currentItem.content_data.image_url}
                  alt="Preview"
                  className="w-full object-contain bg-black/20"
                  style={{ maxHeight: '60vh' }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm font-medium">
                    დააკლიკე სრულად სანახავად
                  </span>
                </div>
              </div>
            )}

            {/* Avatar Preview - Click to view fullscreen */}
            {currentItem.content_data?.avatar_url && currentItem.type === 'avatar' && (
              <div 
                className="rounded-xl overflow-hidden mb-4 cursor-pointer relative group"
                onClick={() => setFullscreenImage(currentItem.content_data?.avatar_url || null)}
              >
                <img 
                  src={currentItem.content_data.avatar_url}
                  alt="Avatar Preview"
                  className="w-full object-contain bg-black/20"
                  style={{ maxHeight: '60vh' }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm font-medium">
                    დააკლიკე სრულად სანახავად
                  </span>
                </div>
              </div>
            )}

            {/* Full Video Player for moderation */}
            {currentItem.content_data?.video_url && (
              <div className="rounded-xl overflow-hidden mb-4 bg-black">
                <video 
                  src={currentItem.content_data.video_url}
                  className="w-full"
                  style={{ maxHeight: '60vh' }}
                  controls
                  controlsList="nodownload"
                  playsInline
                  poster={currentItem.content_data?.thumbnail_url}
                />
                <div className="flex items-center justify-center gap-2 py-2 bg-secondary/50">
                  <Film className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    ვიდეოს სანახავად დააჭირეთ პლეერზე
                  </span>
                  <button
                    onClick={() => setFullscreenVideo(currentItem.content_data?.video_url || null)}
                    className="ml-2 p-1.5 hover:bg-secondary rounded-lg transition-colors"
                    title="სრულ ეკრანზე"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Thumbnail Preview only if no video_url */}
            {currentItem.content_data?.thumbnail_url && currentItem.type === 'video' && !currentItem.content_data?.video_url && (
              <div className="rounded-xl overflow-hidden mb-4 bg-secondary/30">
                <img 
                  src={currentItem.content_data.thumbnail_url}
                  alt="Video Thumbnail"
                  className="w-full max-h-48 object-cover"
                />
                <p className="text-center text-sm text-muted-foreground py-2">
                  ვიდეო არ არის ხელმისაწვდომი
                </p>
              </div>
            )}

            {/* Cover Preview - Click to view fullscreen */}
            {currentItem.content_data?.cover_url && currentItem.type === 'cover' && (
              <div 
                className="rounded-xl overflow-hidden mb-4 cursor-pointer relative group"
                onClick={() => setFullscreenImage(currentItem.content_data?.cover_url || null)}
              >
                <img 
                  src={currentItem.content_data.cover_url}
                  alt="Cover Preview"
                  className="w-full object-contain bg-black/20"
                  style={{ maxHeight: '60vh' }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm font-medium">
                    დააკლიკე სრულად სანახავად
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border bg-secondary/20">
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            className="flex-1 gap-2"
          >
            <Trash2 className="w-4 h-4" />
            წაშლა
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4" />
            დადასტურება
          </Button>
        </div>

        {/* Navigation dots */}
        {pendingItems.length > 1 && (
          <div className="flex justify-center gap-1 p-3 border-t border-border">
            {pendingItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-6 bg-primary' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Image Dialog - Higher z-index to appear above moderation modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4">
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={fullscreenImage}
            alt="Full Preview"
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}

      {/* Fullscreen Video Dialog - Higher z-index to appear above moderation modal */}
      {fullscreenVideo && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4">
          <button
            onClick={() => setFullscreenVideo(null)}
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <video 
            src={fullscreenVideo}
            className="max-w-full max-h-[90vh]"
            controls
            autoPlay
          />
        </div>
      )}
    </div>
  );
};

export default ModerationModal;