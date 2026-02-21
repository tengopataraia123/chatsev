import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserPlus, Eye, Activity, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Statistics {
  totalUsers: number;
  usersLast30Days: number;
  usersToday: number;
  visitorsLast24Hours: number;
  onlineUsers: number;
  calculatedAt: string;
  georgianDate?: string;
}

export const StatisticsDashboard = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('არაავტორიზებული მოთხოვნა');
          setLoading(false);
          return;
        }

        const response = await supabase.functions.invoke('admin-statistics', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
        }

        setStats(response.data);
      } catch (err: any) {
        console.error('Error fetching statistics:', err);
        setError(err.message || 'სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
        toast({
          title: 'შეცდომა',
          description: 'სტატისტიკის ჩატვირთვა ვერ მოხერხდა',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">სტატისტიკის დაფა</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-sm animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">სტატისტიკის დაფა</h2>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'სულ მომხმარებელი',
      value: stats?.totalUsers || 0,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-100',
      description: 'რეგისტრირებული'
    },
    {
      title: 'დღეს დარეგისტრირდა',
      value: stats?.usersToday || 0,
      icon: UserPlus,
      gradient: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-100',
      description: 'ბოლო 24 საათში'
    },
    {
      title: 'ბოლო 30 დღე',
      value: stats?.usersLast30Days || 0,
      icon: UserPlus,
      gradient: 'from-green-500 to-green-600',
      textColor: 'text-green-100',
      description: 'ახალი რეგისტრაციები'
    },
    {
      title: 'ვიზიტორები',
      value: stats?.visitorsLast24Hours || 0,
      icon: Eye,
      gradient: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-100',
      description: 'ბოლო 24 საათში'
    },
    {
      title: 'online',
      value: stats?.onlineUsers || 0,
      icon: Activity,
      gradient: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-100',
      description: 'ბოლო 10 წუთში'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">სტატისტიკის დაფა</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={index}
              className={`border-0 shadow-md overflow-hidden bg-gradient-to-br ${card.gradient}`}
            >
              <CardContent className="p-4 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`${card.textColor} text-xs font-medium mb-1`}>
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold mb-1">
                      {card.value.toLocaleString()}
                    </p>
                    <p className={`${card.textColor} text-[10px] opacity-80`}>
                      {card.description}
                    </p>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Icon className="h-6 w-6 opacity-80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timestamp */}
      {stats?.calculatedAt && (
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          განახლდა: {new Date(stats.calculatedAt).toLocaleString('ka-GE')}
        </p>
      )}
    </div>
  );
};
