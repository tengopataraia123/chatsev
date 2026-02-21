import { useState, useEffect } from 'react';
import { ArrowLeft, Info, Users, Ban, User, Settings2, Loader2, Shield } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AboutTab from './tabs/AboutTab';
import FriendsTab from './tabs/FriendsTab';
import BlacklistTab from './tabs/BlacklistTab';
import PersonalInfoTab from './tabs/PersonalInfoTab';
import ProfileManagementTab from './tabs/ProfileManagementTab';
import PrivacyTab from './tabs/PrivacyTab';

interface SettingsHubProps {
  onClose: () => void;
  onNavigateToProfile?: (userId: string) => void;
  viewedUserId?: string; // The profile being viewed (can be different from logged-in user)
  viewedUsername?: string; // Username of the profile being viewed
}

const SettingsHub = ({ onClose, onNavigateToProfile, viewedUserId, viewedUsername }: SettingsHubProps) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { user } = useAuth();

  // Determine which user's profile we're viewing
  const targetUserId = viewedUserId || user?.id;
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id;

  // Check if current user is super_admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsSuperAdmin(data?.role === 'super_admin');
    };
    checkSuperAdmin();
  }, [user?.id]);

  // Super admins can access privacy tab for any user
  const canAccessPrivacyTab = isOwnProfile || isSuperAdmin;

  if (!user || !targetUserId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex-none bg-background/95 backdrop-blur-lg border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold">პროფილის პარამეტრები</h2>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="flex-none border-b border-border px-2 pt-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          <TabsList className="h-auto p-1 bg-transparent gap-1 flex w-max min-w-full">
            {/* About tab - only visible to super admins */}
            {isSuperAdmin && (
              <TabsTrigger 
                value="about" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2.5 py-2 rounded-full text-[11px] sm:text-sm whitespace-nowrap min-h-[40px] flex items-center gap-1.5"
              >
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>შესახებ</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="friends" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2.5 py-2 rounded-full text-[11px] sm:text-sm whitespace-nowrap min-h-[40px] flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>მეგობრები</span>
            </TabsTrigger>
            {/* Blacklist only visible on own profile */}
            {isOwnProfile && (
              <TabsTrigger 
                value="blacklist" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2.5 py-2 rounded-full text-[11px] sm:text-sm whitespace-nowrap min-h-[40px] flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4 flex-shrink-0" />
                <span>შავი სია</span>
              </TabsTrigger>
            )}
            {/* Privacy - own profile or super admin */}
            {canAccessPrivacyTab && (
              <TabsTrigger 
                value="privacy" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2.5 py-2 rounded-full text-[11px] sm:text-sm whitespace-nowrap min-h-[40px] flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>პრივატულობა</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="personal" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2.5 py-2 rounded-full text-[11px] sm:text-sm whitespace-nowrap min-h-[40px] flex items-center gap-1.5"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span>ინფო</span>
            </TabsTrigger>
            {(isOwnProfile || isSuperAdmin) && (
              <TabsTrigger 
                value="management" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2.5 py-2 rounded-full text-[11px] sm:text-sm whitespace-nowrap min-h-[40px] flex items-center gap-1.5"
              >
                <Settings2 className="w-4 h-4 flex-shrink-0" />
                <span>მართვა</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isSuperAdmin && (
            <TabsContent value="about" className="h-full m-0 p-4">
              <AboutTab userId={targetUserId} isOwnProfile={isOwnProfile} username={viewedUsername} />
            </TabsContent>
          )}
          
          <TabsContent value="friends" className="h-full m-0 p-4">
            <FriendsTab 
              userId={targetUserId} 
              onNavigateToProfile={onNavigateToProfile}
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>
          
          {isOwnProfile && (
            <TabsContent value="blacklist" className="h-full m-0 p-4">
              <BlacklistTab userId={user.id} />
            </TabsContent>
          )}

          {canAccessPrivacyTab && (
            <TabsContent value="privacy" className="h-full m-0 p-4 pb-24">
              <PrivacyTab userId={targetUserId} isOwnProfile={isOwnProfile} isSuperAdmin={isSuperAdmin} />
            </TabsContent>
          )}
          
          <TabsContent value="personal" className="h-full m-0 p-4">
            <PersonalInfoTab userId={targetUserId} isOwnProfile={isOwnProfile} />
          </TabsContent>
          
          {(isOwnProfile || isSuperAdmin) && (
            <TabsContent value="management" className="h-full m-0 p-4 pb-24">
              <ProfileManagementTab viewedUserId={targetUserId} isOwnProfile={isOwnProfile} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default SettingsHub;
