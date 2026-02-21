import { History, Monitor, User, Globe, Smartphone, Laptop, MapPin, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useSuperAdminData } from '@/hooks/useSuperAdminData';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/utils/ownerUtils';
import { canViewPrivateMessages } from '@/utils/adminAccessUtils';
import AdminPrivateMessagesViewer from './AdminPrivateMessagesViewer';

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

interface SuperAdminInfoProps {
  targetUserId: string | undefined;
  targetUsername?: string;
}

const SuperAdminInfo = ({ targetUserId, targetUsername }: SuperAdminInfoProps) => {
  const { isSuperAdmin, usernameHistory, deviceAccounts, targetUserDevices, loading } = useSuperAdminData(targetUserId);
  const { profile } = useAuth();
  
  // Check if current user can view geo data
  const showGeoData = canViewGeoData(profile?.username);

  if (!isSuperAdmin || !targetUserId) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: ka });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <>
      {/* Nickname Story - Always show for super admins */}
      <div className="flex items-start gap-4">
        <div className="text-muted-foreground flex-shrink-0">
          <History className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-muted-foreground text-sm sm:text-base whitespace-nowrap">Nickname Story:</span>
          {usernameHistory.length > 0 ? (
            <div className="space-y-1">
              {usernameHistory.map((history) => (
                <div key={history.id} className="text-sm flex items-center gap-2 flex-wrap">
                  <span className="text-red-400 line-through">{history.old_username}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-400">{history.new_username}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatDate(history.changed_at)})
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground italic">ნიკი არ შეცვლილა</span>
          )}
        </div>
      </div>

      {/* Target User's Own Device Info - Always show */}
      <div className="flex items-start gap-4">
        <div className="text-muted-foreground flex-shrink-0">
          <Laptop className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-muted-foreground text-sm sm:text-base whitespace-nowrap">
            მოწყობილობის ინფო:
          </span>
          {targetUserDevices.length > 0 ? (
            <div className="space-y-2">
              {targetUserDevices.map((device, index) => (
                <div key={index} className="space-y-1 border-l-2 border-primary/30 pl-2">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    {device.ip_address && (
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Globe className="w-3 h-3" />
                        {device.ip_address}
                      </span>
                    )}
                    {device.browser_name && (
                      <span className="text-blue-400">{device.browser_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    {device.device_type && (
                      <span className="flex items-center gap-1 text-purple-400">
                        <Smartphone className="w-3 h-3" />
                        {device.device_type}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      (ბოლოს: {formatDate(device.last_seen_at)})
                    </span>
                  </div>
                  {/* Geolocation - only for CHEGE and პიკასო */}
                  {showGeoData && (device.geo_country || device.geo_city) && (
                    <div className="flex items-center gap-3 text-sm flex-wrap mt-1">
                      {device.geo_country && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Flag className="w-3 h-3" />
                          {device.geo_country}
                        </span>
                      )}
                      {device.geo_city && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <MapPin className="w-3 h-3" />
                          {device.geo_city}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground italic">მოწყობილობის ინფო არ არის</span>
          )}
        </div>
      </div>

      {/* Geolocation Summary - only for CHEGE and პიკასო */}
      {showGeoData && targetUserDevices.some(d => d.geo_country || d.geo_city) && (
        <div className="flex items-start gap-4">
          <div className="text-muted-foreground flex-shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-muted-foreground text-sm sm:text-base whitespace-nowrap">
              📍 გეოლოკაცია:
            </span>
            <div className="space-y-1">
              {targetUserDevices
                .filter(d => d.geo_country || d.geo_city)
                .map((device, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-400 font-medium">
                      {device.geo_country || 'უცნობი ქვეყანა'}
                    </span>
                    {device.geo_city && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-amber-400">
                          {device.geo_city}
                        </span>
                      </>
                    )}
                    {device.geo_region && device.geo_region !== device.geo_city && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-blue-400 text-xs">
                          {device.geo_region}
                        </span>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* IP / Device Accounts - Other accounts from same device/IP */}
      <div className="flex items-start gap-4">
        <div className="text-muted-foreground flex-shrink-0">
          <Monitor className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-muted-foreground text-sm sm:text-base whitespace-nowrap">
            სხვა ნიკები ამ IP/მოწყობილობიდან:
          </span>
          {deviceAccounts.length > 0 ? (
            <div className="space-y-2">
              {deviceAccounts.map((group) => (
                <div key={group.fingerprint} className="space-y-1 border-l-2 border-amber-500/30 pl-2">
                  {group.accounts.map((account) => (
                    <div key={account.id} className="text-sm space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-3 h-3 text-amber-500" />
                        <span className="font-medium text-amber-400">
                          {account.username || 'უცნობი'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          (ბოლოს: {formatDate(account.last_seen_at)})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground ml-5">
                        {account.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {account.ip_address}
                          </span>
                        )}
                        {account.browser_name && (
                          <span className="text-blue-400">{account.browser_name}</span>
                        )}
                        {account.device_type && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            {account.device_type}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground italic">სხვა ნიკები არ არის</span>
          )}
        </div>
      </div>

      {/* Private Messages Viewer - only for CHEGE and Pikaso */}
      {canViewPrivateMessages(profile?.username) && (
        <div className="border-t border-border/50 pt-4 mt-4">
          <AdminPrivateMessagesViewer targetUserId={targetUserId} targetUsername={targetUsername} />
        </div>
      )}
    </>
  );
};

export default SuperAdminInfo;
