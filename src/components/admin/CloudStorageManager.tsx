import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  HardDrive, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  Image,
  Video,
  MessageSquare,
  Users,
  Bell,
  Eye,
  Zap,
  Settings,
  BarChart3,
  Shield,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StorageStats {
  buckets: {
    name: string;
    size_bytes: number;
    file_count: number;
  }[];
  total_storage_bytes: number;
  database_stats: {
    private_messages: number;
    group_messages: number;
    notifications: number;
    profile_visits: number;
    stories: number;
    posts: number;
    gifs: number;
  };
  active_sessions: number;
  active_rooms: number;
}

interface CleanupSettings {
  setting_key: string;
  setting_value: string;
  description: string;
}

export const CloudStorageManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [settings, setSettings] = useState<CleanupSettings[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cloud-storage-manager', {
        body: { action: 'get-stats' }
      });

      if (error) throw error;
      if (data?.stats) {
        setStats(data.stats);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('[CloudStorageManager] Error fetching stats:', err);
      toast({
        title: 'შეცდომა',
        description: 'სტატისტიკის ჩატვირთვა ვერ მოხერხდა',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cloud-storage-manager', {
        body: { action: 'get-settings' }
      });

      if (error) throw error;
      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('[CloudStorageManager] Error fetching settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchSettings();
  }, [fetchStats, fetchSettings]);

  const runCleanup = async (action: string, params?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('cloud-storage-manager', {
        body: { action, params }
      });

      if (error) throw error;

      let message = 'გასუფთავება დასრულდა';
      if (data?.deleted !== undefined) {
        message = `წაიშალა: ${typeof data.deleted === 'object' ? JSON.stringify(data.deleted) : data.deleted}`;
      } else if (data?.total_deleted !== undefined) {
        message = `სულ წაიშალა: ${data.total_deleted} ჩანაწერი`;
      } else if (data?.deactivated !== undefined) {
        message = `გამორთულია: ${data.deactivated} ოთახი`;
      }

      toast({
        title: 'წარმატება',
        description: message
      });

      // Refresh stats
      await fetchStats();
    } catch (err) {
      console.error(`[CloudStorageManager] Error running ${action}:`, err);
      toast({
        title: 'შეცდომა',
        description: 'ოპერაცია ვერ სრულდება',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.functions.invoke('cloud-storage-manager', {
        body: { action: 'update-settings', params: { key, value } }
      });

      if (error) throw error;

      setSettings(prev => prev.map(s => 
        s.setting_key === key ? { ...s, setting_value: value } : s
      ));

      toast({
        title: 'შენახულია',
        description: 'პარამეტრი განახლდა'
      });
    } catch (err) {
      console.error('[CloudStorageManager] Error updating setting:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive'
      });
    }
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.setting_key === key)?.setting_value || '';
  };

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-4 pb-6 pr-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Cloud Storage Manager
            </h2>
            <p className="text-sm text-muted-foreground">
              სტორიჯის მონიტორინგი და გასუფთავება
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-muted-foreground">
                განახლდა: {format(lastRefresh, 'HH:mm:ss')}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              განახლება
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="flex items-center gap-1 text-xs">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">გასუფთავება</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 text-xs">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">პარამეტრები</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : stats ? (
              <>
                {/* Storage Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      სტორიჯის გამოყენება
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>სულ გამოყენებული:</span>
                        <span className="font-bold">{formatBytes(stats.total_storage_bytes)}</span>
                      </div>
                      <Progress value={Math.min((stats.total_storage_bytes / (1024 * 1024 * 1024)) * 100, 100)} />
                      <div className="grid grid-cols-2 gap-2">
                        {stats.buckets.map(bucket => (
                          <div key={bucket.name} className="flex justify-between text-xs p-2 bg-muted rounded">
                            <span className="capitalize">{bucket.name}</span>
                            <span>{formatBytes(bucket.size_bytes)} ({bucket.file_count} files)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Database Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      მონაცემთა ბაზა
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">პირადი</p>
                          <p className="font-bold">{stats.database_stats.private_messages.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Users className="w-4 h-4 text-green-500" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">ჯგუფური</p>
                          <p className="font-bold">{stats.database_stats.group_messages.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Bell className="w-4 h-4 text-yellow-500" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">შეტყობინებები</p>
                          <p className="font-bold">{stats.database_stats.notifications.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Eye className="w-4 h-4 text-purple-500" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">ვიზიტები</p>
                          <p className="font-bold">{stats.database_stats.profile_visits.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Video className="w-4 h-4 text-red-500" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">სთორები</p>
                          <p className="font-bold">{stats.database_stats.stories.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Image className="w-4 h-4 text-pink-500" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">პოსტები</p>
                          <p className="font-bold">{stats.database_stats.posts.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Image className="w-4 h-4 text-orange-500" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">GIF-ები</p>
                          <p className="font-bold">{stats.database_stats.gifs.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Resources */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-green-500" />
                          <span className="text-sm">აქტიური სესიები</span>
                        </div>
                        <Badge variant="secondary">{stats.active_sessions}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                          <span className="text-sm">აქტიური ოთახები</span>
                        </div>
                        <Badge variant="secondary">{stats.active_rooms}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <p>სტატისტიკა ვერ ჩაიტვირთა</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cleanup Tab */}
          <TabsContent value="cleanup" className="mt-0 space-y-4">
            {/* Emergency Button */}
            <Card className="border-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <Zap className="w-4 h-4" />
                  სასწრაფო გასუფთავება
                </CardTitle>
                <CardDescription>
                  ძველი მონაცემების აგრესიული წაშლა Cloud-ის გასათავისუფლებლად
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => runCleanup('emergency-cleanup')}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'emergency-cleanup' ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Free Cloud Space
                </Button>
              </CardContent>
            </Card>

            {/* Individual Cleanup Options */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  ინდივიდუალური გასუფთავება
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">წაკითხული შეტყობინებები</p>
                      <p className="text-xs text-muted-foreground">3 დღეზე ძველი</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => runCleanup('cleanup-logs', { retentionDays: 3 })}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'cleanup-logs' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">ძველი მესიჯები</p>
                      <p className="text-xs text-muted-foreground">30 დღეზე ძველი</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => runCleanup('cleanup-messages', { retentionDays: 30 })}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'cleanup-messages' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">პროფილის ვიზიტები</p>
                      <p className="text-xs text-muted-foreground">90 დღეზე ძველი</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => runCleanup('cleanup-profile-visits', { retentionDays: 90 })}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'cleanup-profile-visits' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">გავადასული სთორები</p>
                      <p className="text-xs text-muted-foreground">7 დღეზე ძველი</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => runCleanup('cleanup-expired-stories')}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'cleanup-expired-stories' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">მესიჯების წაკითხვები</p>
                      <p className="text-xs text-muted-foreground">30 დღეზე ძველი</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => runCleanup('cleanup-message-reads', { retentionDays: 30 })}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'cleanup-message-reads' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">უმოქმედო ოთახები</p>
                      <p className="text-xs text-muted-foreground">24 საათზე მეტი</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => runCleanup('cleanup-inactive-rooms', { hoursInactive: 24 })}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'cleanup-inactive-rooms' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Safety Rules */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                  <Shield className="w-4 h-4" />
                  დაცვის წესები
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    პროფილის ფოტოები არასოდეს წაიშლება
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    გამოქვეყნებული პოსტები არასოდეს წაიშლება
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    აქტიური ჩატები არასოდეს წაიშლება
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    მიმდინარე live სტრიმები არასოდეს შეწყდება
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  ავტომატური გასუფთავება
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-cleanup">ავტომატური გასუფთავება</Label>
                    <p className="text-xs text-muted-foreground">ძველი მონაცემების ავტომატური წაშლა</p>
                  </div>
                  <Switch 
                    id="auto-cleanup"
                    checked={getSetting('auto_cleanup_enabled') === 'true'}
                    onCheckedChange={(checked) => updateSetting('auto_cleanup_enabled', checked ? 'true' : 'false')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ლოგების შენახვის ვადა (დღე)</Label>
                  <Input 
                    type="number"
                    value={getSetting('logs_retention_days') || '3'}
                    onChange={(e) => updateSetting('logs_retention_days', e.target.value)}
                    min={1}
                    max={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label>შეცდომების ლოგების შენახვა (დღე)</Label>
                  <Input 
                    type="number"
                    value={getSetting('error_logs_retention_days') || '14'}
                    onChange={(e) => updateSetting('error_logs_retention_days', e.target.value)}
                    min={7}
                    max={90}
                  />
                </div>

                <div className="space-y-2">
                  <Label>დროებითი მედიის შენახვა (საათი)</Label>
                  <Input 
                    type="number"
                    value={getSetting('temp_media_retention_hours') || '48'}
                    onChange={(e) => updateSetting('temp_media_retention_hours', e.target.value)}
                    min={12}
                    max={168}
                  />
                </div>

                <div className="space-y-2">
                  <Label>უმოქმედო სესიების წაშლა (დღე)</Label>
                  <Input 
                    type="number"
                    value={getSetting('inactive_sessions_days') || '7'}
                    onChange={(e) => updateSetting('inactive_sessions_days', e.target.value)}
                    min={1}
                    max={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ცარიელი ოთახების წაშლა (საათი)</Label>
                  <Input 
                    type="number"
                    value={getSetting('empty_rooms_hours') || '24'}
                    onChange={(e) => updateSetting('empty_rooms_hours', e.target.value)}
                    min={6}
                    max={168}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};

export default CloudStorageManager;
