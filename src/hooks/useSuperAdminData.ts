import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UsernameHistory {
  id: string;
  old_username: string;
  new_username: string;
  changed_at: string;
}

interface DeviceAccount {
  id: string;
  device_fingerprint: string;
  user_id: string;
  username: string | null;
  first_seen_at: string;
  last_seen_at: string;
  ip_address: string | null;
  browser_name: string | null;
  device_type: string | null;
}

interface DeviceGroup {
  fingerprint: string;
  accounts: DeviceAccount[];
}

interface TargetUserDevice {
  ip_address: string | null;
  browser_name: string | null;
  device_type: string | null;
  last_seen_at: string;
  geo_country: string | null;
  geo_city: string | null;
  geo_region: string | null;
}

export const useSuperAdminData = (targetUserId: string | undefined) => {
  const { userRole } = useAuth();
  const [usernameHistory, setUsernameHistory] = useState<UsernameHistory[]>([]);
  const [deviceAccounts, setDeviceAccounts] = useState<DeviceGroup[]>([]);
  const [targetUserDevices, setTargetUserDevices] = useState<TargetUserDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';

  const fetchData = useCallback(async () => {
    if (!isSuperAdmin || !targetUserId) return;

    setLoading(true);
    try {
      // Fetch username history for this user
      const { data: historyData, error: historyError } = await supabase
        .from('username_history')
        .select('*')
        .eq('user_id', targetUserId)
        .order('changed_at', { ascending: false });

      if (historyError) {
        console.error('[SuperAdminData] Username history error:', historyError);
      } else {
        setUsernameHistory(historyData || []);
      }

      // First get all device info for this user (including their own devices)
      const { data: userDevices, error: deviceError } = await supabase
        .from('device_accounts')
        .select('*')
        .eq('user_id', targetUserId)
        .order('last_seen_at', { ascending: false });

      if (deviceError) {
        console.error('[SuperAdminData] Device accounts error:', deviceError);
      } else if (userDevices && userDevices.length > 0) {
        // Store target user's own device info
        setTargetUserDevices(userDevices.map(d => ({
          ip_address: d.ip_address,
          browser_name: d.browser_name,
          device_type: d.device_type,
          last_seen_at: d.last_seen_at,
          geo_country: (d as any).geo_country || null,
          geo_city: (d as any).geo_city || null,
          geo_region: (d as any).geo_region || null,
        })));

        // Get fingerprints and IPs
        const fingerprints = userDevices.map(d => d.device_fingerprint);
        const ips = userDevices.map(d => d.ip_address).filter(Boolean);
        
        // Get all accounts that used these devices OR same IP addresses
        const { data: allDeviceAccounts, error: allDevicesError } = await supabase
          .from('device_accounts')
          .select('*')
          .or(`device_fingerprint.in.(${fingerprints.map(f => `"${f}"`).join(',')}),ip_address.in.(${ips.map(i => `"${i}"`).join(',')})`)
          .order('last_seen_at', { ascending: false });

        if (allDevicesError) {
          console.error('[SuperAdminData] All device accounts error:', allDevicesError);
        } else if (allDeviceAccounts) {
          // Group by IP address (more reliable across browsers)
          const groupedByIp = allDeviceAccounts.reduce((acc, account) => {
            const key = account.ip_address || account.device_fingerprint;
            if (!acc[key]) {
              acc[key] = [];
            }
            // Avoid duplicate user entries
            if (!acc[key].some(a => a.user_id === account.user_id)) {
              acc[key].push(account);
            }
            return acc;
          }, {} as Record<string, DeviceAccount[]>);

          // Only show groups where there are OTHER users besides the target
          const deviceGroups: DeviceGroup[] = Object.entries(groupedByIp)
            .filter(([_, accounts]) => accounts.some(a => a.user_id !== targetUserId))
            .map(([fingerprint, accounts]) => ({
              fingerprint,
              accounts: accounts.filter(a => a.user_id !== targetUserId), // Show only OTHER accounts
            }));

          setDeviceAccounts(deviceGroups);
        }
      } else {
        setTargetUserDevices([]);
      }
    } catch (err) {
      console.error('[SuperAdminData] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, targetUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    isSuperAdmin,
    usernameHistory,
    deviceAccounts,
    targetUserDevices,
    loading,
    refetch: fetchData,
  };
};

export default useSuperAdminData;
