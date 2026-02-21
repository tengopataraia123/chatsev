import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  MessageSquare, 
  Shield, 
  Ban, 
  Search,
  Trash2,
  TrendingUp,
  Film,
  Edit,
  Camera,
  ArrowLeft,
  Menu,
  X,
  Activity,
  FileText,
  MessageCircle,
  Layers,
  LayoutDashboard,
  Cog,
  Zap,
  CheckCircle,
  Radio,
  AlertTriangle,
  UserPlus,
  Flag,
  FolderLock,
  MessageSquareOff,
  ChevronDown,
  ChevronRight,
  Globe,
  Palette,
  Settings,
  Wrench,
  Eye,
  Image,
  Video,
  Bell,
  Lock,
  Database,
  BarChart3,
  Heart,
  Share2,
  Gamepad2,
  Store,
  LayoutGrid,
  Clock,
  PlayCircle,
  ImageIcon,
  Users2,
  UserCog,
  ShieldCheck,
  History,
  Megaphone,
  RefreshCw,
  Trophy,
  Bug,
  Crown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { GifModuleAdmin } from './GifModuleAdmin';
import { AdminActionsLog } from './AdminActionsLog';
import { SystemBroadcast } from './SystemBroadcast';
import { AnnouncementsAdmin } from './AnnouncementsAdmin';
import { BlockedUsersView } from './BlockedUsersView';
import ReportsAdmin from './ReportsAdmin';
import { StatisticsDashboard } from './StatisticsDashboard';
import { FileControlAdmin } from './FileControlAdmin';
import { AntiAdsAdmin } from './AntiAdsAdmin';
import { CacheCleanupAdmin } from './CacheCleanupAdmin';
import { WordFilterAdmin } from './WordFilterAdmin';
import { PollModerationAdmin } from './PollModerationAdmin';
import { VideoModeration } from './VideoModeration';
import DatingAdmin from './DatingAdmin';
import RelationshipAdmin from './RelationshipAdmin';
import AppsModuleAdmin from './apps/AppsModuleAdmin';
import { IpBanAdmin } from './IpBanAdmin';
import VerificationRequestsAdmin from './VerificationRequestsAdmin';
import { DeletedUsersAdmin } from './DeletedUsersAdmin';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { AdvancedAnalyticsAdmin } from './analytics';
import { AdminRatingsLeaderboard } from './AdminRatingsLeaderboard';
import DebugPanel from './DebugPanel';
import { CloudStorageManager } from './CloudStorageManager';
import { RootControlsAdmin } from './RootControlsAdmin';
import { hasRootControls } from '@/utils/rootUtils';

interface UserWithRole {
  id: string;
  user_id: string;
  username: string;
  age: number;
  gender: string;
  avatar_url: string | null;
  created_at: string;
  last_seen: string | null;
  role?: string;
  is_banned?: boolean;
  is_muted?: boolean;
  banned_until?: string | null;
  muted_until?: string | null;
  account_status?: string;
  deactivated_at?: string | null;
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalMessages: number;
  totalStories: number;
  bannedUsers: number;
  mutedUsers: number;
  activeToday: number;
  totalGroups: number;
  totalForums: number;
  pendingFriendRequests: number;
  pendingPosts: number;
  totalVideos: number;
  totalPhotos: number;
  totalAlbums: number;
}

interface AdminPanelProps {
  onBack?: () => void;
}

type AdminSection = 
  | 'dashboard' 
  | 'users' 
  | 'users-list'
  | 'users-roles'
  | 'users-blocked'
  | 'users-deleted'
  | 'users-ipban'
  | 'history' 
  | 'ratings'
  | 'gifs' 
  | 'settings' 
  | 'settings-online'
  | 'settings-invisible'
  | 'settings-roles'
  | 'broadcast' 
  | 'reports' 
  | 'statistics' 
  | 'analytics'
  | 'filecontrol' 
  | 'antiads' 
  | 'cache' 
  | 'cloudmanager'
  | 'wordfilter'
  | 'polls'
  | 'videos'
  | 'dating'
  | 'relationships'
  | 'apps'
  | 'verification'
  | 'debug'
  | 'rootcontrols';

// Sidebar menu structure
interface MenuItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  children?: MenuItem[];
  superAdminOnly?: boolean;
  specialAccess?: boolean;
  rootOnly?: boolean;
}

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { upload: s3Upload } = useS3Upload();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [invisibleUsers, setInvisibleUsers] = useState<UserWithRole[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalMessages: 0,
    totalStories: 0,
    bannedUsers: 0,
    mutedUsers: 0,
    activeToday: 0,
    totalGroups: 0,
    totalForums: 0,
    pendingFriendRequests: 0,
    pendingPosts: 0,
    totalVideos: 0,
    totalPhotos: 0,
    totalAlbums: 0
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<AdminSection>('dashboard');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Account status filter
  const [registrationData, setRegistrationData] = useState<{date: string; count: number}[]>([]);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ username: '', age: 0, gender: 'other', avatar_url: '', cover_url: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onlineDuration, setOnlineDuration] = useState(120);
  const [groupChatOnlineDuration, setGroupChatOnlineDuration] = useState(2);
  const [savingSettings, setSavingSettings] = useState(false);
  const [usersTab, setUsersTab] = useState<'users' | 'blocked'>('users');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard']);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  // Check if current user can see File Control (by username for legacy support)
  const canSeeFileControl = currentUsername === 'CHEGE' || currentUsername === 'P ი კ ა S ო';
  
  // Check if current user is CHEGE (for debug panel access)
  const isChege = currentUsername === 'CHEGE';
  
  // Check if current user has Root Controls permission (by user_id - secure)
  const hasRoot = hasRootControls(user?.id);

  // Menu structure based on reference images
  const menuStructure: MenuItem[] = [
    { 
      id: 'dashboard', 
      label: 'დეშბორდი', 
      icon: LayoutDashboard 
    },
    {
      id: 'apps',
      label: 'აპლიკაციები',
      icon: LayoutGrid
    },
    {
      id: 'statistics',
      label: 'სტატისტიკა',
      icon: BarChart3
    },
    {
      id: 'analytics',
      label: 'Analytics (Advanced)',
      icon: TrendingUp,
      superAdminOnly: true
    },
    {
      id: 'users',
      label: 'მომხმარებლები',
      icon: Users,
      children: [
        { id: 'users-list', label: 'მომხმარებლები', icon: Users2 },
        { id: 'users-roles', label: 'როლები', icon: UserCog },
        { id: 'users-blocked', label: 'ბლოკირებულები', icon: Ban },
        { id: 'users-deleted', label: 'წაშლილები', icon: Trash2, superAdminOnly: true },
        { id: 'users-ipban', label: 'IP ბანი', icon: Globe, superAdminOnly: true },
      ]
    },
    {
      id: 'reports',
      label: 'საჩივრები',
      icon: Flag
    },
    {
      id: 'verification',
      label: 'ვერიფიკაცია',
      icon: ShieldCheck,
      superAdminOnly: true
    },
    {
      id: 'history',
      label: 'ადმინ მოქმედებები',
      icon: History,
      superAdminOnly: true
    },
    {
      id: 'ratings',
      label: 'ადმინ რეიტინგი',
      icon: Trophy,
      superAdminOnly: true
    },
    {
      id: 'gifs',
      label: 'GIF მართვა',
      icon: Film
    },
    {
      id: 'polls',
      label: 'გამოკითხვები',
      icon: BarChart3
    },
    {
      id: 'videos',
      label: 'ვიდეო მოდერაცია',
      icon: Video
    },
    {
      id: 'dating',
      label: 'გაცნობა',
      icon: Heart
    },
    {
      id: 'relationships',
      label: 'ურთიერთობები',
      icon: Heart,
      superAdminOnly: true
    },
    {
      id: 'antiads',
      label: 'ანტი-რეკლამა',
      icon: Shield
    },
    {
      id: 'wordfilter',
      label: 'სიტყვების ფილტრი',
      icon: MessageSquareOff
    },
    {
      id: 'broadcast',
      label: 'განცხადებები',
      icon: Megaphone,
      superAdminOnly: true
    },
    {
      id: 'cache',
      label: 'ქეშის გასუფთავება',
      icon: RefreshCw,
      superAdminOnly: true
    },
    {
      id: 'cloudmanager',
      label: 'Cloud Manager',
      icon: Database,
      superAdminOnly: true
    },
    {
      id: 'filecontrol',
      label: 'ფაილების კონტროლი',
      icon: FolderLock,
      specialAccess: true
    },
    {
      id: 'settings',
      label: 'პარამეტრები',
      icon: Cog,
      children: [
        { id: 'settings-online', label: 'online დრო', icon: Clock, superAdminOnly: true },
        { id: 'settings-invisible', label: 'უჩინარი მომხმარებლები', icon: Eye, superAdminOnly: true },
        { id: 'settings-roles', label: 'როლების აღწერა', icon: ShieldCheck },
      ]
    },
    // Root Controls - only for root accounts (CHEGE/PIKASO) - by user_id
    ...(hasRoot ? [{
      id: 'rootcontrols' as AdminSection,
      label: 'Root Controls',
      icon: Crown,
      rootOnly: true
    }] : []),
    // Debug panel - only for CHEGE
    ...(isChege ? [{
      id: 'debug' as AdminSection,
      label: 'Debug Panel',
      icon: Bug
    }] : [])
  ];

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchUsers();
      fetchRegistrationData();
      if (isSuperAdmin) {
        fetchInvisibleUsers();
        fetchOnlineSettings();
        fetchPendingVerificationCount();
      }
    }
  }, [isAdmin, isSuperAdmin]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [sidebarOpen]);

  const fetchPendingVerificationCount = async () => {
    const { count } = await supabase
      .from('verification_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingVerificationCount(count || 0);
  };

  // All existing functions from AdminPanel.tsx

  const fetchOnlineSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['online_duration_minutes', 'group_chat_online_minutes']);
    
    if (data) {
      data.forEach(setting => {
        if (setting.setting_key === 'online_duration_minutes') {
          setOnlineDuration(parseInt(setting.setting_value, 10) || 120);
        } else if (setting.setting_key === 'group_chat_online_minutes') {
          setGroupChatOnlineDuration(parseInt(setting.setting_value, 10) || 2);
        }
      });
    }
  };

  const handleSaveOnlineSettings = async () => {
    setSavingSettings(true);
    try {
      await Promise.all([
        supabase
          .from('site_settings')
          .update({ setting_value: onlineDuration.toString(), updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq('setting_key', 'online_duration_minutes'),
        supabase
          .from('site_settings')
          .update({ setting_value: groupChatOnlineDuration.toString(), updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq('setting_key', 'group_chat_online_minutes')
      ]);
      toast({ title: 'პარამეტრები შენახულია' });
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'პარამეტრების შენახვა ვერ მოხერხდა', variant: 'destructive' });
    }
    setSavingSettings(false);
  };

  const fetchRegistrationData = async () => {
    // Use strict UTC dates to match database timestamps
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
    
    // Fetch profiles
    // Use high limit to get all registrations (default 1000 is too low)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDateUTC.toISOString())
      .order('created_at', { ascending: false })
      .limit(50000);
    
    if (error) {
      console.error('Error fetching registration data:', error);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('No profiles found');
      return;
    }
    
    // Create a map of date -> count using UTC date extraction
    const dateCountMap = new Map<string, number>();
    
    profiles.forEach(p => {
      // Extract UTC date directly from ISO string (YYYY-MM-DD)
      const dateKey = p.created_at.split('T')[0];
      dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
    });
    
    // Generate array for last 30 days using UTC
    const countByDay: {date: string; count: number}[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const year = day.getUTCFullYear();
      const month = String(day.getUTCMonth() + 1).padStart(2, '0');
      const dayNum = String(day.getUTCDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayNum}`;
      
      // Format for display
      const displayDate = `${dayNum} ${getGeorgianMonth(day.getUTCMonth())}`;
      countByDay.push({
        date: displayDate,
        count: dateCountMap.get(dateKey) || 0
      });
    }
    
    console.log('Registration data (last 7 days):', countByDay.slice(-7));
    setRegistrationData(countByDay);
  };

  // Georgian month names helper
  const getGeorgianMonth = (monthIndex: number): string => {
    const months = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
    return months[monthIndex];
  };

  const handleEditUser = async (userItem: UserWithRole) => {
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userItem.user_id)
      .single();
    
    setEditingUser(userItem);
    setEditForm({ 
      username: userItem.username, 
      age: userItem.age, 
      gender: userItem.gender || 'other',
      avatar_url: fullProfile?.avatar_url || '',
      cover_url: fullProfile?.cover_url || ''
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !editingUser) return;
    
    setUploadingAvatar(true);
    const file = e.target.files[0];
    
    try {
      const result = await s3Upload(file, S3_FOLDERS.AVATARS);
      
      if (!result) throw new Error('Upload failed');
      
      setEditForm(prev => ({ ...prev, avatar_url: result.url }));
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'ავატარის ატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !editingUser) return;
    
    setUploadingCover(true);
    const file = e.target.files[0];
    
    try {
      const result = await s3Upload(file, S3_FOLDERS.COVERS);
      
      if (!result) throw new Error('Upload failed');
      
      setEditForm(prev => ({ ...prev, cover_url: result.url }));
    } catch (error) {
      toast({ title: 'შეცდომა', description: 'ფონის ატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        username: editForm.username,
        age: editForm.age,
        gender: editForm.gender,
        avatar_url: editForm.avatar_url || null,
        cover_url: editForm.cover_url || null
      })
      .eq('user_id', editingUser.user_id);
    
    if (error) {
      toast({ title: 'შეცდომა', description: 'მომხმარებლის განახლება ვერ მოხერხდა', variant: 'destructive' });
    } else {
      toast({ title: 'მომხმარებელი განახლდა' });
      fetchUsers();
    }
    setEditingUser(null);
  };

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();
    
    if (profileData) {
      setCurrentUsername(profileData.username);
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin', 'moderator'])
      .maybeSingle();

    if (!error && data) {
      setIsAdmin(true);
      if (data.role === 'super_admin') {
        setIsSuperAdmin(true);
      }
    }
    setLoading(false);
  };

  const fetchInvisibleUsers = async () => {
    const { data: privacyData } = await supabase
      .from('privacy_settings')
      .select('user_id')
      .eq('is_invisible', true);
    
    if (!privacyData || privacyData.length === 0) {
      setInvisibleUsers([]);
      return;
    }
    
    const invisibleUserIds = privacyData.map(p => p.user_id);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', invisibleUserIds);
    
    if (profiles) {
      setInvisibleUsers(profiles as UserWithRole[]);
    }
  };

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersRes, postsRes, messagesRes, storiesRes, bannedRes, mutedRes, activeRes, groupsRes, forumsRes, friendReqRes, pendingPostsRes, videosRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('group_chat_messages').select('id', { count: 'exact', head: true }),
      supabase.from('stories').select('id', { count: 'exact', head: true }),
      supabase.from('user_chat_status').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      supabase.from('user_chat_status').select('id', { count: 'exact', head: true }).eq('is_muted', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', today.toISOString()),
      Promise.resolve({ count: 0 }),
      supabase.from('forums').select('id', { count: 'exact', head: true }),
      supabase.from('friendships').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('reels').select('id', { count: 'exact', head: true })
    ]);

    // Get photo count from posts with image_url
    const { count: photosCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .not('image_url', 'is', null);

    setStats({
      totalUsers: usersRes.count || 0,
      totalPosts: postsRes.count || 0,
      totalMessages: messagesRes.count || 0,
      totalStories: storiesRes.count || 0,
      bannedUsers: bannedRes.count || 0,
      mutedUsers: mutedRes.count || 0,
      activeToday: activeRes.count || 0,
      totalGroups: groupsRes.count || 0,
      totalForums: forumsRes.count || 0,
      pendingFriendRequests: friendReqRes.count || 0,
      pendingPosts: pendingPostsRes.count || 0,
      totalVideos: videosRes.count || 0,
      totalPhotos: photosCount || 0,
      totalAlbums: 0
    });
  };

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !profiles) return;

    // Fetch ALL roles for users (not just one)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['super_admin', 'admin', 'moderator']);

    const { data: chatStatus } = await supabase
      .from('user_chat_status')
      .select('user_id, is_banned, is_muted, banned_until, muted_until');

    // Create a map of user_id -> highest role
    const roleMap = new Map<string, string>();
    (roles || []).forEach(r => {
      const existing = roleMap.get(r.user_id);
      // Priority: super_admin > admin > moderator
      if (!existing) {
        roleMap.set(r.user_id, r.role);
      } else if (r.role === 'super_admin') {
        roleMap.set(r.user_id, 'super_admin');
      } else if (r.role === 'admin' && existing !== 'super_admin') {
        roleMap.set(r.user_id, 'admin');
      }
    });

    const usersWithRoles = profiles.map(profile => {
      const userRole = roleMap.get(profile.user_id);
      const userStatus = chatStatus?.find(s => s.user_id === profile.user_id);
      return {
        ...profile,
        role: userRole || 'user',
        is_banned: userStatus?.is_banned || false,
        is_muted: userStatus?.is_muted || false,
        banned_until: userStatus?.banned_until,
        muted_until: userStatus?.muted_until
      };
    });

    setUsers(usersWithRoles);
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const { data: existing } = await supabase
        .from('user_chat_status')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('user_chat_status')
          .update({ 
            is_banned: ban, 
            banned_by: ban ? user?.id : null,
            banned_until: ban ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_chat_status')
          .insert({ 
            user_id: userId, 
            is_banned: ban,
            banned_by: ban ? user?.id : null,
            banned_until: ban ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          });
        error = result.error;
      }

      if (error) {
        console.error('Error banning user:', error);
        toast({ title: 'შეცდომა', description: 'ბანის ცვლილება ვერ მოხერხდა', variant: 'destructive' });
        return;
      }

      toast({ title: ban ? 'მომხმარებელი დაიბანა' : 'ბანი მოიხსნა' });
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleMuteUser = async (userId: string, mute: boolean) => {
    try {
      const { data: existing } = await supabase
        .from('user_chat_status')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('user_chat_status')
          .update({ 
            is_muted: mute,
            muted_by: mute ? user?.id : null,
            muted_until: mute ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        error = result.error;
      } else {
        const result = await supabase
          .from('user_chat_status')
          .insert({ 
            user_id: userId, 
            is_muted: mute,
            muted_by: mute ? user?.id : null,
            muted_until: mute ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          });
        error = result.error;
      }

      if (error) {
        console.error('Error muting user:', error);
        toast({ title: 'შეცდომა', description: 'მიუტის ცვლილება ვერ მოხერხდა', variant: 'destructive' });
        return;
      }

      toast({ title: mute ? 'მომხმარებელი დამიუტდა' : 'მიუტი მოიხსნა' });
      fetchUsers();
    } catch (error) {
      console.error('Error muting user:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const handleSetRole = async (userId: string, role: 'super_admin' | 'admin' | 'moderator' | 'user') => {
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (role === 'user') {
        await supabase.from('user_roles').delete().eq('user_id', userId);
      } else {
        await supabase.from('user_roles').update({ role }).eq('user_id', userId);
      }
    } else if (role !== 'user') {
      await supabase.from('user_roles').insert({ user_id: userId, role });
    }

    toast({ title: 'როლი განახლდა' });
    fetchUsers();
  };

  const handleDeleteUserPosts = async (userId: string) => {
    if (!confirm('ნამდვილად გინდათ ამ მომხმარებლის ყველა პოსტის წაშლა?')) return;
    await supabase.from('posts').delete().eq('user_id', userId);
    toast({ title: 'პოსტები წაიშალა' });
    fetchStats();
  };

  const handleClearGroupChat = async () => {
    if (!confirm('ნამდვილად გინდათ ჯგუფური ჩატის ყველა შეტყობინების წაშლა?')) return;
    await supabase.from('group_chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    toast({ title: 'ჯგუფური ჩატი გასუფთავდა' });
    fetchStats();
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && u.account_status !== 'deactivated') ||
      (statusFilter === 'deactivated' && u.account_status === 'deactivated');
    return matchesSearch && matchesRole && matchesStatus;
  });

  const shouldShowMenuItem = (item: MenuItem): boolean => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.specialAccess && !canSeeFileControl) return false;
    return true;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 bg-background">
        <Shield className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-bold">წვდომა აკრძალულია</h2>
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          უკან
        </Button>
      </div>
    );
  }

  // Render sidebar menu item
  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    if (!shouldShowMenuItem(item)) return null;
    
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);
    const isActive = selectedSection === item.id || (item.children?.some(c => c.id === selectedSection));
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleSection(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors min-h-[44px]",
              "hover:bg-accent/50",
              isActive && "bg-accent text-accent-foreground font-medium"
            )}
            style={{ paddingLeft: `${12 + level * 14}px` }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-0.5 space-y-0.5">
              {item.children!.filter(shouldShowMenuItem).map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    const badgeCount = item.id === 'verification' ? pendingVerificationCount : 0;

    return (
      <button
        key={item.id}
        onClick={() => {
          setSelectedSection(item.id);
          setSidebarOpen(false);
          if (item.id === 'verification') {
            fetchPendingVerificationCount();
          }
        }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors min-h-[44px]",
          "hover:bg-accent/50",
          selectedSection === item.id && "bg-primary text-primary-foreground font-medium"
        )}
        style={{ paddingLeft: `${12 + level * 14}px` }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {badgeCount > 0 && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs font-medium">
            {badgeCount}
          </Badge>
        )}
      </button>
    );
  };

  // Dashboard content
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Chart Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              რეგისტრაციები (30 დღე)
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{format(subDays(new Date(), 29), 'dd MMM')} - {format(new Date(), 'dd MMM')}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-primary/10 rounded-xl shrink-0">
              <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold truncate">{formatNumber(stats.totalVideos)}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">ვიდეოები</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-blue-500/10 rounded-xl shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold truncate">{formatNumber(stats.totalUsers)}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">მომხმარებლები</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-green-500/10 rounded-xl shrink-0">
              <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold truncate">{formatNumber(stats.totalPhotos)}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">ფოტოები</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-purple-500/10 rounded-xl shrink-0">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold truncate">{formatNumber(stats.totalStories)}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">სთორიები</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Left Column - Recent Logins */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                უახლესი ადმინ შესვლები
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {users
                  .filter(u => u.role && u.role !== 'user')
                  .sort((a, b) => {
                    // Sort by last_seen descending (most recent first)
                    const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
                    const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
                    return bTime - aTime;
                  })
                  .slice(0, 10)
                  .map(adminUser => (
                    <div key={adminUser.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={adminUser.avatar_url || ''} />
                        <AvatarFallback>{adminUser.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{adminUser.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {adminUser.last_seen 
                            ? `ბოლო შესვლა: ${format(new Date(adminUser.last_seen), 'dd MMM, HH:mm')}`
                            : 'არასდროს'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {adminUser.role === 'super_admin' ? 'სუპერ' : adminUser.role === 'admin' ? 'ადმინი' : 'მოდი'}
                      </Badge>
                    </div>
                  ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Site Statistics */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">საიტის სტატისტიკა</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-xs sm:text-sm text-muted-foreground truncate mr-2">online მომხმარებლები</span>
                <span className="font-semibold text-primary shrink-0">{stats.activeToday}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-xs sm:text-sm text-muted-foreground truncate mr-2">დაბანილი</span>
                <span className="font-semibold text-destructive shrink-0">{stats.bannedUsers}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-xs sm:text-sm text-muted-foreground truncate mr-2">დამიუტებული</span>
                <span className="font-semibold text-yellow-600 shrink-0">{stats.mutedUsers}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-xs sm:text-sm text-muted-foreground truncate mr-2">პოსტები</span>
                <span className="font-semibold shrink-0">{stats.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-xs sm:text-sm text-muted-foreground truncate mr-2">შეტყობინებები</span>
                <span className="font-semibold shrink-0">{stats.totalMessages}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs sm:text-sm text-muted-foreground truncate mr-2">ჯგუფები</span>
                <span className="font-semibold shrink-0">{stats.totalGroups}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">აქტივობის სტატისტიკა</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-sm text-muted-foreground">ფოტოები</span>
                <span className="font-semibold">{stats.totalPhotos}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">ვიდეოები</span>
                <span className="font-semibold">{stats.totalVideos}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Users section
  const renderUsers = () => (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ძებნა..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <select
          className="border rounded-lg px-1.5 text-[11px] sm:text-xs bg-background h-9 max-w-[90px] sm:max-w-none"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">ყველა როლი</option>
          <option value="user">მომხმარებელი</option>
          <option value="moderator">მოდერატორი</option>
          <option value="admin">ადმინი</option>
          <option value="super_admin">სუპერ</option>
        </select>
        <select
          className="border rounded-lg px-1.5 text-[11px] sm:text-xs bg-background h-9 max-w-[90px] sm:max-w-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">სტატუსი</option>
          <option value="active">აქტიური</option>
          <option value="deactivated">დეაქტივ.</option>
        </select>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-2">
          {filteredUsers.map(userItem => (
            <div key={userItem.id} className={cn(
              "flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50",
              userItem.account_status === 'deactivated' && "opacity-60 bg-muted/30"
            )}>
              <Avatar className="h-9 w-9">
                <AvatarImage src={userItem.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{userItem.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-medium text-sm truncate">{userItem.username}</p>
                  {userItem.role !== 'user' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {userItem.role === 'super_admin' ? 'S' : userItem.role === 'admin' ? 'A' : 'M'}
                    </Badge>
                  )}
                  {userItem.account_status === 'deactivated' && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-orange-500/20 text-orange-600">
                      დეაქტივ.
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {userItem.age}წ • {format(new Date(userItem.created_at), 'dd.MM.yy')}
                  {userItem.deactivated_at && ` • დეაქტ: ${format(new Date(userItem.deactivated_at), 'dd.MM.yy')}`}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditUser(userItem)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className={cn("h-8 w-8", userItem.is_banned && "text-destructive")}
                  onClick={() => handleBanUser(userItem.user_id, !userItem.is_banned)}
                >
                  <Ban className="h-3.5 w-3.5" />
                </Button>
                <select 
                  className="text-[10px] border rounded px-0.5 py-0.5 bg-background h-7 w-[52px]"
                  value={userItem.role || 'user'}
                  onChange={(e) => handleSetRole(userItem.user_id, e.target.value as any)}
                >
                  <option value="user">User</option>
                  <option value="moderator">Mod</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // Settings sections
  const renderOnlineSettings = () => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Activity className="h-5 w-5 text-green-500" />
          </div>
          <span className="font-semibold">online დროის პარამეტრები</span>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">საიტზე online დრო (წუთებში)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input 
                type="text"
                inputMode="numeric"
                value={onlineDuration === 0 ? '' : onlineDuration.toString()} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setOnlineDuration(0);
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num >= 0 && num <= 1440) {
                      setOnlineDuration(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  const num = parseInt(e.target.value);
                  if (isNaN(num) || num < 1) {
                    setOnlineDuration(1);
                  }
                }}
                className="h-9 text-sm w-28"
              />
              <span className="text-xs text-muted-foreground">
                ({Math.floor(onlineDuration / 60)} სთ {onlineDuration % 60} წთ)
              </span>
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">ჯგუფური ჩატის online დრო (წუთებში)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input 
                type="text"
                inputMode="numeric"
                value={groupChatOnlineDuration === 0 ? '' : groupChatOnlineDuration.toString()} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setGroupChatOnlineDuration(0);
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num >= 0 && num <= 1440) {
                      setGroupChatOnlineDuration(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  const num = parseInt(e.target.value);
                  if (isNaN(num) || num < 1) {
                    setGroupChatOnlineDuration(1);
                  }
                }}
                className="h-9 text-sm w-28"
              />
              <span className="text-xs text-muted-foreground">
                ({groupChatOnlineDuration} წუთი)
              </span>
            </div>
          </div>
          <Button 
            className="w-full"
            onClick={handleSaveOnlineSettings}
            disabled={savingSettings}
          >
            {savingSettings ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            შენახვა
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderInvisibleUsers = () => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Eye className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <span className="font-semibold">უჩინარი მომხმარებლები</span>
            <Badge variant="secondary" className="ml-2">{invisibleUsers.length}</Badge>
          </div>
        </div>
        {invisibleUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            უჩინარ რეჟიმში არავინ არ არის
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {invisibleUsers.map(u => (
                <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url || ''} />
                    <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.gender === 'male' ? 'კაცი' : u.gender === 'female' ? 'ქალი' : 'სხვა'}, {u.age} წლის
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/20 text-purple-500">
                    უჩინარი
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );

  const renderRolesInfo = () => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">როლების აღწერა</span>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <p className="font-medium text-sm">სუპერ ადმინი</p>
            <p className="text-xs text-muted-foreground">სრული წვდომა ყველა ფუნქციაზე</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="font-medium text-sm">ადმინი</p>
            <p className="text-xs text-muted-foreground">მომხმარებლების მართვა და მოდერაცია</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="font-medium text-sm">მოდერატორი</p>
            <p className="text-xs text-muted-foreground">კონტენტის მოდერაცია</p>
          </div>
          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="font-medium text-sm">მომხმარებელი</p>
            <p className="text-xs text-muted-foreground">სტანდარტული წვდომა</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Get current section title
  const getCurrentSectionTitle = () => {
    for (const item of menuStructure) {
      if (item.id === selectedSection) return item.label;
      if (item.children) {
        for (const child of item.children) {
          if (child.id === selectedSection) return child.label;
        }
      }
    }
    return 'ადმინ პანელი';
  };

  return (
    <div className="flex flex-col md:flex-row bg-background h-[100dvh] w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card shrink-0 h-screen sticky top-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AdminCP</span>
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {menuStructure.map(item => renderMenuItem(item))}
          </nav>
        </ScrollArea>
        <div className="p-3 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={onBack || (() => window.location.href = '/')}
          >
            <ArrowLeft className="h-4 w-4" />
            უკან დაბრუნება
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden h-14 border-b border-border bg-card px-2 flex items-center justify-between shrink-0 sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm truncate">{getCurrentSectionTitle()}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onBack || (() => window.location.href = '/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 flex md:hidden"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside 
            className="relative w-[72vw] max-w-72 bg-card border-r border-border flex flex-col h-[100dvh]"
            style={{ overscrollBehavior: 'contain' }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold">AdminCP</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ScrollArea 
              className="flex-1 min-h-0"
              style={{ overscrollBehavior: 'contain' }}
            >
              <nav className="space-y-1 p-2 pb-24">
                {menuStructure.map(item => renderMenuItem(item))}
              </nav>
            </ScrollArea>
          </aside>
        </div>
      )}

      {/* Main Content - full mobile scroll */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ 
          WebkitOverflowScrolling: 'touch', 
          overscrollBehavior: 'contain',
          touchAction: 'pan-y'
        }}
      >
        <main className="p-3 sm:p-4 md:p-6 pb-40">
        {selectedSection === 'dashboard' && renderDashboard()}
        {selectedSection === 'apps' && <AppsModuleAdmin onBack={() => setSelectedSection('dashboard')} />}
        {selectedSection === 'statistics' && <StatisticsDashboard />}
        {selectedSection === 'analytics' && isSuperAdmin && <AdvancedAnalyticsAdmin />}
        {(selectedSection === 'users' || selectedSection === 'users-list') && renderUsers()}
        {selectedSection === 'users-roles' && renderRolesInfo()}
        {selectedSection === 'users-blocked' && <BlockedUsersView />}
        {selectedSection === 'users-ipban' && isSuperAdmin && <IpBanAdmin />}
        {selectedSection === 'users-deleted' && isSuperAdmin && <DeletedUsersAdmin />}
        {selectedSection === 'reports' && <ReportsAdmin />}
        {selectedSection === 'history' && isSuperAdmin && <AdminActionsLog />}
        {selectedSection === 'ratings' && isSuperAdmin && <AdminRatingsLeaderboard />}
        {selectedSection === 'gifs' && <GifModuleAdmin />}
        {selectedSection === 'polls' && <PollModerationAdmin onBack={() => setSelectedSection('dashboard')} />}
        {selectedSection === 'videos' && <VideoModeration />}
        {selectedSection === 'broadcast' && isSuperAdmin && <AnnouncementsAdmin />}
        {selectedSection === 'cache' && isSuperAdmin && <CacheCleanupAdmin />}
        {selectedSection === 'cloudmanager' && isSuperAdmin && <CloudStorageManager />}
        {selectedSection === 'filecontrol' && canSeeFileControl && <FileControlAdmin />}
        {selectedSection === 'antiads' && <AntiAdsAdmin />}
        {selectedSection === 'wordfilter' && <WordFilterAdmin />}
        {selectedSection === 'dating' && <DatingAdmin onBack={() => setSelectedSection('dashboard')} />}
        {selectedSection === 'relationships' && isSuperAdmin && <RelationshipAdmin onBack={() => setSelectedSection('dashboard')} />}
        {selectedSection === 'verification' && isSuperAdmin && <VerificationRequestsAdmin />}
        {selectedSection === 'settings' && renderRolesInfo()}
        {selectedSection === 'settings-online' && isSuperAdmin && renderOnlineSettings()}
        {selectedSection === 'settings-invisible' && isSuperAdmin && renderInvisibleUsers()}
        {selectedSection === 'settings-roles' && renderRolesInfo()}
        {selectedSection === 'debug' && isChege && <DebugPanel />}
        {selectedSection === 'rootcontrols' && hasRoot && <RootControlsAdmin />}
        </main>
      </div>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">მომხმარებლის რედაქტირება</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative h-20 bg-muted rounded-lg overflow-hidden">
              {editForm.cover_url && (
                <img src={editForm.cover_url} alt="Cover" className="w-full h-full object-cover" />
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-5 w-5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </label>
              {uploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center -mt-8">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-background">
                  <AvatarImage src={editForm.avatar_url} />
                  <AvatarFallback>{editForm.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="h-4 w-4 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label className="text-xs">სახელი</Label>
                <Input 
                  value={editForm.username} 
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">ასაკი</Label>
                  <Input 
                    type="number" 
                    value={editForm.age} 
                    onChange={(e) => setEditForm({...editForm, age: parseInt(e.target.value) || 0})}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">სქესი</Label>
                  <select 
                    className="w-full border rounded-md px-2 h-9 text-sm bg-background"
                    value={editForm.gender}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                  >
                    <option value="male">კაცი</option>
                    <option value="female">ქალი</option>
                    <option value="other">სხვა</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingUser(null)}>
                გაუქმება
              </Button>
              <Button className="flex-1" onClick={handleSaveUser}>
                შენახვა
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
