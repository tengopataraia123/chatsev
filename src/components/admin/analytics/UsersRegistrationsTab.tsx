import { useState, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  User, 
  Smartphone, 
  Monitor, 
  Tablet,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { UserRegistration, DateRangeFilter } from './types';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface UsersRegistrationsTabProps {
  registrations: UserRegistration[];
  loading: boolean;
  onSearch: (filter?: DateRangeFilter, search?: string) => void;
  onViewProfile: (userId: string) => void;
}

export const UsersRegistrationsTab = ({ 
  registrations, 
  loading,
  onSearch,
  onViewProfile
}: UsersRegistrationsTabProps) => {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');

  const handleSearch = () => {
    const filter: DateRangeFilter = { range: dateRange as any };
    onSearch(filter, search || undefined);
  };

  const filteredRegistrations = useMemo(() => {
    let filtered = registrations;

    if (genderFilter !== 'all') {
      filtered = filtered.filter(r => r.gender === genderFilter);
    }

    if (deviceFilter !== 'all') {
      filtered = filtered.filter(r => r.device_type === deviceFilter);
    }

    return filtered;
  }, [registrations, genderFilter, deviceFilter]);

  const exportToCsv = () => {
    const headers = [
      'User ID', 'Nickname', 'Gender', 'Register Date', 'Last Login',
      'IP', 'Device', 'Browser', 'Country', 'City', 'Source', 'Verified'
    ];

    const rows = filteredRegistrations.map(r => [
      r.user_id,
      r.username || '',
      r.gender || '',
      r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd HH:mm') : '',
      r.last_seen ? format(new Date(r.last_seen), 'yyyy-MM-dd HH:mm') : '',
      r.ip_address || '',
      r.device_type || '',
      r.browser_name || '',
      r.geo_country || '',
      r.geo_city || '',
      r.referrer_domain || 'direct',
      r.is_verified ? 'Yes' : 'No'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `registrations_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getDeviceIcon = (type: string | null) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-sm">რეგისტრაციების ისტორია</CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ძებნა nickname / IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">დღეს</SelectItem>
                <SelectItem value="7d">7 დღე</SelectItem>
                <SelectItem value="30d">30 დღე</SelectItem>
              </SelectContent>
            </Select>

            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="სქესი" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                <SelectItem value="male">ბიჭი</SelectItem>
                <SelectItem value="female">გოგო</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="მოწყობილობა" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                <SelectItem value="mobile">მობილური</SelectItem>
                <SelectItem value="desktop">დესკტოპ</SelectItem>
                <SelectItem value="tablet">ტაბლეტი</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto max-h-[calc(100vh-350px)] min-h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>მომხმარებელი</TableHead>
                <TableHead>სქესი</TableHead>
                <TableHead>რეგისტრაცია</TableHead>
                <TableHead>ბოლო შესვლა</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>მოწყობილობა</TableHead>
                <TableHead>ბრაუზერი</TableHead>
                <TableHead>წყარო</TableHead>
                <TableHead className="text-center">ვერიფ.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    მონაცემები არ მოიძებნა
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistrations.map((reg) => (
                  <TableRow key={reg.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={reg.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[120px]">
                          {reg.username || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={reg.gender === 'male' ? 'default' : 'secondary'}>
                        {reg.gender === 'male' ? '♂' : reg.gender === 'female' ? '♀' : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {reg.created_at 
                        ? format(new Date(reg.created_at), 'dd MMM yyyy HH:mm', { locale: ka })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-xs">
                      {reg.last_seen
                        ? format(new Date(reg.last_seen), 'dd MMM yyyy HH:mm', { locale: ka })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {reg.ip_address || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(reg.device_type)}
                        <span className="text-xs capitalize">{reg.device_type || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {reg.browser_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {reg.referrer_domain || 'direct'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {reg.is_verified ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewProfile(reg.user_id)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>სულ: {filteredRegistrations.length} ჩანაწერი</span>
        </div>
      </CardContent>
    </Card>
  );
};
