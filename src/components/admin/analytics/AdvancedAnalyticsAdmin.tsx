import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  BarChart3, 
  Users, 
  Shield, 
  Globe,
  RefreshCw
} from 'lucide-react';
import { useAnalytics } from './hooks/useAnalytics';
import { AnalyticsOverview } from './AnalyticsOverview';
import { UsersRegistrationsTab } from './UsersRegistrationsTab';
import { IpSecurityTab } from './IpSecurityTab';
import { ReferralsTab } from './ReferralsTab';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AdvancedAnalyticsAdmin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { user } = useAuth();
  
  const {
    summary,
    registrationsByDay,
    referralSources,
    ipClusters,
    userRegistrations,
    loading,
    refresh,
    fetchUserRegistrations,
    searchByIp,
    blockIp,
    unblockIp,
    fetchIpClusters,
  } = useAnalytics();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setIsSuperAdmin(!!data);
    };
    checkSuperAdmin();
  }, [user?.id]);

  const handleViewProfile = (userId: string) => {
    // Navigate to user profile in admin view
    window.open(`/profile/${userId}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            სტატისტიკა / Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            დეტალური ანალიტიკა და სტატისტიკა
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          განახლება
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="overview" className="flex items-center gap-1 text-xs">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1 text-xs">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">მომხმარებლები</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 text-xs">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">IP & Security</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-1 text-xs">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Referrals</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <AnalyticsOverview
            summary={summary}
            registrationsByDay={registrationsByDay}
            referralSources={referralSources}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UsersRegistrationsTab
            registrations={userRegistrations}
            loading={loading}
            onSearch={fetchUserRegistrations}
            onViewProfile={handleViewProfile}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <IpSecurityTab
            ipClusters={ipClusters}
            loading={loading}
            onSearchByIp={searchByIp}
            onBlockIp={blockIp}
            onUnblockIp={unblockIp}
            onFetchClusters={fetchIpClusters}
            isSuperAdmin={isSuperAdmin}
          />
        </TabsContent>

        <TabsContent value="referrals" className="mt-0">
          <ReferralsTab
            referralSources={referralSources}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
