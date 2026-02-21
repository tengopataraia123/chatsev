import { useState, useEffect, forwardRef } from 'react';
import { 
  X, Check, Ban, User, Globe, Monitor, Clock, 
  Link2, AlertTriangle, Smartphone, Laptop, Users,
  MapPin, ExternalLink, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RegistrationData {
  id: string;
  user_id: string;
  username: string;
  age: number;
  gender: string;
  avatar_url?: string;
  ip_address: string | null;
  created_at: string;
  city?: string;
}

interface DeviceAccount {
  user_id: string;
  username: string | null;
  ip_address: string | null;
  browser_name: string | null;
  device_type: string | null;
  device_fingerprint: string;
  last_seen_at: string;
}

interface AnalyticsInfo {
  user_agent_raw: string | null;
  browser_name: string | null;
  device_type: string | null;
  os_name: string | null;
  referrer_url: string | null;
  referrer_domain: string | null;
  geo_country: string | null;
  geo_city: string | null;
}

interface RegistrationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RegistrationData;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  pendingCount?: number;
}

const RegistrationDetailsModal = ({
  isOpen,
  onClose,
  registration,
  onApprove,
  onReject,
  pendingCount = 0,
}: RegistrationDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [sameBrowserUsers, setSameBrowserUsers] = useState<DeviceAccount[]>([]);
  const [sameIpUsers, setSameIpUsers] = useState<DeviceAccount[]>([]);
  const [analyticsInfo, setAnalyticsInfo] = useState<AnalyticsInfo | null>(null);
  const [showSameBrowser, setShowSameBrowser] = useState(true);
  const [showSameIp, setShowSameIp] = useState(true);
  const [bannedLinkedUsers, setBannedLinkedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && registration) {
      fetchDeviceAccounts();
      fetchAnalytics();
    }
  }, [isOpen, registration]);

  const fetchDeviceAccounts = async () => {
    // Get current user's device fingerprints
    const { data: userDevices } = await supabase
      .from('device_accounts')
      .select('*')
      .eq('user_id', registration.user_id);

    if (!userDevices || userDevices.length === 0) return;

    const fingerprints = userDevices.map(d => d.device_fingerprint);
    const ips = userDevices.map(d => d.ip_address).filter(Boolean) as string[];

    let allLinkedUserIds: string[] = [];

    // Find users with same device fingerprint (same browser)
    if (fingerprints.length > 0) {
      const { data: sameBrowser } = await supabase
        .from('device_accounts')
        .select('*')
        .in('device_fingerprint', fingerprints)
        .neq('user_id', registration.user_id)
        .order('last_seen_at', { ascending: false });

      const uniqueBrowser = sameBrowser?.reduce((acc, curr) => {
        if (!acc.find(a => a.user_id === curr.user_id)) {
          acc.push(curr);
        }
        return acc;
      }, [] as DeviceAccount[]) || [];

      setSameBrowserUsers(uniqueBrowser);
      allLinkedUserIds.push(...uniqueBrowser.map(u => u.user_id));
    }

    // Find users with same IP
    if (ips.length > 0) {
      const { data: sameIp } = await supabase
        .from('device_accounts')
        .select('*')
        .in('ip_address', ips)
        .neq('user_id', registration.user_id)
        .order('last_seen_at', { ascending: false });

      const uniqueIp = sameIp?.reduce((acc, curr) => {
        if (!acc.find(a => a.user_id === curr.user_id)) {
          acc.push(curr);
        }
        return acc;
      }, [] as DeviceAccount[]) || [];

      setSameIpUsers(uniqueIp);
      allLinkedUserIds.push(...uniqueIp.map(u => u.user_id));
    }

    // Check if any linked users are site-banned
    const uniqueLinkedIds = [...new Set(allLinkedUserIds)];
    if (uniqueLinkedIds.length > 0) {
      const { data: bans } = await supabase
        .from('site_bans')
        .select('user_id')
        .in('user_id', uniqueLinkedIds)
        .eq('status', 'active');

      if (bans && bans.length > 0) {
        setBannedLinkedUsers(bans.map(b => b.user_id));
      } else {
        setBannedLinkedUsers([]);
      }
    }
  };

  const fetchAnalytics = async () => {
    const { data } = await supabase
      .from('analytics_events')
      .select('user_agent_raw, browser_name, device_type, os_name, referrer_url, referrer_domain, geo_country, geo_city')
      .eq('user_id', registration.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAnalyticsInfo(data);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove();
      toast({ title: 'მომხმარებელი გააქტიურდა!', duration: 2000 });
      onClose();
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject();
      toast({ title: 'მომხმარებელი დაბლოკილია', duration: 2000 });
      onClose();
    } catch (error) {
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ka-GE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === 'mobile' || deviceType === 'smartphone') {
      return <Smartphone className="w-3.5 h-3.5" />;
    }
    return <Laptop className="w-3.5 h-3.5" />;
  };

  const getGenderText = (gender: string) => {
    return gender === 'male' ? 'მამრობითი' : gender === 'female' ? 'მდედრობითი' : 'სხვა';
  };

  // Get browser info from user agent or analytics
  const getBrowserInfo = () => {
    if (analyticsInfo?.user_agent_raw) {
      return analyticsInfo.user_agent_raw;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-sm sm:text-base">ახალი რეგისტრაცია</h2>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                    {pendingCount} მომლოდინე
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">მოდერაციის დაფა</p>
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0 px-1.5 py-0.5">
              <Clock className="w-3 h-3 mr-1" />
              {formatDate(registration.created_at).split(' ')[1]}
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-4 space-y-4">
            {/* User Info Card */}
            <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-14 h-14 border-2 border-primary/30">
                  <AvatarImage src={registration.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                    {registration.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{registration.username}</h3>
                  <p className="text-sm text-muted-foreground">
                    {registration.age} წლის • {getGenderText(registration.gender)}
                    {registration.city && ` • ${registration.city}`}
                  </p>
                </div>
              </div>
            </div>

            {/* BANNED USER WARNING */}
            {bannedLinkedUsers.length > 0 && (
              <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-red-500 text-base">
                      ⚠️ ყურადღება! დაბლოკილი მომხმარებელი!
                    </p>
                    <p className="text-sm text-red-400 mt-1">
                      ამ მომხმარებლის დაკავშირებული ექაუნთებიდან {bannedLinkedUsers.length} დაბლოკილია საიტზე. 
                      სავარაუდოდ ცდილობს ახალი ნიკით შემოსვლას.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sameBrowserUsers
                        .filter(u => bannedLinkedUsers.includes(u.user_id))
                        .map(u => (
                          <Badge key={u.user_id} variant="destructive" className="text-xs">
                            🚫 {u.username || 'Unknown'}
                          </Badge>
                        ))}
                      {sameIpUsers
                        .filter(u => bannedLinkedUsers.includes(u.user_id) && !sameBrowserUsers.find(b => b.user_id === u.user_id))
                        .map(u => (
                          <Badge key={u.user_id} variant="destructive" className="text-xs">
                            🚫 {u.username || 'Unknown'}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Info */}
            <div className="space-y-2">
              {/* IP Address */}
              {registration.ip_address && (
                <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                  <Globe className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">აიპი:</p>
                    <p className="font-mono text-sm font-semibold break-all">{registration.ip_address}</p>
                  </div>
                </div>
              )}

              {/* Browser/User Agent */}
              {getBrowserInfo() && (
                <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                  <Monitor className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">ბრაუზერი:</p>
                    <p className="text-xs font-mono break-all leading-relaxed">{getBrowserInfo()}</p>
                  </div>
                </div>
              )}

              {/* Location Info */}
              {(analyticsInfo?.geo_country || analyticsInfo?.geo_city) && (
                <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                  <MapPin className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">ლოკაცია:</p>
                    <p className="text-sm font-medium">
                      {[analyticsInfo?.geo_city, analyticsInfo?.geo_country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Referrer */}
              {analyticsInfo?.referrer_domain && (
                <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                  <Link2 className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">შემოვიდა:</p>
                    <a 
                      href={analyticsInfo.referrer_url || `https://${analyticsInfo.referrer_domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {analyticsInfo.referrer_domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Same Browser Users */}
            {sameBrowserUsers.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSameBrowser(!showSameBrowser)}
                  className="flex items-center gap-2 w-full p-3 text-left hover:bg-red-500/5 transition-colors"
                >
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-600 dark:text-red-400 text-sm">
                      ამ მომხმარებლის მეტსახელები:
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {sameBrowserUsers.length}
                  </Badge>
                </button>
                
                {showSameBrowser && (
                  <div className="px-3 pb-3 pt-1">
                    <p className="text-sm leading-relaxed tracking-wide">
                      {sameBrowserUsers.map((u, idx) => (
                        <span key={u.user_id}>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {u.username || 'Unknown'}
                          </span>
                          {idx < sameBrowserUsers.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Same IP Users */}
            {sameIpUsers.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSameIp(!showSameIp)}
                  className="flex items-center gap-2 w-full p-3 text-left hover:bg-amber-500/5 transition-colors"
                >
                  <Users className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                      ასეთი აიპი მისამართი აქვთ:
                    </p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                    {sameIpUsers.length}
                  </Badge>
                </button>
                
                {showSameIp && (
                  <div className="px-3 pb-3 pt-1">
                    <p className="text-sm leading-relaxed tracking-wide">
                      {sameIpUsers.map((u, idx) => (
                        <span key={u.user_id}>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {u.username || 'Unknown'}
                          </span>
                          {idx < sameIpUsers.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Registration Time */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm text-muted-foreground">რეგისტრაცია:</span>
              <span className="font-mono text-sm">{formatDate(registration.created_at)}</span>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 p-3 sm:p-4 border-t border-border bg-secondary/10">
          <Button
            onClick={handleApprove}
            disabled={loading}
            size="sm"
            className="flex-1 min-w-[90px] gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
          >
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">გააქტიურება</span>
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            size="sm"
            className="flex-1 min-w-[90px] gap-1.5 text-xs sm:text-sm"
          >
            <Ban className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">დაბლოკვა</span>
          </Button>
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs sm:text-sm"
          >
            <X className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">გაუქმება</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationDetailsModal;
