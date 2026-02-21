import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Shield, 
  ShieldOff,
  AlertTriangle,
  Users,
  User,
  Eye
} from 'lucide-react';
import { IpCluster } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface IpSecurityTabProps {
  ipClusters: IpCluster[];
  loading: boolean;
  onSearchByIp: (ip: string) => Promise<any[]>;
  onBlockIp: (ip: string, reason: string) => Promise<boolean>;
  onUnblockIp: (ip: string) => Promise<boolean>;
  onFetchClusters: () => void;
  isSuperAdmin: boolean;
}

interface IpSearchResult {
  user_id: string;
  username: string | null;
  ip_address: string;
  device_type: string | null;
  browser_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

interface BlockedIp {
  id: string;
  ip_address: string;
  reason: string | null;
  blocked_at: string;
  is_active: boolean;
}

export const IpSecurityTab = ({ 
  ipClusters,
  loading,
  onSearchByIp,
  onBlockIp,
  onUnblockIp,
  onFetchClusters,
  isSuperAdmin
}: IpSecurityTabProps) => {
  const [searchIp, setSearchIp] = useState('');
  const [searchResults, setSearchResults] = useState<IpSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [blockReason, setBlockReason] = useState('');
  const [ipToBlock, setIpToBlock] = useState<string | null>(null);

  useEffect(() => {
    onFetchClusters();
    fetchBlockedIps();
  }, []);

  const fetchBlockedIps = async () => {
    const { data } = await supabase
      .from('analytics_ip_blocks')
      .select('*')
      .eq('is_active', true)
      .order('blocked_at', { ascending: false });
    
    setBlockedIps(data || []);
  };

  const handleSearch = async () => {
    if (!searchIp.trim()) return;
    
    setSearching(true);
    try {
      const results = await onSearchByIp(searchIp);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleBlockIp = async () => {
    if (!ipToBlock) return;
    
    const success = await onBlockIp(ipToBlock, blockReason);
    if (success) {
      toast.success('IP დაბლოკილია');
      setIpToBlock(null);
      setBlockReason('');
      fetchBlockedIps();
    } else {
      toast.error('IP დაბლოკვა ვერ მოხერხდა');
    }
  };

  const handleUnblockIp = async (ip: string) => {
    const success = await onUnblockIp(ip);
    if (success) {
      toast.success('IP განბლოკილია');
      fetchBlockedIps();
    } else {
      toast.error('IP განბლოკვა ვერ მოხერხდა');
    }
  };

  const maskIp = (ip: string) => {
    if (isSuperAdmin) return ip;
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return ip.slice(0, -3) + 'xxx';
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-6">
      {/* IP Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4" />
            IP ძებნა
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="შეიყვანეთ IP მისამართი..."
              value={searchIp}
              onChange={(e) => setSearchIp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-xs font-mono"
            />
            <Button onClick={handleSearch} disabled={searching}>
              <Search className="w-4 h-4 mr-1" />
              ძებნა
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>მომხმარებელი</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>მოწყობილობა</TableHead>
                    <TableHead>პირველი შესვლა</TableHead>
                    <TableHead>ბოლო შესვლა</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {result.username || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {maskIp(result.ip_address)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {result.device_type} / {result.browser_name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(result.first_seen_at).toLocaleString('ka-GE')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(result.last_seen_at).toLocaleString('ka-GE')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {isSuperAdmin && searchResults.length > 0 && (
                <div className="p-2 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setIpToBlock(searchIp)}
                      >
                        <ShieldOff className="w-4 h-4 mr-1" />
                        დაბლოკე ეს IP
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>IP დაბლოკვა</AlertDialogTitle>
                        <AlertDialogDescription>
                          დარწმუნებული ხართ, რომ გსურთ IP <strong>{searchIp}</strong>-ის დაბლოკვა?
                          ამ IP-დან შემომავალი ყველა მოთხოვნა დაიბლოკება.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Textarea
                        placeholder="მიზეზი (არასავალდებულო)"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                          setIpToBlock(null);
                          setBlockReason('');
                        }}>
                          გაუქმება
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlockIp}>
                          დაბლოკვა
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Clusters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            საეჭვო IP-ები (მრავალი ექაუნთი)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isSuperAdmin ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>მხოლოდ Super Admin-ს აქვს წვდომა</p>
            </div>
          ) : ipClusters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              საეჭვო IP-ები არ მოიძებნა
            </div>
          ) : (
            <div className="space-y-3">
              {ipClusters.slice(0, 20).map((cluster, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded">
                      <Users className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-mono text-sm">{cluster.ip_address}</p>
                      <p className="text-xs text-muted-foreground">
                        {cluster.account_count} ექაუნთი
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {cluster.usernames.slice(0, 3).map((username, i) => (
                        <Avatar key={i} className="w-6 h-6 border-2 border-background">
                          <AvatarFallback className="text-[10px]">
                            {username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {cluster.usernames.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-background">
                          +{cluster.usernames.length - 3}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchIp(cluster.ip_address);
                        handleSearch();
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked IPs */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              დაბლოკილი IP-ები
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blockedIps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                დაბლოკილი IP-ები არ არის
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>მიზეზი</TableHead>
                      <TableHead>დაბლოკვის თარიღი</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIps.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell className="font-mono">{block.ip_address}</TableCell>
                        <TableCell>{block.reason || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(block.blocked_at).toLocaleString('ka-GE')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockIp(block.ip_address)}
                          >
                            განბლოკვა
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
