import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  UserPlus, 
  Activity, 
  UserCheck, 
  UserX,
  TrendingUp,
  Globe
} from 'lucide-react';
import { AnalyticsSummary, RegistrationByDay, ReferralSource } from './types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

interface AnalyticsOverviewProps {
  summary: AnalyticsSummary | null;
  registrationsByDay: RegistrationByDay[];
  referralSources: ReferralSource[];
  loading: boolean;
}

const GENDER_COLORS = ['#3B82F6', '#EC4899'];
const SOURCE_COLORS = ['#4285F4', '#1877F2', '#E4405F', '#000000', '#0088CC', '#25D366', '#1DA1F2', '#6B7280', '#9CA3AF'];

export const AnalyticsOverview = ({ 
  summary, 
  registrationsByDay, 
  referralSources,
  loading 
}: AnalyticsOverviewProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const genderData = [
    { name: 'ბიჭები', value: summary.male_count, color: GENDER_COLORS[0] },
    { name: 'გოგოები', value: summary.female_count, color: GENDER_COLORS[1] },
  ];

  const totalGender = summary.male_count + summary.female_count;
  const malePercent = totalGender > 0 ? ((summary.male_count / totalGender) * 100).toFixed(1) : 0;
  const femalePercent = totalGender > 0 ? ((summary.female_count / totalGender) * 100).toFixed(1) : 0;

  const verifiedPercent = summary.total_users > 0 
    ? ((summary.verified_count / summary.total_users) * 100).toFixed(1) 
    : 0;

  const kpiCards = [
    { 
      title: 'სულ მომხმარებლები', 
      value: summary.total_users.toLocaleString(), 
      icon: Users, 
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      title: 'ახალი დღეს', 
      value: summary.new_registrations_today.toLocaleString(), 
      icon: UserPlus, 
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    { 
      title: 'ახალი 7 დღეში', 
      value: summary.new_registrations_7d.toLocaleString(), 
      icon: TrendingUp, 
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    { 
      title: 'ახალი 30 დღეში', 
      value: summary.new_registrations_30d.toLocaleString(), 
      icon: TrendingUp, 
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    { 
      title: 'online (10წთ)', 
      value: summary.online_users_10m.toLocaleString(), 
      icon: Activity, 
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    { 
      title: 'აქტიური (24სთ)', 
      value: summary.active_users_24h.toLocaleString(), 
      icon: Activity, 
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    { 
      title: 'ბიჭები / გოგოები', 
      value: `${summary.male_count} / ${summary.female_count}`, 
      subtitle: `${malePercent}% / ${femalePercent}%`,
      icon: Users, 
      color: 'text-pink-500',
      bg: 'bg-pink-500/10'
    },
    { 
      title: 'ვერიფიცირებული', 
      value: `${summary.verified_count} (${verifiedPercent}%)`, 
      icon: UserCheck, 
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10'
    },
  ];

  // Format date for display (DD MMM format)
  const formatDateLabel = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
    return `${day} ${months[month - 1]}`;
  };

  return (
    <div className="space-y-6 pb-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-xl font-bold mt-1">{card.value}</p>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registrations Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">რეგისტრაციები დღეების მიხედვით</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 250, minHeight: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={registrationsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatDateLabel}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    labelFormatter={formatDateLabel}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="რეგისტრაციები"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gender Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">სქესის განაწილება</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 250, minHeight: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Sources Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Top წყაროები</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 250, minHeight: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referralSources.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="source" tick={{ fontSize: 10 }} />
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
