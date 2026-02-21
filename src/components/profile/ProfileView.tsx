import { useState, useEffect, useRef } from 'react';
import { Loader2, Ban, Lock, AlertTriangle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Profile } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { createPendingApproval } from '@/hooks/useModerationQueue';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';
import { sendFriendContentNotification } from '@/hooks/useFriendNotifications';
import { canIgnore } from '@/utils/rbacUtils';
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

// Profile Components - v2026 Architecture
import ProfileHeaderCard from '@/components/profile-v2/ProfileHeaderCard';
import ProfileInfoCard from '@/components/profile-v2/ProfileInfoCard';
import ProfileActionButtonsV2 from '@/components/profile-v2/ProfileActionButtonsV2';
import SettingsHub from '@/components/profile-v2/SettingsHub';
import ProfileVisitors from './ProfileVisitors';
import ProfileSubscribers from './ProfileSubscribers';
import ProfileFriends from './ProfileFriends';
import UserConversationsModal from './UserConversationsModal';
import { BlockUserModal } from '@/components/moderation/BlockUserModal';
import ProfileEditModal from './ProfileEditModal';
import InspectorMessagingView from '@/components/messenger/InspectorMessagingView';
import ProfileActivityFeed from './activity/ProfileActivityFeed';
import PrivacyBlockedScreen from '@/components/privacy/PrivacyBlockedScreen';
import ProfilePhotoViewer from './ProfilePhotoViewer';
import GiftPickerModal from '@/components/gifts/GiftPickerModal';
// ProfileGiftsSection removed - gifts now shown in action buttons
import GiftsInbox from '@/components/gifts/GiftsInbox';
import { CurrentMoodBadge } from '@/components/mood';
import { useRelationshipStatus } from '@/hooks/useRelationshipStatus';
import RelationshipProposalModal from '@/components/relationship/RelationshipProposalModal';
interface ProfileViewProps {
  profile: Profile | null;
  viewUserId?: string;
  onEditProfile?: () => void;
  onSettings?: () => void;
  onMessage?: (userId: string) => void;
  onBack?: () => void;
  onNavigateToAIAvatar?: () => void;
}

interface UserPost {
  id: string;
  image_url: string | null;
  content?: string | null;
  likes_count: number;
}

const ProfileView = ({ profile: initialProfile, viewUserId, onEditProfile, onSettings, onMessage, onBack, onNavigateToAIAvatar }: ProfileViewProps) => {
  // State
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friends, setFriends] = useState<{ id: string; avatar_url: string | null; username: string }[]>([]);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(initialProfile);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted' | 'received'>('none');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  const [isIgnoredByUser, setIsIgnoredByUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewedUserRole, setViewedUserRole] = useState<string | null>(null);
  const [ownUserRole, setOwnUserRole] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState<{profile_visibility: string; message_permission: string} | null>(null);
  const [isProfileLocked, setIsProfileLocked] = useState(false);
  const [privacyCheckComplete, setPrivacyCheckComplete] = useState(false); // CRITICAL: Block render until privacy is checked
  const [visitorsCount, setVisitorsCount] = useState(0);
  
  // Modals
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showConversationsModal, setShowConversationsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInspectorView, setShowInspectorView] = useState(false);
  const [isAllowedInspector, setIsAllowedInspector] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState(false);
  const [showSettingsHub, setShowSettingsHub] = useState(false);
  const [showCoverViewer, setShowCoverViewer] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showGiftsInbox, setShowGiftsInbox] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState<{status: string; partnerUsername?: string; partnerId?: string;} | null>(null);
  const [showRelationshipProposal, setShowRelationshipProposal] = useState(false);
  const [showEndRelationshipDialog, setShowEndRelationshipDialog] = useState(false);
  
  const [userSiteBanInfo, setUserSiteBanInfo] = useState<{
    is_banned: boolean;
    ban_id: string | null;
    reason: string | null;
    banned_until: string | null;
  } | null>(null);

  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { upload: s3Upload } = useS3Upload();
  const relationshipHook = useRelationshipStatus(viewUserId);
  // CRITICAL: Determine if viewing own profile
  // isOwnProfile is true ONLY if viewUserId is not set OR equals current user
  const isOwnProfile = !viewUserId || (user?.id ? viewUserId === user.id : true);
  const profileUserId = viewUserId || user?.id;
  
  // Debug logging for message button visibility
  console.log('[ProfileView] isOwnProfile:', isOwnProfile, 'viewUserId:', viewUserId, 'userId:', user?.id, 'onMessage exists:', !!onMessage);

  // Check permissions and record visit
  useEffect(() => {
    if (!profileUserId) return;
    
    // CRITICAL: Reset privacy check state on profile change
    setPrivacyCheckComplete(false);
    setIsProfileLocked(false);
    
    const checkPermissionsAndRecordVisit = async () => {
      if (!user) {
        // If not logged in viewing other profile, mark as complete
        if (viewUserId) {
          setPrivacyCheckComplete(true);
        }
        return;
      }
      
      // Check if current user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsAdmin(roleData?.role === 'admin' || roleData?.role === 'moderator' || roleData?.role === 'super_admin');
      setIsSuperAdmin(roleData?.role === 'super_admin');
      setOwnUserRole(roleData?.role || null);

      // Check if user is allowed inspector (CHEGE or P ი კ ა S ო)
      if (roleData?.role === 'super_admin') {
        const { data: ownProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        
        const allowedInspectors = ['CHEGE', 'P ი კ ა S ო'];
        setIsAllowedInspector(allowedInspectors.includes(ownProfile?.username || ''));
      }

      const isSuperAdminUser = roleData?.role === 'super_admin';
      let profileLocked = false;

      if (viewUserId && viewUserId !== user.id) {
        // Fetch viewed user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', viewUserId)
          .single();
        
        setViewedProfile(profileData);
        setIsVerified(profileData?.is_verified || false);

        // Check viewed user's role
        const { data: viewedUserRoleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', viewUserId)
          .maybeSingle();
        
        setViewedUserRole(viewedUserRoleData?.role || null);

        // Check if user is site banned
        const { data: banData } = await supabase
          .rpc('get_user_site_ban', { _user_id: viewUserId });
        
        if (banData && banData.length > 0 && banData[0].is_banned) {
          setUserSiteBanInfo({
            is_banned: true,
            ban_id: banData[0].ban_id,
            reason: banData[0].reason,
            banned_until: banData[0].banned_until
          });
        } else {
          setUserSiteBanInfo(null);
        }

        // Check if blocked or ignored
        const { data: blockData } = await supabase
          .from('user_blocks')
          .select('*')
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${viewUserId}),and(blocker_id.eq.${viewUserId},blocked_id.eq.${user.id})`)
          .maybeSingle();
        
        if (blockData) {
          setIsBlocked(blockData.blocker_id === user.id);
          setIsBlockedByUser(blockData.blocker_id === viewUserId);
          setIsIgnoredByUser(blockData.blocker_id === viewUserId);
        } else {
          setIsBlocked(false);
          setIsBlockedByUser(false);
          setIsIgnoredByUser(false);
        }

        // Check friendship status - query both directions separately
        let friendshipData = null;
        
        // First check if I sent request to them
        const { data: sentRequest } = await supabase
          .from('friendships')
          .select('*')
          .eq('requester_id', user.id)
          .eq('addressee_id', viewUserId)
          .maybeSingle();
        
        if (sentRequest) {
          friendshipData = sentRequest;
        } else {
          // Check if they sent request to me
          const { data: receivedRequest } = await supabase
            .from('friendships')
            .select('*')
            .eq('requester_id', viewUserId)
            .eq('addressee_id', user.id)
            .maybeSingle();
          
          friendshipData = receivedRequest;
        }
        
        if (friendshipData) {
          if (friendshipData.status === 'accepted') {
            setFriendshipStatus('accepted');
          } else if (friendshipData.requester_id === user.id) {
            setFriendshipStatus('pending');
          } else {
            setFriendshipStatus('received');
          }
        }

        // Check if following
        const { data: followData } = await supabase
          .from('followers')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', viewUserId)
          .maybeSingle();
        
        setIsFollowing(!!followData);

        // Fetch privacy settings
        const { data: privacyData } = await supabase
          .from('privacy_settings')
          .select('profile_visibility, message_permission')
          .eq('user_id', viewUserId)
          .maybeSingle();
        
        setPrivacySettings(privacyData);
        
        // Check if profile is locked
        if (privacyData && !isSuperAdminUser) {
          if (privacyData.profile_visibility === 'nobody') {
            profileLocked = true;
          } else if (privacyData.profile_visibility === 'friends' && friendshipData?.status !== 'accepted') {
            profileLocked = true;
          }
        }
        
        setIsProfileLocked(profileLocked);
        // CRITICAL: Mark privacy check as complete IMMEDIATELY after determining lock status
        setPrivacyCheckComplete(true);

        // IMPORTANT: If profile is locked, DO NOT record visit - exit early
        if (profileLocked && !isSuperAdminUser) {
          return; // Don't record visit for locked profiles
        }

        // Record profile visit - but NOT for CHEGE (invisible visitor)
        const isRootInvisible = user.id === 'b067dbd7-1235-407f-8184-e2f6aef034d3';
        
        // Only record visit if not CHEGE
        if (!isRootInvisible) {
          try {
            // Use upsert to prevent duplicate key errors from race conditions
            await supabase
              .from('profile_visits')
              .upsert({
                profile_user_id: viewUserId,
                visitor_user_id: user.id,
                visited_at: new Date().toISOString(),
                is_seen: false
              }, { 
                onConflict: 'profile_user_id,visitor_user_id',
                ignoreDuplicates: false 
              });
          } catch (error) {
            // Silently ignore duplicate key errors
            if ((error as any)?.code !== '23505') {
              console.error('Error recording visit:', error);
            }
          }
        }
      } else {
        setViewedProfile(initialProfile);
        setPrivacyCheckComplete(true); // Own profile - no privacy check needed
      }
    };

    const fetchVisitorsCount = async () => {
      if (!user || viewUserId) return;
      
      const { count } = await supabase
        .from('profile_visits')
        .select('*', { count: 'exact', head: true })
        .eq('profile_user_id', user.id);
      
      setVisitorsCount(count || 0);
    };

    checkPermissionsAndRecordVisit();
    fetchUserData();
    fetchVisitorsCount();
  }, [user, viewUserId, profileUserId, initialProfile]);

  // Real-time subscription for ban status
  useEffect(() => {
    if (!viewUserId || isOwnProfile) return;

    const channel = supabase
      .channel(`profile-ban-${viewUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_bans',
        filter: `user_id=eq.${viewUserId}`
      }, async () => {
        const { data: banData } = await supabase.rpc('get_user_site_ban', { _user_id: viewUserId });
        
        if (banData && banData.length > 0 && banData[0].is_banned) {
          setUserSiteBanInfo({
            is_banned: true,
            ban_id: banData[0].ban_id,
            reason: banData[0].reason,
            banned_until: banData[0].banned_until
          });
        } else {
          setUserSiteBanInfo(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewUserId, isOwnProfile]);

  const fetchUserData = async () => {
    if (!profileUserId) return;
    setLoading(true);

    try {
      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, image_url, content')
        .eq('user_id', profileUserId)
        .order('created_at', { ascending: false });

      const postIds = postsData?.map(p => p.id) || [];
      let likesCountMap = new Map<string, number>();
      
      if (postIds.length > 0) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIds);

        likesData?.forEach(l => {
          likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1);
        });
      }

      setUserPosts((postsData || []).map(p => ({
        id: p.id,
        image_url: p.image_url,
        content: p.content,
        likes_count: likesCountMap.get(p.id) || 0,
      })));

      // Fetch counts
      const { count: followersCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileUserId);

      const { count: followingCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileUserId);

      // Fetch friends count
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
        .eq('status', 'accepted');

      const friendIds = friendships?.map(f => 
        f.requester_id === profileUserId ? f.addressee_id : f.requester_id
      ) || [];

      // Fetch friend profiles for preview
      if (friendIds.length > 0) {
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, avatar_url, username')
          .in('user_id', friendIds.slice(0, 8));
        
        setFriends(friendProfiles?.map(f => ({
          id: f.user_id,
          avatar_url: f.avatar_url,
          username: f.username
        })) || []);
      }

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);
      setFriendsCount(friendIds.length);

      // Fetch relationship status
      const { data: relData } = await supabase
        .from('relationship_statuses')
        .select('status, partner_id, privacy_level, hide_partner_name')
        .eq('user_id', profileUserId)
        .maybeSingle();

      if (relData && relData.status) {
        let partnerUsername: string | undefined;
        let partnerId: string | undefined;

        if (relData.partner_id && !relData.hide_partner_name) {
          const { data: partnerData } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', relData.partner_id)
            .single();
          
          partnerUsername = partnerData?.username;
          partnerId = relData.partner_id;
        }

        // Respect privacy: only show if public, or friends (and we're friends), or own profile
        const shouldShow = 
          relData.privacy_level === 'public' ||
          (relData.privacy_level === 'friends' && (friendIds.includes(user?.id || '') || isOwnProfile)) ||
          isOwnProfile;

        if (shouldShow) {
          setRelationshipStatus({
            status: relData.status,
            partnerUsername,
            partnerId,
          });
        } else {
          setRelationshipStatus(null);
        }
      } else {
        setRelationshipStatus(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileUserId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'ფაილი ძალიან დიდია (მაქს. 10MB)', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Use S3 upload for avatars
      const result = await s3Upload(file, S3_FOLDERS.AVATARS);
      
      if (!result) throw new Error('Upload failed');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('user_id', profileUserId);

      if (updateError) throw updateError;

      if (isOwnProfile && user) {
        try {
          await createPendingApproval({
            type: 'avatar',
            userId: user.id,
            contentData: { avatar_url: result.url }
          });
        } catch (err) {
          console.error('Error creating pending approval:', err);
        }
      }

      setViewedProfile(prev => prev ? { ...prev, avatar_url: result.url } as Profile : null);
      toast({ title: 'ავატარი განახლდა!' });
      
      // Notify friends about avatar change
      if (isOwnProfile && user) {
        sendFriendContentNotification(user.id, 'avatar_change');
      }
      
      if (isOwnProfile) refreshProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileUserId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'ფაილი ძალიან დიდია (მაქს. 10MB)', variant: 'destructive' });
      return;
    }

    setUploadingCover(true);
    try {
      // Use S3 upload for covers
      const result = await s3Upload(file, S3_FOLDERS.COVERS);
      
      if (!result) throw new Error('Upload failed');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: result.url })
        .eq('user_id', profileUserId);

      if (updateError) throw updateError;

      if (isOwnProfile && user) {
        try {
          await createPendingApproval({
            type: 'cover',
            userId: user.id,
            contentData: { cover_url: result.url }
          });
        } catch (err) {
          console.error('Error creating pending approval:', err);
        }
      }

      setViewedProfile(prev => prev ? { ...prev, cover_url: result.url } as any : null);
      toast({ title: 'ფონის სურათი განახლდა!' });
      
      // Notify friends about cover change
      if (isOwnProfile && user) {
        sendFriendContentNotification(user.id, 'cover_change');
      }
      
      if (isOwnProfile) refreshProfile();
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !viewUserId) return;
    
    try {
      if (isFollowing) {
        await supabase.from('followers').delete()
          .eq('follower_id', user.id)
          .eq('following_id', viewUserId);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await supabase.from('followers').insert({
          follower_id: user.id,
          following_id: viewUserId
        });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        
        await supabase.from('notifications').insert({
          user_id: viewUserId,
          from_user_id: user.id,
          type: 'follow'
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleFriendRequest = async () => {
    if (!user || !viewUserId) return;
    
    try {
      if (friendshipStatus === 'none') {
        // Send new friend request
        await supabase.from('friendships').insert({
          requester_id: user.id,
          addressee_id: viewUserId
        });
        setFriendshipStatus('pending');
        
        await supabase.from('notifications').insert({
          user_id: viewUserId,
          from_user_id: user.id,
          type: 'friend_request'
        });
        
        toast({ title: 'მოთხოვნა გაიგზავნა' });
      } else if (friendshipStatus === 'pending') {
        // Cancel pending request that I sent
        const { error } = await supabase.from('friendships')
          .delete()
          .eq('requester_id', user.id)
          .eq('addressee_id', viewUserId)
          .eq('status', 'pending');
        
        if (!error) {
          // Also delete the notification we sent
          await supabase.from('notifications')
            .delete()
            .eq('user_id', viewUserId)
            .eq('from_user_id', user.id)
            .eq('type', 'friend_request');
          
          setFriendshipStatus('none');
          toast({ title: 'მოთხოვნა გაუქმდა' });
        }
      } else if (friendshipStatus === 'received') {
        // Accept friend request that I received - the other user sent request, I'm the addressee
        const { error } = await supabase.from('friendships')
          .update({ status: 'accepted' })
          .eq('requester_id', viewUserId)
          .eq('addressee_id', user.id)
          .eq('status', 'pending');
        
        if (error) {
          console.error('Error accepting friend request:', error);
          toast({ title: 'შეცდომა მეგობრობის დადასტურებისას', variant: 'destructive' });
          return;
        }
        
        setFriendshipStatus('accepted');
        
        await supabase.from('notifications').insert({
          user_id: viewUserId,
          from_user_id: user.id,
          type: 'friend_accept'
        });
        
        toast({ title: 'მეგობრად დაემატა!' });
      } else if (friendshipStatus === 'accepted') {
        // Remove existing friendship - could be either direction
        const { error: deleteError1 } = await supabase.from('friendships')
          .delete()
          .eq('requester_id', user.id)
          .eq('addressee_id', viewUserId);
        
        const { error: deleteError2 } = await supabase.from('friendships')
          .delete()
          .eq('requester_id', viewUserId)
          .eq('addressee_id', user.id);
        
        if (!deleteError1 || !deleteError2) {
          setFriendshipStatus('none');
          toast({ title: 'მეგობრობა გაუქმდა' });
        }
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  };

  const handleBlock = async () => {
    if (!user || !viewUserId) return;
    
    // RBAC: Check if viewer can ignore this user based on role hierarchy
    if (!canIgnore(ownUserRole, viewedUserRole)) {
      // Silently reject - don't reveal role information to the user
      console.log('[RBAC] Ignore action blocked: viewer role', ownUserRole, 'cannot ignore target role', viewedUserRole);
      return;
    }
    
    try {
      if (isBlocked) {
        const { error } = await supabase.from('user_blocks').delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', viewUserId);
        
        if (error) {
          console.error('Error unblocking user:', error);
          toast({ title: 'შეცდომა იგნორის მოხსნისას', variant: 'destructive' });
          return;
        }
        setIsBlocked(false);
        toast({ title: 'იგნორი მოიხსნა' });
      } else {
        const { error } = await supabase.from('user_blocks').insert({
          blocker_id: user.id,
          blocked_id: viewUserId
        });
        
        if (error) {
          console.error('Error blocking user:', error);
          toast({ title: 'შეცდომა დაბლოკვისას', variant: 'destructive' });
          return;
        }
        setIsBlocked(true);
        toast({ title: 'მომხმარებელი დაიგნორდა' });
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleSiteUnban = async () => {
    if (!user || !viewUserId || !isSuperAdmin || !userSiteBanInfo?.ban_id) return;
    
    try {
      const { error } = await supabase
        .from('site_bans')
        .update({
          status: 'REMOVED',
          removed_by: user.id,
          removed_at: new Date().toISOString()
        })
        .eq('id', userSiteBanInfo.ban_id);

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ is_site_banned: false })
        .eq('user_id', viewUserId);

      setUserSiteBanInfo(null);
      toast({ title: 'მომხმარებელი განიბლოკა საიტზე' });
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const canMessage = (() => {
    if (isAdmin) return true; // All admin roles bypass messaging restrictions
    if (!privacySettings || privacySettings.message_permission === 'everyone') return true;
    if (privacySettings.message_permission === 'nobody') return false;
    if (privacySettings.message_permission === 'friends') return friendshipStatus === 'accepted';
    return true;
  })();

  const handleDeleteUser = async () => {
    if (!user || !viewUserId || !isSuperAdmin) return;
    
    setDeletingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'სესია არ არის აქტიური', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId: viewUserId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('[DeleteUser] Response:', { data, error });

      // Check both network error and API error in response data
      if (error) {
        throw new Error(error.message || 'მომხმარებლის წაშლა ვერ მოხერხდა');
      }
      
      if (data?.error) {
        throw new Error(data.error || 'მომხმარებლის წაშლა ვერ მოხერხდა');
      }

      toast({ title: 'მომხმარებელი წაიშალა!' });
      setShowDeleteConfirm(false);
      
      // Navigate back to main page
      if (onBack) {
        onBack();
      } else {
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ 
        title: 'შეცდომა', 
        description: error.message || 'მომხმარებლის წაშლა ვერ მოხერხდა', 
        variant: 'destructive' 
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const handleVerify = async () => {
    if (!user || !viewUserId || !isSuperAdmin) return;
    
    setVerifyingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'სესია არ არის აქტიური', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('verify-user', {
        body: { 
          action: 'verify',
          targetUserId: viewUserId 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'ვერიფიკაცია ვერ მოხერხდა');
      }

      setIsVerified(true);
      toast({ title: 'მომხმარებელი ვერიფიცირდა ✓' });
    } catch (error: any) {
      console.error('Error verifying user:', error);
      toast({ 
        title: 'შეცდომა', 
        description: error.message || 'ვერიფიკაცია ვერ მოხერხდა', 
        variant: 'destructive' 
      });
    } finally {
      setVerifyingUser(false);
    }
  };

  const handleUnverify = async () => {
    if (!user || !viewUserId || !isSuperAdmin) return;
    
    setVerifyingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'სესია არ არის აქტიური', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('verify-user', {
        body: { 
          action: 'unverify',
          targetUserId: viewUserId 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'ვერიფიკაციის მოხსნა ვერ მოხერხდა');
      }

      setIsVerified(false);
      toast({ title: 'ვერიფიკაცია მოიხსნა' });
    } catch (error: any) {
      console.error('Error unverifying user:', error);
      toast({ 
        title: 'შეცდომა', 
        description: error.message || 'ვერიფიკაციის მოხსნა ვერ მოხერხდა', 
        variant: 'destructive' 
      });
    } finally {
      setVerifyingUser(false);
    }
  };

  // CRITICAL: Block ALL rendering until privacy check is complete for other profiles
  // This prevents ANY content from being visible before privacy is verified
  if (!isOwnProfile && !privacyCheckComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Blocked/Ignored screens - using centralized PrivacyBlockedScreen
  if (isIgnoredByUser && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <PrivacyBlockedScreen 
          reason="მომხმარებელმა დაგაიგნორათ — ამ პროფილთან წვდომა შეზღუდულია"
          onBack={onBack}
        />
      </div>
    );
  }

  if (isBlockedByUser && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <PrivacyBlockedScreen 
          reason="დაბლოკილი ხართ — ამ მომხმარებელმა დაგბლოკათ"
          onBack={onBack}
        />
      </div>
    );
  }

  if (isProfileLocked && !isOwnProfile) {
    const lockReason = privacySettings?.profile_visibility === 'nobody' 
      ? 'პროფილზე წვდომა შეზღუდულია — მომხმარებელმა დახურა პროფილი ყველასთვის'
      : 'პროფილზე წვდომა შეზღუდულია — მხოლოდ მეგობრებისთვისაა ხელმისაწვდომი';
    
    return (
      <div className="min-h-screen bg-background">
        <PrivacyBlockedScreen 
          reason={lockReason}
          onBack={onBack}
        />
      </div>
    );
  }

  // Show Settings Hub fullscreen if open
  if (showSettingsHub) {
    return (
      <SettingsHub 
        onClose={() => setShowSettingsHub(false)}
        onNavigateToProfile={(userId) => {
          setShowSettingsHub(false);
          window.location.href = `/?view=profile&userId=${userId}`;
        }}
        viewedUserId={viewUserId}
        viewedUsername={viewedProfile?.username}
      />
    );
  }

  return (
    <ScrollArea className="h-[100dvh] bg-background w-full overflow-x-hidden profile-mobile-container" style={{ WebkitOverflowScrolling: 'touch', maxWidth: '100vw' }}>
    <div className="pb-24 w-full overflow-x-hidden box-border" style={{ maxWidth: '100vw' }}>
      {/* Ban Warning for Admins */}
      {userSiteBanInfo?.is_banned && isAdmin && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-3">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              ეს მომხმარებელი დაბლოკილია საიტზე
              {userSiteBanInfo.reason && `: ${userSiteBanInfo.reason}`}
            </span>
          </div>
        </div>
      )}
      
      {/* Profile Header with Cover & Avatar - v2026 */}
      <ProfileHeaderCard
        profile={viewedProfile}
        isOwnProfile={isOwnProfile}
        isSuperAdmin={isSuperAdmin}
        uploadingAvatar={uploadingAvatar}
        uploadingCover={uploadingCover}
        onAvatarUpload={async (file: File) => {
          if (!profileUserId) return;
          setUploadingAvatar(true);
          try {
            const result = await s3Upload(file, S3_FOLDERS.AVATARS);
            if (!result) throw new Error('Upload failed');
            
            await supabase
              .from('profiles')
              .update({ avatar_url: result.url })
              .eq('user_id', profileUserId);
            
            setViewedProfile(prev => prev ? { ...prev, avatar_url: result.url } as Profile : null);
            toast({ title: 'ავატარი განახლდა!' });
            if (isOwnProfile) refreshProfile();
          } catch (error) {
            console.error('Error uploading avatar:', error);
            toast({ title: 'შეცდომა', variant: 'destructive' });
          } finally {
            setUploadingAvatar(false);
          }
        }}
        onCoverUpload={handleCoverUpload}
        onCoverClick={() => (viewedProfile as any)?.cover_url && setShowCoverViewer(true)}
        onNavigateToAIAvatar={isOwnProfile ? onNavigateToAIAvatar : undefined}
      />

      {/* Cover Photo Viewer */}
      {showCoverViewer && (viewedProfile as any)?.cover_url && (
        <ProfilePhotoViewer
          imageUrl={(viewedProfile as any).cover_url}
          photoType="cover"
          userId={profileUserId || ''}
          username={viewedProfile?.username}
          isOwnProfile={isOwnProfile}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowCoverViewer(false)}
          onPhotoDeleted={() => {
            setViewedProfile(prev => prev ? { ...prev, cover_url: null } as Profile : null);
            if (isOwnProfile) refreshProfile();
          }}
        />
      )}

      {/* Profile Info - v2026 */}
      <div className="bg-card border-b border-border w-full max-w-full overflow-x-hidden">
        <ProfileInfoCard
          profile={viewedProfile}
          userRole={isOwnProfile ? ownUserRole : viewedUserRole}
          followersCount={followersCount}
          followingCount={followingCount}
          friendsCount={friendsCount}
          visitorsCount={visitorsCount}
          isOwnProfile={isOwnProfile}
          relationshipStatus={relationshipStatus}
          onShowVisitors={() => setShowVisitorsModal(true)}
          onShowSubscribers={() => setShowSubscribersModal(true)}
          onShowFriends={() => setShowFriendsModal(true)}
          onPartnerClick={(partnerId) => {
            window.location.href = `/?view=profile&userId=${partnerId}`;
          }}
        />

        {/* Action Buttons - v2026 */}
        <ProfileActionButtonsV2
          isOwnProfile={isOwnProfile}
          friendshipStatus={friendshipStatus}
          isIgnored={isBlocked}
          isFollowing={isFollowing}
          isAdmin={isAdmin}
          viewerRole={ownUserRole}
          targetRole={viewedUserRole}
          profileUserId={profileUserId}
          onMessage={() => {
            if (!isOwnProfile && profileUserId && onMessage) {
              if (!canMessage && !isAdmin) {
                let blockReason = 'მიმოწერა შეუძლებელია';
                if (privacySettings?.message_permission === 'nobody') {
                  blockReason = 'მიმოწერა შეუძლებელია — მომხმარებელმა შეზღუდა შეტყობინებების მიღება ყველასთვის';
                } else if (privacySettings?.message_permission === 'friends' && friendshipStatus !== 'accepted') {
                  blockReason = 'მიმოწერა შეუძლებელია — მომხმარებელს შეტყობინება მხოლოდ მეგობრებს შეუძლიათ';
                }
                toast({ 
                  title: 'მიმოწერა შეზღუდულია',
                  description: blockReason,
                  variant: 'destructive'
                });
                return;
              }
              onMessage(profileUserId);
            }
          }}
          onFriendAction={handleFriendRequest}
          onFollow={!isOwnProfile ? handleFollow : undefined}
          onIgnoreToggle={handleBlock}
          onSettings={() => setShowSettingsHub(true)}
          onSiteBlock={() => setShowBlockModal(true)}
          onGift={isOwnProfile ? () => setShowGiftsInbox(true) : () => setShowGiftPicker(true)}
          onRelationshipProposal={() => setShowRelationshipProposal(true)}
          showRelationshipButton={!isOwnProfile && !!relationshipHook.canPropose}
          isPartner={!isOwnProfile && relationshipHook.myStatus?.partner_id === profileUserId}
          onEndRelationship={() => setShowEndRelationshipDialog(true)}
        />

        {/* Gifts section removed - now integrated into action buttons */}
      </div>

      {/* Current Mood Badge */}
      {profileUserId && (
        <div className="px-4 mt-3">
          <CurrentMoodBadge userId={profileUserId} />
        </div>
      )}

      {profileUserId && (
        <div className="mt-4">
          <div className="bg-card border-y border-border">
            <ProfileActivityFeed
              userId={profileUserId}
              onUserClick={(userId) => {
                window.location.href = `/?view=profile&userId=${userId}`;
              }}
              onGroupClick={(groupId) => {
                window.location.href = `/?view=group&groupId=${groupId}`;
              }}
              canDelete={isOwnProfile || isSuperAdmin}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileVisitors 
        isOpen={showVisitorsModal} 
        onClose={() => setShowVisitorsModal(false)}
        onNavigateToProfile={(userId) => {
          setShowVisitorsModal(false);
          // Navigate to the user's profile using URL parameters
          window.location.href = `/?view=profile&userId=${userId}`;
        }}
      />

      {/* Subscribers Modal */}
      {showSubscribersModal && profileUserId && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
              <div className="flex items-center gap-4 p-4">
                <button 
                  onClick={() => setShowSubscribersModal(false)} 
                  className="p-2 hover:bg-secondary rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-semibold">Followers</h1>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ProfileSubscribers 
                userId={profileUserId} 
                onUserClick={(userId) => {
                  setShowSubscribersModal(false);
                  window.location.href = `/?view=profile&userId=${userId}`;
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {showFriendsModal && profileUserId && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
              <div className="flex items-center gap-4 p-4">
                <button 
                  onClick={() => setShowFriendsModal(false)} 
                  className="p-2 hover:bg-secondary rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-semibold">მეგობრები</h1>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ProfileFriends 
                userId={profileUserId} 
                onFriendClick={(userId) => {
                  setShowFriendsModal(false);
                  window.location.href = `/?view=profile&userId=${userId}`;
                }}
              />
            </div>
          </div>
        </div>
      )}

      {viewUserId && (
        <UserConversationsModal
          isOpen={showConversationsModal}
          onClose={() => setShowConversationsModal(false)}
          userId={viewUserId}
          username={viewedProfile?.username || 'მომხმარებელი'}
        />
      )}

      {viewUserId && (
        <BlockUserModal
          open={showBlockModal}
          onOpenChange={setShowBlockModal}
          targetUserId={viewUserId}
          targetUsername={viewedProfile?.username || 'მომხმარებელი'}
        />
      )}

      {showEditModal && (
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={viewedProfile}
          userRole={isOwnProfile ? ownUserRole : viewedUserRole}
          isOwnProfile={isOwnProfile}
          isSuperAdmin={isSuperAdmin}
          postsCount={userPosts.length}
          targetUserRole={viewedUserRole}
          onSave={async (data) => {
            if (!profileUserId) return;
            
            const { error } = await supabase
              .from('profiles')
              .update({
                username: data.username,
                gender: data.gender,
                birthday: data.birthday || null,
                city: data.city || null,
              })
              .eq('user_id', profileUserId);

            if (error) throw error;

            // Handle role change for super admin
            if (isSuperAdmin && !isOwnProfile && viewUserId && data.role) {
              if (data.role === 'user') {
                await supabase.from('user_roles').delete().eq('user_id', viewUserId);
                setViewedUserRole(null);
              } else {
                await supabase.from('user_roles').upsert({
                  user_id: viewUserId,
                  role: data.role as any
                }, { onConflict: 'user_id' });
                setViewedUserRole(data.role);
              }
            }

            setViewedProfile(prev => prev ? {
              ...prev,
              username: data.username,
              gender: data.gender,
              birthday: data.birthday,
              city: data.city
            } as Profile : null);

            if (isOwnProfile) refreshProfile();
            toast({ title: 'პროფილი განახლდა!' });
          }}
        />
      )}

      {/* Inspector Messaging View - CHEGE and P ი კ ა S ო only */}
      {showInspectorView && viewedProfile && (
        <InspectorMessagingView
          open={showInspectorView}
          onOpenChange={setShowInspectorView}
          targetUserId={profileUserId!}
          targetUsername={viewedProfile.username}
        />
      )}

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              მომხმარებლის წაშლა
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              დარწმუნებული ხართ რომ გსურთ <strong className="text-foreground">{viewedProfile?.username}</strong>-ის წაშლა?
              <br /><br />
              <span className="text-red-500 font-medium">
                ეს მოქმედება შეუქცევადია! მომხმარებლის ყველა მონაცემი სამუდამოდ წაიშლება.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  იშლება...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  წაშლა
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gift Picker Modal */}
      {profileUserId && !isOwnProfile && (
        <GiftPickerModal
          isOpen={showGiftPicker}
          onClose={() => setShowGiftPicker(false)}
          receiverUserId={profileUserId}
          receiverUsername={viewedProfile?.username || ''}
        />
      )}

      {/* Gifts Inbox */}
      {showGiftsInbox && (
        <GiftsInbox onClose={() => setShowGiftsInbox(false)} />
      )}

      {/* Relationship Proposal Modal */}
      {profileUserId && !isOwnProfile && (
        <RelationshipProposalModal
          isOpen={showRelationshipProposal}
          onClose={() => setShowRelationshipProposal(false)}
          onSend={async (status, message) => {
            const success = await relationshipHook.sendProposal(profileUserId, status, message);
            if (success) setShowRelationshipProposal(false);
            return success;
          }}
          targetUsername={viewedProfile?.username || ''}
          loading={relationshipHook.actionLoading}
        />
      )}

      {/* End Relationship Confirmation Dialog */}
      <AlertDialog open={showEndRelationshipDialog} onOpenChange={setShowEndRelationshipDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              💔 ურთიერთობის შეწყვეტა
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              ნამდვილად გსურთ ურთიერთობის შეწყვეტა <span className="font-semibold text-foreground">{viewedProfile?.username || ''}</span>-სთან? ეს ქმედება ვერ გაუქმდება.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await relationshipHook.endRelationship();
                setShowEndRelationshipDialog(false);
              }}
            >
              შეწყვეტა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ScrollArea>
  );
};

export default ProfileView;
