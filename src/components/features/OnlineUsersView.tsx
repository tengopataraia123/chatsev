import { useState, useEffect } from 'react';
import { ArrowLeft, Users, MessageCircle, Lock, Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnlineUsers } from '@/hooks/useOnlineStatus';
import { batchCheckMessagingStatus } from '@/hooks/useMessagingPermissions';
import { useAuth } from '@/hooks/useAuth';
import GenderAvatar from '@/components/shared/GenderAvatar';
import CityFilterSelect from '@/components/shared/CityFilterSelect';
import StyledUsername from '@/components/username/StyledUsername';

interface OnlineUsersViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
  onMessageClick?: (userId: string) => void;
}

const OnlineUsersView = ({ onBack, onUserClick, onMessageClick }: OnlineUsersViewProps) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const { user } = useAuth();
  const [messagingStatusMap, setMessagingStatusMap] = useState<Map<string, boolean>>(new Map());
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Use centralized online users hook - SINGLE SOURCE OF TRUTH
  const { users, totalCount, loading } = useOnlineUsers({
    limit: 1000, // Increased limit to show all online users
    includeRoles: true,
    excludeInvisible: true
  });

  // Batch check messaging permissions for all online users
  useEffect(() => {
    const checkMessaging = async () => {
      if (!user || users.length === 0) return;
      
      const userIds = users.map(u => u.user_id);
      const statusMap = await batchCheckMessagingStatus(userIds, user.id);
      setMessagingStatusMap(statusMap);
    };
    
    checkMessaging();
  }, [users, user]);

  const maleUsers = users.filter(u => u.gender === 'male');
  const femaleUsers = users.filter(u => u.gender === 'female');
  const adminUsers = users.filter(u => u.role === 'super_admin' || u.role === 'admin' || u.role === 'moderator');

  const ageOptions = ['18', '20', '25', '30', '35', '40', '45', '50', '55', '60'];


  const getFilteredUsers = () => {
    let filtered: typeof users;
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

    // Search by username
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

  const handleMessageClick = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    onMessageClick?.(userId);
  };

  // Check if permissions are still loading for a specific user
  const isPermissionLoading = messagingStatusMap.size === 0 && users.length > 0;

  const renderUserCard = (userItem: typeof users[0]) => {
    // CRITICAL: Default to FALSE (blocked) until we confirm they CAN message
    // This prevents the 2-3 second delay where message icon shows before lock
    const canMessage = messagingStatusMap.get(userItem.user_id) ?? false;
    
    return (
      <Card 
        key={userItem.user_id} 
        className="hover:bg-secondary/50 transition-colors cursor-pointer"
        onClick={() => onUserClick?.(userItem.user_id)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <GenderAvatar
                src={userItem.avatar_url}
                gender={userItem.gender}
                username={userItem.username}
                userId={userItem.user_id}
                className="h-12 w-12"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StyledUsername
                  userId={userItem.user_id}
                  username={userItem.username}
                  showVipBadge={true}
                  showVerifiedBadge={true}
                  className="font-medium"
                />
                {(userItem.role === 'super_admin' || userItem.role === 'admin' || userItem.role === 'moderator') && (
                  <Badge variant={userItem.role === 'super_admin' ? 'destructive' : userItem.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                    {userItem.role === 'super_admin' ? 'სუპერ ადმინი' : userItem.role === 'admin' ? 'ადმინი' : 'მოდერატორი'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {userItem.age} წლის • {userItem.gender === 'male' ? 'კაცი' : 'ქალი'}
              </p>
              {/* Current Location and City - each on separate line */}
              {userItem.current_location && (
                <p className="text-xs text-primary/80 mt-0.5">სად: {userItem.current_location}</p>
              )}
              {userItem.city && (
                <p className="text-xs text-muted-foreground">ქალაქი: {userItem.city}</p>
              )}
            </div>
            {onMessageClick && canMessage && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={(e) => handleMessageClick(e, userItem.user_id)}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            )}
            {onMessageClick && !canMessage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 text-muted-foreground/50">
                      <Lock className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>მომხმარებელს დახურული აქვს მიმოწერა</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div className="flex flex-col h-full" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex-none z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">online მომხმარებლები</h1>
            <p className="text-sm text-muted-foreground">
              სულ: <span className="text-emerald-500 dark:text-emerald-400">{totalCount}</span>
              {hasActiveFilters && ` • ნაპოვნია: ${filteredUsers.length}`}
            </p>
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">ფილტრი</span>
          </Button>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-3">
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
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="px-4 pb-3 space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Age Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">ასაკი:</span>
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
            </div>

            {/* City Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">ქალაქი:</span>
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
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="px-4 pb-3">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all" className="text-xs">
              ყველა ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="male" className="text-xs">
              ბიჭები ({maleUsers.length})
            </TabsTrigger>
            <TabsTrigger value="female" className="text-xs">
              გოგონები ({femaleUsers.length})
            </TabsTrigger>
            <TabsTrigger value="admins" className="text-xs">
              ადმინები ({adminUsers.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Users List */}
      <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{hasActiveFilters ? 'მომხმარებლები ვერ მოიძებნა' : 'online მომხმარებლები არ არიან'}</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearAllFilters} className="mt-2">
                ფილტრების გასუფთავება
              </Button>
            )}
          </div>
        ) : (
          filteredUsers.map(renderUserCard)
        )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default OnlineUsersView;
