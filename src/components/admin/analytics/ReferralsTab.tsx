import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download,
  Globe,
  TrendingUp,
  ExternalLink,
  Search as SearchIcon,
  Facebook,
  Instagram,
  MessageCircle,
  Send
} from 'lucide-react';
import { ReferralSource } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

interface ReferralsTabProps {
  referralSources: ReferralSource[];
  loading: boolean;
}

const SOURCE_ICONS: Record<string, any> = {
  google: SearchIcon,
  facebook: Facebook,
  instagram: Instagram,
  telegram: Send,
  whatsapp: MessageCircle,
  tiktok: Globe,
  twitter: Globe,
  direct: Globe,
};

const SOURCE_COLORS: Record<string, string> = {
  google: '#4285F4',
  facebook: '#1877F2',
  instagram: '#E4405F',
  telegram: '#0088CC',
  whatsapp: '#25D366',
  tiktok: '#000000',
  twitter: '#1DA1F2',
  direct: '#6B7280',
  other: '#9CA3AF',
};

export const ReferralsTab = ({ referralSources, loading }: ReferralsTabProps) => {
  const totalVisits = referralSources.reduce((sum, s) => sum + s.visits, 0);
  const totalRegistrations = referralSources.reduce((sum, s) => sum + s.registrations, 0);
  const avgConversion = totalVisits > 0 ? ((totalRegistrations / totalVisits) * 100).toFixed(2) : 0;

  const pieData = referralSources.slice(0, 6).map(source => ({
    name: source.source,
    value: source.visits,
    color: SOURCE_COLORS[source.source.toLowerCase()] || SOURCE_COLORS.other,
  }));

  const exportToCsv = () => {
    const headers = ['Source', 'Visits', 'Registrations', 'Conversion Rate'];
    const rows = referralSources.map(s => [
      s.source,
      s.visits,
      s.registrations,
      `${s.conversion_rate}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `referrals_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getSourceIcon = (source: string) => {
    const Icon = SOURCE_ICONS[source.toLowerCase()] || Globe;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">სულ ვიზიტები</p>
                <p className="text-2xl font-bold">{totalVisits.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">რეგისტრაციები</p>
                <p className="text-2xl font-bold">{totalRegistrations.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">საშ. კონვერსია</p>
                <p className="text-2xl font-bold">{avgConversion}%</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">წყაროების შედარება</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={referralSources.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="source" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Legend />
                <Bar dataKey="visits" fill="#3B82F6" name="ვიზიტები" />
                <Bar dataKey="registrations" fill="#10B981" name="რეგისტრაციები" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ვიზიტების განაწილება</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sources Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">ტრაფიკის წყაროები</CardTitle>
            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>წყარო</TableHead>
                  <TableHead className="text-right">ვიზიტები</TableHead>
                  <TableHead className="text-right">რეგისტრაციები</TableHead>
                  <TableHead className="text-right">კონვერსია</TableHead>
                  <TableHead className="text-right">წილი</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      მონაცემები არ მოიძებნა
                    </TableCell>
                  </TableRow>
                ) : (
                  referralSources.map((source, idx) => {
                    const share = totalVisits > 0 
                      ? ((source.visits / totalVisits) * 100).toFixed(1) 
                      : 0;

                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="p-1.5 rounded"
                              style={{ 
                                backgroundColor: `${SOURCE_COLORS[source.source.toLowerCase()] || SOURCE_COLORS.other}20` 
                              }}
                            >
                              {getSourceIcon(source.source)}
                            </div>
                            <span className="font-medium capitalize">{source.source}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {source.visits.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {source.registrations.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={source.conversion_rate > 10 ? 'default' : 'secondary'}
                            className="font-mono"
                          >
                            {source.conversion_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {share}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* UTM Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">UTM ტრეკინგი</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              ტრაფიკის წყაროების დეტალური ტრეკინგისთვის გამოიყენეთ UTM პარამეტრები:
            </p>
            <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs overflow-x-auto">
              https://yourdomain.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_promo
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-2 bg-muted/30 rounded">
                <p className="font-medium text-xs">utm_source</p>
                <p className="text-xs text-muted-foreground">წყარო (facebook, google...)</p>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <p className="font-medium text-xs">utm_medium</p>
                <p className="text-xs text-muted-foreground">მედია (cpc, email...)</p>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <p className="font-medium text-xs">utm_campaign</p>
                <p className="text-xs text-muted-foreground">კამპანია</p>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <p className="font-medium text-xs">utm_content</p>
                <p className="text-xs text-muted-foreground">კონტენტი</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
