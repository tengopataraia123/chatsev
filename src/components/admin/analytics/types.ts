export interface AnalyticsSummary {
  total_users: number;
  new_registrations_today: number;
  new_registrations_7d: number;
  new_registrations_30d: number;
  active_users_24h: number;
  online_users_10m: number;
  male_count: number;
  female_count: number;
  verified_count: number;
  unverified_count: number;
}

export interface RegistrationByDay {
  date: string;
  count: number;
}

export interface ReferralSource {
  source: string;
  visits: number;
  registrations: number;
  conversion_rate: number;
}

export interface IpCluster {
  ip_address: string;
  account_count: number;
  user_ids: string[];
  usernames: string[];
}

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  event_type: string;
  registered_at: string | null;
  last_login_at: string | null;
  registration_ip: string | null;
  last_login_ip: string | null;
  user_agent_raw: string | null;
  device_type: string | null;
  os_name: string | null;
  browser_name: string | null;
  device_model: string | null;
  geo_country: string | null;
  geo_city: string | null;
  referrer_domain: string | null;
  referrer_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  first_landing_path: string | null;
  created_at: string;
}

export interface UserRegistration {
  user_id: string;
  username: string | null;
  gender: string | null;
  created_at: string;
  last_seen: string | null;
  ip_address: string | null;
  device_type: string | null;
  os_name: string | null;
  browser_name: string | null;
  device_model: string | null;
  geo_country: string | null;
  geo_city: string | null;
  referrer_domain: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export type DateRange = 'today' | '7d' | '30d' | 'custom';

export interface DateRangeFilter {
  range: DateRange;
  startDate?: Date;
  endDate?: Date;
}
