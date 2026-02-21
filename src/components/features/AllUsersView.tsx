import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, User, Crown, Search, Circle, MessageCircle, Ban, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GenderAvatar from '@/components/shared/GenderAvatar';
import CityFilterSelect from '@/components/shared/CityFilterSelect';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOnlineUsers } from '@/hooks/useOnlineStatus';
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

interface AllUsersViewProps {
  onBack: () => void;
  onUserClick: (userId: string) => void;
  onMessageClick?: (userId: string) => void;
}

interface UserWithRole {
  user_id: string;
  username: string;
  avatar_url: string | null;
  age: number;
  gender: string;
  last_seen: string | null;
  role: string | null;
  isOnline: boolean;
  isBlocked: boolean;
  city?: string | null;
  current_location?: string | null;
}

const AllUsersView = ({ onBack, onUserClick, onMessageClick }: AllUsersViewProps) => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'male' | 'female' | 'admins'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<UserWithRole | null>(null);
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  // Real counts without limit
  const [totalCount, setTotalCount] = useState(0);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  
  const { toast } = useToast();
  
  // Use centralized online users hook - SINGLE SOURCE OF TRUTH for online count
  const { totalCount: onlineCount } = useOnlineUsers({
    limit: 1,
    excludeInvisible: true
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch real counts separately (no limit)
  const fetchCounts = useCallback(async () => {
    try {
      // Total count
      const { count: total } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Male count
      const { count: males } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('gender', 'male');
      
      // Female count
      const { count: females } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('gender', 'female');
      
      // Admin count (from user_roles)
      const { count: admins } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['super_admin', 'admin', 'moderator']);
      
      setTotalCount(total || 0);
      setMaleCount(males || 0);
      setFemaleCount(females || 0);
      setAdminCount(admins || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      // Fetch profiles with pagination to get more than 1000
      let allProfiles: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, age, gender, last_seen, online_visible_until, city, current_location')
          .order('last_seen', { ascending: false, nullsFirst: false })
          .range(from, from + pageSize - 1);

        if (profilesError) throw profilesError;
        
        if (profilesData && profilesData.length > 0) {
          allProfiles = [...allProfiles, ...profilesData];
          from += pageSize;
          hasMore = profilesData.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Fetch all user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch invisible users - they should appear OFFLINE to everyone
      const { data: invisibleData } = await supabase
        .from('privacy_settings')
        .select('user_id')
        .eq('is_invisible', true);
      
      const invisibleSet = new Set(invisibleData?.map(u => u.user_id) || []);

      // Fetch user blocks
      const { data: { user } } = await supabase.auth.getUser();
      let blockedIds: string[] = [];
      
      if (user) {
        const { data: blocksData } = await supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        blockedIds = blocksData?.map(b => b.blocked_id) || [];
      }

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      
      const now = new Date();

      const usersWithRoles: UserWithRole[] = allProfiles.map(profile => {
        // Check if user is online based on online_visible_until
        // BUT if user is invisible, they appear OFFLINE
        const isInvisible = invisibleSet.has(profile.user_id);
        const onlineUntil = profile.online_visible_until ? new Date(profile.online_visible_until) : null;
        const isOnline = isInvisible ? false : (onlineUntil ? now < onlineUntil : false);
        
        return {
          user_id: profile.user_id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          age: profile.age,
          gender: profile.gender,
          last_seen: isInvisible ? null : profile.last_seen, // Hide last_seen for invisible users
          role: rolesMap.get(profile.user_id) || null,
          isOnline,
          isBlocked: blockedIds.includes(profile.user_id),
          city: profile.city,
          current_location: profile.current_location
        };
      });

      // Sort: online first, then by last_seen
      usersWithRoles.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        
        const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return bTime - aTime;
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
    fetchCounts();

    // Subscribe to realtime changes on profiles table
    const channel = supabase
      .channel('all-users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchAllUsers();
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          fetchAllUsers();
          fetchCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_blocks'
        },
        () => fetchAllUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllUsers, fetchCounts]);

  const handleBlockUser = async () => {
    if (!currentUserId || !userToBlock) return;

    try {
      if (userToBlock.isBlocked) {
        // Unblock
        await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', currentUserId)
          .eq('blocked_id', userToBlock.user_id);
        
        toast({
          title: 'მომხმარებელი განბლოკილია',
          description: `${userToBlock.username} განბლოკილია`
        });
      } else {
        // Block/Ignore
        await supabase
          .from('user_blocks')
          .insert({
            blocker_id: currentUserId,
            blocked_id: userToBlock.user_id
          });
        
        // Send notification to the ignored user
        await supabase.from('notifications').insert({
          user_id: userToBlock.user_id,
          from_user_id: currentUserId,
          type: 'ignore',
          message: 'მომხმარებელმა დაგაიგნორათ'
        });
        
        toast({
          title: 'მომხმარებელი დაბლოკილია',
          description: `${userToBlock.username} დაბლოკილია`
        });
      }
      
      fetchAllUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'შეცდომა',
        description: 'მოქმედება ვერ შესრულდა',
        variant: 'destructive'
      });
    } finally {
      setBlockDialogOpen(false);
      setUserToBlock(null);
    }
  };

  const maleUsers = users.filter(u => u.gender === 'male');
  const femaleUsers = users.filter(u => u.gender === 'female');
  const adminUsers = users.filter(u => u.role === 'super_admin' || u.role === 'admin' || u.role === 'moderator');


  const getFilteredUsers = () => {
    let filtered: UserWithRole[];
    switch (selectedTab) {
      case 'male':
        filtered = maleUsers;
        break;
      case 'female':
        filtered = femaleUsers;
        break;
      case 'admins':
        filtered = adminUsers;
        break;
      default:
        filtered = users;
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Age filtering
    const min = minAge ? parseInt(minAge) : 0;
    const max = maxAge ? parseInt(maxAge) : 999;
    filtered = filtered.filter(u => u.age >= min && u.age <= max);

    // City filtering
    if (selectedCity) {
      filtered = filtered.filter(u => u.city === selectedCity);
    }

    return filtered;
  };

  const hasActiveFilters = searchQuery || minAge || maxAge || selectedCity;

  const clearAllFilters = () => {
    setSearchQuery('');
    setMinAge('');
    setMaxAge('');
    setSelectedCity('');
  };

  const filteredUsers = getFilteredUsers();

  const tabs = [
    { id: 'all', label: 'ყველა', count: totalCount, icon: Users },
    { id: 'male', label: 'ბიჭები', count: maleCount, icon: User },
    { id: 'female', label: 'გოგონები', count: femaleCount, icon: User },
    { id: 'admins', label: 'ადმინები', count: adminCount, icon: Crown },
  ];

  const ageOptions = ['18', '20', '25', '30', '35', '40', '45', '50', '55', '60'];

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;
    
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="text-xs">სუპერ ადმინი</Badge>;
      case 'admin':
        return <Badge variant="destructive" className="text-xs">ადმინი</Badge>;
      case 'moderator':
        return <Badge variant="secondary" className="text-xs">მოდერატორი</Badge>;
      default:
        return null;
    }
  };

  const getLastSeenText = (lastSeen: string | null) => {
    if (!lastSeen) return 'არასოდეს';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'ახლა online';
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    if (diffDays < 7) return `${diffDays} დღის წინ`;
    
    return date.toLocaleDateString('ka-GE');
  };

  // Count online users from the fetched list
  const onlineUsersCount = users.filter(u => u.isOnline).length;

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      <div className="flex-none z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">მომხმარებლები</h1>
            <p className="text-sm text-muted-foreground">
              სულ {totalCount} • <span className="text-emerald-500 dark:text-emerald-400">{onlineCount} online</span>
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-4 pb-3 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="მოძებნე მეტსახელით..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Age Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">ასაკი:</span>
            <Select value={minAge} onValueChange={setMinAge}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue placeholder="დან" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                {ageOptions.map(age => (
                  <SelectItem key={age} value={age}>{age}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">-</span>
            <Select value={maxAge} onValueChange={setMaxAge}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue placeholder="მდე" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                {ageOptions.map(age => (
                  <SelectItem key={age} value={age}>{age}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ქალაქი:</span>
            <CityFilterSelect
              value={selectedCity}
              onChange={setSelectedCity}
              placeholder="აირჩიე ქალაქი"
              className="flex-1"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs w-full"
            >
              <X className="h-3 w-3 mr-1" />
              ფილტრების გასუფთავება
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent" style={{ scrollbarWidth: 'thin' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  selectedTab === tab.id 
                    ? 'bg-primary-foreground/20' 
                    : 'bg-muted-foreground/20'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users List */}
      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            მომხმარებლები ვერ მოიძებნა
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.user_id}
              onClick={() => onUserClick(user.user_id)}
              className={`flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-secondary/50 transition-colors cursor-pointer ${
                user.isBlocked ? 'opacity-60' : ''
              }`}
            >
              <div className="relative">
                <GenderAvatar 
                  src={user.avatar_url} 
                  gender={user.gender}
                  username={user.username}
                  className="w-12 h-12"
                />
                {user.isOnline && (
                  <Circle className="absolute -bottom-0.5 -right-0.5 w-4 h-4 fill-green-500 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{user.username}</p>
                  {getRoleBadge(user.role)}
                  {user.isBlocked && (
                    <Badge variant="outline" className="text-xs text-destructive border-destructive">
                      დაბლოკილი
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{user.age} წლის</span>
                  <span>•</span>
                  <span>{user.gender === 'male' ? 'კაცი' : 'ქალი'}</span>
                  <span>•</span>
                  <span className={user.isOnline ? 'text-green-500' : ''}>
                    {getLastSeenText(user.last_seen)}
                  </span>
                </p>
                {/* Current Location and City - each on separate line */}
                {user.isOnline && user.current_location && (
                  <p className="text-xs text-primary/80 mt-0.5">სად: {user.current_location}</p>
                )}
                {user.city && (
                  <p className="text-xs text-muted-foreground">ქალაქი: {user.city}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {currentUserId && currentUserId !== user.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`shrink-0 ${user.isBlocked ? 'text-destructive' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToBlock(user);
                      setBlockDialogOpen(true);
                    }}
                  >
                    <Ban className="h-5 w-5" />
                  </Button>
                )}
                {onMessageClick && !user.isBlocked && currentUserId !== user.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessageClick(user.user_id);
                    }}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      </ScrollArea>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToBlock?.isBlocked ? 'განბლოკვა' : 'დაბლოკვა'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToBlock?.isBlocked 
                ? `გსურთ ${userToBlock?.username}-ის განბლოკვა?`
                : `გსურთ ${userToBlock?.username}-ის დაბლოკვა? დაბლოკვის შემდეგ ვერ მიიღებთ მისგან შეტყობინებებს.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlockUser}
              className={userToBlock?.isBlocked ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {userToBlock?.isBlocked ? 'განბლოკვა' : 'დაბლოკვა'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AllUsersView;
