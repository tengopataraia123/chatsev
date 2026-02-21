import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AnalyticsSummary, 
  RegistrationByDay, 
  ReferralSource, 
  IpCluster,
  UserRegistration,
  DateRangeFilter 
} from '../types';

// Helper to normalize source names
const normalizeSource = (source: string): string => {
  const s = source.toLowerCase();
  if (s.includes('google')) return 'Google';
  if (s.includes('facebook') || s.includes('fb.com')) return 'Facebook';
  if (s.includes('instagram')) return 'Instagram';
  if (s.includes('tiktok')) return 'TikTok';
  if (s.includes('telegram') || s.includes('t.me')) return 'Telegram';
  if (s.includes('twitter') || s.includes('x.com')) return 'Twitter';
  if (s.includes('whatsapp')) return 'WhatsApp';
  if (s.includes('youtube')) return 'YouTube';
  if (s === '' || s === 'direct') return 'Direct';
  return source;
};

export const useAnalytics = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [registrationsByDay, setRegistrationsByDay] = useState<RegistrationByDay[]>([]);
  const [referralSources, setReferralSources] = useState<ReferralSource[]>([]);
  const [ipClusters, setIpClusters] = useState<IpCluster[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const now = new Date();
      
      // Georgian timezone midnight (UTC+4)
      const georgianOffset = 4 * 60 * 60 * 1000;
      const nowInGeorgia = new Date(now.getTime() + georgianOffset);
      const georgianMidnight = new Date(nowInGeorgia);
      georgianMidnight.setUTCHours(0, 0, 0, 0);
      const todayStartUTC = new Date(georgianMidnight.getTime() - georgianOffset);
      
      // Time intervals
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Parallel fetches for performance
      const [
        totalResult,
        todayResult,
        sevenDayResult,
        thirtyDayResult,
        activeResult,
        onlineResult,
        maleResult,
        femaleResult,
        verifiedResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStartUTC.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', yesterday.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', tenMinutesAgo.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gender', 'male'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gender', 'female'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true)
      ]);

      setSummary({
        total_users: totalResult.count || 0,
        new_registrations_today: todayResult.count || 0,
        new_registrations_7d: sevenDayResult.count || 0,
        new_registrations_30d: thirtyDayResult.count || 0,
        active_users_24h: activeResult.count || 0,
        online_users_10m: onlineResult.count || 0,
        male_count: maleResult.count || 0,
        female_count: femaleResult.count || 0,
        verified_count: verifiedResult.count || 0,
        unverified_count: (totalResult.count || 0) - (verifiedResult.count || 0),
      });
    } catch (err) {
      console.error('Error fetching analytics summary:', err);
    }
  }, []);

  const fetchRegistrationsByDay = useCallback(async (days: number = 30) => {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Use high limit to get all registrations (default 1000 is too low)
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50000);

      if (error) throw error;

      // Group by date using database's UTC date
      // Important: Use Date object to parse and extract the UTC date components
      const getDateStr = (isoStr: string): string => {
        const d = new Date(isoStr);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Generate date range for last N days using UTC
      const generateDateRange = (daysBack: number): string[] => {
        const dates: string[] = [];
        const today = new Date();
        for (let i = daysBack - 1; i >= 0; i--) {
          const date = new Date(Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate() - i
          ));
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          dates.push(`${year}-${month}-${day}`);
        }
        return dates;
      };

      // Initialize all days with 0
      const grouped: Record<string, number> = {};
      const dateRange = generateDateRange(days);
      dateRange.forEach(dateStr => {
        grouped[dateStr] = 0;
      });

      // Count registrations per day
      (data || []).forEach(item => {
        const dateStr = getDateStr(item.created_at);
        if (grouped[dateStr] !== undefined) {
          grouped[dateStr]++;
        }
      });

      // Convert to array sorted by date
      const result = dateRange.map(date => ({
        date,
        count: grouped[date] || 0,
      }));

      console.log('Registration data (last 7 days):', result.slice(-7));
      setRegistrationsByDay(result);
    } catch (err) {
      console.error('Error fetching registrations by day:', err);
    }
  }, []);

  const fetchReferralSources = useCallback(async () => {
    try {
      // Get analytics events with referrer data
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('referrer_domain, utm_source, user_id')
        .not('referrer_domain', 'is', null);

      if (error) {
        console.log('Analytics events not available:', error);
        // Return placeholder data
        setReferralSources([
          { source: 'Direct', visits: 0, registrations: 0, conversion_rate: 0 },
          { source: 'Google', visits: 0, registrations: 0, conversion_rate: 0 },
          { source: 'Facebook', visits: 0, registrations: 0, conversion_rate: 0 },
        ]);
        return;
      }

      // Group by source
      const sourceGroups: Record<string, { visits: number; registrations: number }> = {};
      
      (events || []).forEach(event => {
        const source = event.utm_source || event.referrer_domain || 'Direct';
        const normalizedSource = normalizeSource(source);
        
        if (!sourceGroups[normalizedSource]) {
          sourceGroups[normalizedSource] = { visits: 0, registrations: 0 };
        }
        
        sourceGroups[normalizedSource].visits++;
        if (event.user_id) {
          sourceGroups[normalizedSource].registrations++;
        }
      });

      const sources: ReferralSource[] = Object.entries(sourceGroups)
        .map(([source, data]) => ({
          source,
          visits: data.visits,
          registrations: data.registrations,
          conversion_rate: data.visits > 0 
            ? Math.round((data.registrations / data.visits) * 100 * 10) / 10 
            : 0,
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      if (sources.length === 0) {
        sources.push({ source: 'Direct', visits: 0, registrations: 0, conversion_rate: 0 });
      }

      setReferralSources(sources);
    } catch (err) {
      console.error('Error fetching referral sources:', err);
    }
  }, []);

  const fetchIpClusters = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('device_accounts')
        .select('ip_address, user_id, username')
        .not('ip_address', 'is', null);

      if (error) throw error;

      // Group by IP
      const ipGroups: Record<string, { user_ids: string[], usernames: string[] }> = {};
      
      (data || []).forEach(item => {
        if (!item.ip_address) return;
        
        if (!ipGroups[item.ip_address]) {
          ipGroups[item.ip_address] = { user_ids: [], usernames: [] };
        }
        
        if (!ipGroups[item.ip_address].user_ids.includes(item.user_id)) {
          ipGroups[item.ip_address].user_ids.push(item.user_id);
          if (item.username) {
            ipGroups[item.ip_address].usernames.push(item.username);
          }
        }
      });

      // Filter IPs with 2+ accounts and sort
      const clusters: IpCluster[] = Object.entries(ipGroups)
        .filter(([_, group]) => group.user_ids.length >= 2)
        .map(([ip, group]) => ({
          ip_address: ip,
          account_count: group.user_ids.length,
          user_ids: group.user_ids,
          usernames: group.usernames,
        }))
        .sort((a, b) => b.account_count - a.account_count)
        .slice(0, 50);

      setIpClusters(clusters);
    } catch (err) {
      console.error('Error fetching IP clusters:', err);
    }
  }, []);

  const fetchUserRegistrations = useCallback(async (filter?: DateRangeFilter, search?: string) => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          username,
          gender,
          created_at,
          last_seen,
          avatar_url,
          is_verified
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply date filter
      if (filter) {
        const now = new Date();
        let startDate: Date | undefined;

        switch (filter.range) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'custom':
            if (filter.startDate) startDate = filter.startDate;
            break;
        }

        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
        if (filter.range === 'custom' && filter.endDate) {
          query = query.lte('created_at', filter.endDate.toISOString());
        }
      }

      // Apply search
      if (search) {
        query = query.ilike('username', `%${search}%`);
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      // Get device info from device_accounts
      const userIds = profiles?.map(p => p.user_id) || [];
      
      let deviceData: any[] = [];
      if (userIds.length > 0) {
        const { data: devices } = await supabase
          .from('device_accounts')
          .select('*')
          .in('user_id', userIds);
        deviceData = devices || [];
      }

      // Merge data
      const registrations: UserRegistration[] = (profiles || []).map(profile => {
        const device = deviceData.find(d => d.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          username: profile.username,
          gender: profile.gender,
          created_at: profile.created_at,
          last_seen: profile.last_seen,
          ip_address: device?.ip_address || null,
          device_type: device?.device_type || null,
          os_name: null,
          browser_name: device?.browser_name || null,
          device_model: null,
          geo_country: null,
          geo_city: null,
          referrer_domain: null,
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified || false,
        };
      });

      setUserRegistrations(registrations);
    } catch (err) {
      console.error('Error fetching user registrations:', err);
    }
  }, []);

  const searchByIp = useCallback(async (ip: string) => {
    try {
      const { data, error } = await supabase
        .from('device_accounts')
        .select(`
          user_id,
          username,
          ip_address,
          device_type,
          browser_name,
          first_seen_at,
          last_seen_at
        `)
        .eq('ip_address', ip);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error searching by IP:', err);
      return [];
    }
  }, []);

  const blockIp = useCallback(async (ip: string, reason: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('analytics_ip_blocks')
        .insert({
          ip_address: ip,
          reason,
          blocked_by: userData.user?.id
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error blocking IP:', err);
      return false;
    }
  }, []);

  const unblockIp = useCallback(async (ip: string) => {
    try {
      const { error } = await supabase
        .from('analytics_ip_blocks')
        .update({ 
          is_active: false, 
          unblocked_at: new Date().toISOString() 
        })
        .eq('ip_address', ip)
        .eq('is_active', true);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error unblocking IP:', err);
      return false;
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchSummary(),
        fetchRegistrationsByDay(30),
        fetchReferralSources(),
        fetchUserRegistrations(),
      ]);
    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchRegistrationsByDay, fetchReferralSources, fetchUserRegistrations]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    summary,
    registrationsByDay,
    referralSources,
    ipClusters,
    userRegistrations,
    loading,
    error,
    fetchSummary,
    fetchRegistrationsByDay,
    fetchReferralSources,
    fetchIpClusters,
    fetchUserRegistrations,
    searchByIp,
    blockIp,
    unblockIp,
    refresh: loadAllData,
  };
};
