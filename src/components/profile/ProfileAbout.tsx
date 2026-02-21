import { useState, useEffect } from 'react';
import { 
  User, Cake, Calendar, Clock, MapPin, BarChart3, Star, Shield, 
  Heart, MessageCircle, Share2, Image, Video, Users, ThumbsUp,
  BookOpen, Music, Trophy, Eye, Bookmark, UserPlus, Play, FileText,
  Globe, Flag
} from 'lucide-react';
import { Profile } from '@/types';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import RelationshipSection from '@/components/relationship/RelationshipSection';
import SuperAdminInfo from './SuperAdminInfo';
import { isOwner } from '@/utils/ownerUtils';

// პიკასო და CHEGE-სთვის გეოლოკაციის ნახვის უფლება
const canViewGeoData = (username: string | null | undefined): boolean => {
  if (!username) return false;
  const normalized = username.replace(/\s+/g, '').toLowerCase();
  
  // CHEGE variations
  if (isOwner(username)) return true;
  
  // პიკასო variations - including mixed Latin/Georgian like "P ი კ ა S ო"
  const pikasoPatterns = [
    'პიკასო',
    'pikaso',
    'pიკაsო', // mixed
    'pიკასო', // mixed
  ];
  
  return pikasoPatterns.some(pattern => 
    normalized.toLowerCase() === pattern.toLowerCase()
  );
};

interface ProfileAboutProps {
  profile: Profile | null;
  userRole: string | null;
  postsCount: number;
}

interface ActivityStats {
  likes_given: number;
  likes_received: number;
  comments_made: number;
  comments_received: number;
  shares: number;
  photos_count: number;
  videos_count: number;
  reels_count: number;
  stories_count: number;
  friends_count: number;
  followers_count: number;
  following_count: number;
  groups_joined: number;
  saved_posts: number;
  profile_views: number;
  blogs_count: number;
  music_count: number;
  games_played: number;
  polls_created: number;
}

interface GeoLocationData {
  geo_country: string | null;
  geo_city: string | null;
  geo_region: string | null;
}

const ProfileAbout = ({ profile, userRole, postsCount }: ProfileAboutProps) => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<GeoLocationData | null>(null);
  const { user, profile: currentUserProfile } = useAuth();
  
  const isOwnProfile = user?.id === profile?.user_id;
  const showGeoData = canViewGeoData(currentUserProfile?.username);

  useEffect(() => {
    if (!profile?.user_id) return;
    fetchActivityStats();
    
    // გეოლოკაციის მონაცემები მხოლოდ CHEGE და პიკასო-სთვის
    if (showGeoData) {
      fetchGeoData();
    }
  }, [profile?.user_id, showGeoData]);

  const fetchGeoData = async () => {
    if (!profile?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('device_accounts')
        .select('geo_country, geo_city, geo_region')
        .eq('user_id', profile.user_id)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setGeoData(data as GeoLocationData);
      }
    } catch (err) {
      console.error('Error fetching geo data:', err);
    }
  };

  const fetchActivityStats = async () => {
    if (!profile?.user_id) return;
    setLoading(true);

    try {
      const userId = profile.user_id;

      // Parallel fetch all stats
      const [
        likesGivenRes,
        likesReceivedRes,
        commentsMadeRes,
        commentsReceivedRes,
        photosRes,
        videosRes,
        reelsRes,
        storiesRes,
        friendsRes,
        followersRes,
        followingRes,
        groupsRes,
        savedRes,
        profileViewsRes,
        blogsRes,
        musicRes,
        gamesRes,
        pollsRes
      ] = await Promise.all([
        // Likes given
        supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Likes received
        supabase.from('posts').select('id').eq('user_id', userId).then(async (postsRes) => {
          if (!postsRes.data?.length) return { count: 0 };
          const postIds = postsRes.data.map(p => p.id);
          return supabase.from('post_likes').select('*', { count: 'exact', head: true }).in('post_id', postIds);
        }),
        // Comments made
        supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Comments received
        supabase.from('posts').select('id').eq('user_id', userId).then(async (postsRes) => {
          if (!postsRes.data?.length) return { count: 0 };
          const postIds = postsRes.data.map(p => p.id);
          return supabase.from('post_comments').select('*', { count: 'exact', head: true }).in('post_id', postIds);
        }),
        // Photos count
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).not('image_url', 'is', null),
        // Videos count
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Reels count
        supabase.from('reels').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Stories count
        supabase.from('stories').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Friends count - fetch actual data and count (count query with .or() is unreliable)
        supabase.from('friendships').select('id')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .eq('status', 'accepted')
          .then(res => ({ count: res.data?.length || 0 })),
        // Followers count
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        // Following count
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        // Groups removed
        Promise.resolve({ count: 0 }),
        // Saved posts
        supabase.from('saved_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Profile views
        supabase.from('profile_visits').select('*', { count: 'exact', head: true }).eq('profile_user_id', userId),
        // Blogs count
        supabase.from('blogs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Music count
        supabase.from('music').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Games played
        supabase.from('game_history').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        // Polls created
        supabase.from('polls').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      ]);

      setStats({
        likes_given: likesGivenRes.count || 0,
        likes_received: (likesReceivedRes as any).count || 0,
        comments_made: commentsMadeRes.count || 0,
        comments_received: (commentsReceivedRes as any).count || 0,
        shares: 0,
        photos_count: photosRes.count || 0,
        videos_count: videosRes.count || 0,
        reels_count: reelsRes.count || 0,
        stories_count: storiesRes.count || 0,
        friends_count: friendsRes.count || 0,
        followers_count: followersRes.count || 0,
        following_count: followingRes.count || 0,
        groups_joined: groupsRes.count || 0,
        saved_posts: savedRes.count || 0,
        profile_views: profileViewsRes.count || 0,
        blogs_count: blogsRes.count || 0,
        music_count: musicRes.count || 0,
        games_played: gamesRes.count || 0,
        polls_created: pollsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'მამრობითი';
      case 'female': return 'მდედრობითი';
      default: return 'სხვა';
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'სუპერ ადმინი';
      case 'admin': return 'ადმინისტრატორი';
      case 'moderator': return 'მოდერატორი';
      default: return 'მომხმარებელი';
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'bg-red-500/20 text-red-500';
      case 'admin': return 'bg-amber-500/20 text-amber-500';
      case 'moderator': return 'bg-blue-500/20 text-blue-500';
      default: return 'bg-green-500/20 text-green-500';
    }
  };

  const getRank = (posts: number) => {
    if (posts >= 100) return { name: 'ლეგენდა', color: 'text-amber-500', bg: 'bg-amber-500/20', emoji: '👑' };
    if (posts >= 50) return { name: 'ექსპერტი', color: 'text-purple-500', bg: 'bg-purple-500/20', emoji: '💎' };
    if (posts >= 20) return { name: 'აქტიური', color: 'text-blue-500', bg: 'bg-blue-500/20', emoji: '⭐' };
    if (posts >= 5) return { name: 'მოწინავე', color: 'text-green-500', bg: 'bg-green-500/20', emoji: '🌟' };
    return { name: 'ახალბედა', color: 'text-gray-500', bg: 'bg-gray-500/20', emoji: '🔰' };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'არ არის მითითებული';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: ka });
    } catch {
      return 'არ არის მითითებული';
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'არ არის მითითებული';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: ka });
    } catch {
      return 'არ არის მითითებული';
    }
  };

  const rank = getRank(postsCount);

  // Activity stat cards
  const activityCards = [
    { icon: <Heart className="w-5 h-5 text-red-500" />, label: 'მიღებული ლაიქი', value: stats?.likes_received || 0, bg: 'bg-red-500/10' },
    { icon: <ThumbsUp className="w-5 h-5 text-blue-500" />, label: 'მიცემული ლაიქი', value: stats?.likes_given || 0, bg: 'bg-blue-500/10' },
    { icon: <MessageCircle className="w-5 h-5 text-green-500" />, label: 'მიღებული კომენტარი', value: stats?.comments_received || 0, bg: 'bg-green-500/10' },
    { icon: <MessageCircle className="w-5 h-5 text-emerald-500" />, label: 'დაწერილი კომენტარი', value: stats?.comments_made || 0, bg: 'bg-emerald-500/10' },
  ];

  const mediaCards = [
    { icon: <Image className="w-5 h-5 text-purple-500" />, label: 'ფოტოები', value: stats?.photos_count || 0, bg: 'bg-purple-500/10' },
    { icon: <Video className="w-5 h-5 text-pink-500" />, label: 'ვიდეოები', value: stats?.videos_count || 0, bg: 'bg-pink-500/10' },
    { icon: <Play className="w-5 h-5 text-orange-500" />, label: 'რილსები', value: stats?.reels_count || 0, bg: 'bg-orange-500/10' },
    { icon: <Clock className="w-5 h-5 text-cyan-500" />, label: 'სთორები', value: stats?.stories_count || 0, bg: 'bg-cyan-500/10' },
  ];

  const socialCards = [
    { icon: <Users className="w-5 h-5 text-blue-500" />, label: 'მეგობრები', value: stats?.friends_count || 0, bg: 'bg-blue-500/10' },
    { icon: <UserPlus className="w-5 h-5 text-indigo-500" />, label: 'მიმდევრები', value: stats?.followers_count || 0, bg: 'bg-indigo-500/10' },
    { icon: <UserPlus className="w-5 h-5 text-violet-500" />, label: 'გამომწერები', value: stats?.following_count || 0, bg: 'bg-violet-500/10' },
    { icon: <Users className="w-5 h-5 text-teal-500" />, label: 'ჯგუფები', value: stats?.groups_joined || 0, bg: 'bg-teal-500/10' },
  ];

  const otherCards = [
    { icon: <Bookmark className="w-5 h-5 text-yellow-500" />, label: 'შენახული', value: stats?.saved_posts || 0, bg: 'bg-yellow-500/10' },
    { icon: <Eye className="w-5 h-5 text-gray-500" />, label: 'პროფილის ნახვა', value: stats?.profile_views || 0, bg: 'bg-gray-500/10' },
    { icon: <BookOpen className="w-5 h-5 text-amber-500" />, label: 'ბლოგები', value: stats?.blogs_count || 0, bg: 'bg-amber-500/10' },
    { icon: <Music className="w-5 h-5 text-rose-500" />, label: 'მუსიკა', value: stats?.music_count || 0, bg: 'bg-rose-500/10' },
    { icon: <Trophy className="w-5 h-5 text-yellow-600" />, label: 'თამაშები', value: stats?.games_played || 0, bg: 'bg-yellow-600/10' },
    { icon: <FileText className="w-5 h-5 text-sky-500" />, label: 'გამოკითხვები', value: stats?.polls_created || 0, bg: 'bg-sky-500/10' },
  ];

  const infoItems = [
    {
      icon: <Shield className="w-5 h-5" />,
      label: 'სტატუსი საიტზე',
      value: (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(userRole)}`}>
          {getRoleLabel(userRole)}
        </span>
      ),
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: 'პოსტები',
      value: <span className="font-semibold">{postsCount} პოსტი</span>,
    },
    {
      icon: <Star className="w-5 h-5" />,
      label: 'რანგი',
      value: (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${rank.bg} ${rank.color}`}>
          {rank.emoji} {rank.name}
        </span>
      ),
    },
    {
      icon: <User className="w-5 h-5" />,
      label: 'სახელი',
      value: profile?.username || 'არ არის მითითებული',
    },
    {
      icon: <User className="w-5 h-5" />,
      label: 'ასაკი',
      value: profile?.age ? `${profile.age} წლის` : 'არ არის მითითებული',
    },
    {
      icon: <User className="w-5 h-5" />,
      label: 'სქესი',
      value: getGenderLabel(profile?.gender || 'other'),
    },
    {
      icon: <Cake className="w-5 h-5" />,
      label: 'დაბადების თარიღი',
      value: formatDate((profile as any)?.birthday),
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: 'ქალაქი',
      value: (profile as any)?.city || 'არ არის მითითებული',
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      label: 'რეგისტრაციის თარიღი',
      value: formatDateTime(profile?.created_at ?? null),
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'ბოლო ვიზიტი',
      value: formatDateTime(profile?.last_seen ?? null),
    },
  ];

  // გეოლოკაციის ინფორმაცია - მხოლოდ CHEGE და პიკასო-სთვის
  const geoItems = showGeoData ? [
    {
      icon: <Flag className="w-5 h-5 text-emerald-500" />,
      label: '🌍 ქვეყანა',
      value: geoData?.geo_country ? (
        <span className="text-emerald-400 font-medium">
          {geoData.geo_country}
        </span>
      ) : (
        <span className="text-muted-foreground italic text-sm">უცნობია (ჯერ არ შესულა)</span>
      ),
    },
    {
      icon: <Globe className="w-5 h-5 text-amber-500" />,
      label: '📍 ქალაქი (IP)',
      value: geoData?.geo_city ? (
        <span className="text-amber-400 font-medium">
          {geoData.geo_city}
          {geoData.geo_region && geoData.geo_region !== geoData.geo_city && (
            <span className="text-muted-foreground text-sm ml-2">
              ({geoData.geo_region})
            </span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground italic text-sm">უცნობია</span>
      ),
    },
  ] : [];

  const StatCard = ({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) => (
    <div className={`${bg} rounded-xl p-3 flex items-center gap-3 transition-transform hover:scale-[1.02]`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="font-bold text-lg">{value.toLocaleString()}</p>
      </div>
    </div>
  );

  const StatCardSkeleton = () => (
    <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-3 w-20 mb-1" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Relationship Status Section */}
      {profile?.user_id && (
        <RelationshipSection 
          targetUserId={profile.user_id}
          targetUsername={profile.username || 'მომხმარებელი'}
          isOwnProfile={isOwnProfile}
        />
      )}

      {/* Basic Info Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            ძირითადი ინფორმაცია
          </h2>
        </div>
        
        <div className="p-4 space-y-4">
          {infoItems.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="text-muted-foreground flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
                <span className="text-muted-foreground text-sm sm:text-base whitespace-nowrap">{item.label}:</span>
                <span className="text-foreground">{item.value}</span>
              </div>
            </div>
          ))}
          
          {/* Geolocation Info - only for CHEGE and პიკასო */}
          {geoItems.length > 0 && (
            <>
              <div className="border-t border-border/50 my-2" />
              {geoItems.map((item, index) => (
                <div key={`geo-${index}`} className="flex items-center gap-4">
                  <div className="text-muted-foreground flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
                    <span className="text-muted-foreground text-sm sm:text-base whitespace-nowrap">{item.label}:</span>
                    <span className="text-foreground">{item.value}</span>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {/* Super Admin Info - Nickname Story & IP Accounts */}
          <SuperAdminInfo targetUserId={profile?.user_id} targetUsername={profile?.username} />
        </div>
      </div>

      {/* Activity Stats Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            აქტივობა და რეაქციები
          </h2>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activityCards.map((card, index) => (
                <StatCard key={index} {...card} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Media Stats Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-500" />
            მედია კონტენტი
          </h2>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mediaCards.map((card, index) => (
                <StatCard key={index} {...card} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Social Stats Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            სოციალური კავშირები
          </h2>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {socialCards.map((card, index) => (
                <StatCard key={index} {...card} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Other Stats Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-primary/5 border-b border-border">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            დამატებითი სტატისტიკა
          </h2>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {otherCards.map((card, index) => (
                <StatCard key={index} {...card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileAbout;
