import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Database,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Square,
  Shield,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  MessagesSquare,
  Eye,
  Users,
  Bell
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subMinutes, subHours, subDays, formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';

interface CleanupItem {
  id: string;
  key: string;
  title_ka: string;
  description_ka: string | null;
  type: string;
  risk_level: string;
  enabled: boolean;
  default_batch_size: number;
  default_pause_ms: number;
  retention_days: number | null;
}

interface CleanupRun {
  id: string;
  cleanup_item_id: string;
  status: string;
  checkpoint_json: any;
  processed_count: number;
  processed_batches: number;
  last_error: string | null;
  retry_after: string | null;
  started_at: string | null;
  updated_at: string;
  finished_at: string | null;
}

type TimeUnit = 'minutes' | 'hours' | 'days';

interface TimeConfig {
  value: number;
  unit: TimeUnit;
}

const timeOptions = [
  { label: '5 წუთი', value: 5, unit: 'minutes' as TimeUnit },
  { label: '10 წუთი', value: 10, unit: 'minutes' as TimeUnit },
  { label: '15 წუთი', value: 15, unit: 'minutes' as TimeUnit },
  { label: '30 წუთი', value: 30, unit: 'minutes' as TimeUnit },
  { label: '1 საათი', value: 1, unit: 'hours' as TimeUnit },
  { label: '2 საათი', value: 2, unit: 'hours' as TimeUnit },
  { label: '6 საათი', value: 6, unit: 'hours' as TimeUnit },
  { label: '12 საათი', value: 12, unit: 'hours' as TimeUnit },
  { label: '1 დღე', value: 1, unit: 'days' as TimeUnit },
  { label: '7 დღე', value: 7, unit: 'days' as TimeUnit },
  { label: '30 დღე', value: 30, unit: 'days' as TimeUnit },
];

const getDateFromConfig = (config: TimeConfig): Date => {
  const now = new Date();
  switch (config.unit) {
    case 'minutes': return subMinutes(now, config.value);
    case 'hours': return subHours(now, config.value);
    case 'days': return subDays(now, config.value);
    default: return subMinutes(now, 5);
  }
};

const ICON_MAP: Record<string, React.ElementType> = {
  'db:private_messages': MessageSquare,
  'db:group_messages': MessagesSquare,
  'db:unread_receipts': Eye,
  'db:profile_views': Users,
  'db:notifications': Bell,
};

const RISK_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  safe: { color: 'text-green-500', icon: ShieldCheck, label: 'უსაფრთხო' },
  medium: { color: 'text-yellow-500', icon: Shield, label: 'საშუალო' },
  critical: { color: 'text-red-500', icon: ShieldAlert, label: 'კრიტიკული' },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  idle: { color: 'bg-muted text-muted-foreground', label: 'მოლოდინი' },
  running: { color: 'bg-blue-500/20 text-blue-400', label: 'მიმდინარე' },
  paused: { color: 'bg-yellow-500/20 text-yellow-400', label: 'დაპაუზებული' },
  done: { color: 'bg-green-500/20 text-green-400', label: 'დასრულებული' },
  error: { color: 'bg-red-500/20 text-red-400', label: 'შეცდომა' },
};

export const CacheCleanupAdmin = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<CleanupItem[]>([]);
  const [latestRuns, setLatestRuns] = useState<Record<string, CleanupRun>>({});
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeRunIds, setActiveRunIds] = useState<Set<string>>(new Set());
  const tickIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const [timeConfig, setTimeConfig] = useState<TimeConfig>({ value: 5, unit: 'minutes' });

  const getCutoffDate = useCallback(() => getDateFromConfig(timeConfig).toISOString(), [timeConfig]);

  // ─── FETCH DATA ───
  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cache-cleanup', {
        body: { action: 'list' }
      });
      if (error) throw error;
      if (data.success) {
        setItems(data.items || []);
        setLatestRuns(data.latestRuns || {});
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── REALTIME SUBSCRIPTION ───
  useEffect(() => {
    const channel = supabase
      .channel('cleanup-runs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cleanup_runs'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // ─── CLEANUP ON UNMOUNT ───
  useEffect(() => {
    return () => {
      Object.values(tickIntervals.current).forEach(clearInterval);
    };
  }, []);

  // ─── SCAN ESTIMATE ───
  const scanEstimate = useCallback(async (itemId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cache-cleanup', {
        body: { action: 'scan', itemId, cutoffDate: getCutoffDate() }
      });
      if (!error && data.success) {
        setEstimates(prev => ({ ...prev, [itemId]: data.estimate }));
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  }, [getCutoffDate]);

  const scanAll = useCallback(async () => {
    for (const item of items) {
      await scanEstimate(item.id);
    }
    toast({ title: 'სკანირება დასრულდა' });
  }, [items, scanEstimate, toast]);

  // ─── START CLEANUP ───
  const startCleanup = useCallback(async (item: CleanupItem) => {
    if (item.risk_level !== 'safe') {
      const confirmed = confirm(`⚠️ "${item.title_ka}" ${RISK_CONFIG[item.risk_level]?.label} რისკის დონის ოპერაციაა. გაგრძელება?`);
      if (!confirmed) return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('cache-cleanup', {
        body: { action: 'start', itemId: item.id }
      });
      if (error) throw error;
      if (!data.success) {
        if (data.error === 'Already has an active run') {
          toast({ title: 'უკვე მიმდინარეობს', variant: 'destructive' });
          return;
        }
        throw new Error(data.error);
      }

      const runId = data.runId;
      setActiveRunIds(prev => new Set([...prev, runId]));

      // Start tick loop
      startTickLoop(runId, item);

      toast({ title: `${item.title_ka} — დაიწყო` });
      fetchData();
    } catch (err) {
      console.error('Start error:', err);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  }, [toast, fetchData, getCutoffDate]);

  // ─── TICK LOOP ───
  const startTickLoop = useCallback((runId: string, item: CleanupItem) => {
    // Clear existing interval if any
    if (tickIntervals.current[runId]) {
      clearInterval(tickIntervals.current[runId]);
    }

    const pauseMs = item.default_pause_ms || 200;
    const intervalMs = Math.max(pauseMs, 500); // At least 500ms between ticks

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cache-cleanup', {
          body: {
            action: 'tick',
            runId,
            cutoffDate: getCutoffDate(),
            batchSize: item.default_batch_size
          }
        });

        if (error) {
          console.error('Tick network error:', error);
          return; // Don't stop, retry next tick
        }

        if (data.done || data.status === 'paused' || data.status === 'done') {
          clearInterval(tickIntervals.current[runId]);
          delete tickIntervals.current[runId];
          setActiveRunIds(prev => {
            const next = new Set(prev);
            next.delete(runId);
            return next;
          });
          fetchData();
          if (data.done) {
            toast({ title: `${item.title_ka} — დასრულდა (${data.processedCount?.toLocaleString() || 0} წაშლილი)` });
          }
          return;
        }

        if (!data.success && data.retryAfter) {
          // Error with retry — pause the interval temporarily
          clearInterval(tickIntervals.current[runId]);
          const retryDelay = Math.max(5000, new Date(data.retryAfter).getTime() - Date.now());
          setTimeout(() => {
            startTickLoop(runId, item);
          }, retryDelay);
          return;
        }

        // Update UI
        fetchData();
      } catch (err) {
        console.error('Tick error:', err);
        // Don't stop on error, retry next tick
      }
    }, intervalMs);

    tickIntervals.current[runId] = interval;
  }, [getCutoffDate, fetchData, toast]);

  // ─── PAUSE / RESUME / STOP ───
  const pauseRun = useCallback(async (runId: string) => {
    await supabase.functions.invoke('cache-cleanup', { body: { action: 'pause', runId } });
    if (tickIntervals.current[runId]) {
      clearInterval(tickIntervals.current[runId]);
      delete tickIntervals.current[runId];
    }
    fetchData();
  }, [fetchData]);

  const resumeRun = useCallback(async (runId: string, item: CleanupItem) => {
    await supabase.functions.invoke('cache-cleanup', { body: { action: 'resume', runId } });
    startTickLoop(runId, item);
    fetchData();
  }, [fetchData, startTickLoop]);

  const stopRun = useCallback(async (runId: string) => {
    await supabase.functions.invoke('cache-cleanup', { body: { action: 'stop', runId } });
    if (tickIntervals.current[runId]) {
      clearInterval(tickIntervals.current[runId]);
      delete tickIntervals.current[runId];
    }
    setActiveRunIds(prev => {
      const next = new Set(prev);
      next.delete(runId);
      return next;
    });
    fetchData();
  }, [fetchData]);

  // ─── GLOBAL ACTIONS ───
  const startAll = useCallback(async () => {
    for (const item of items) {
      const run = latestRuns[item.id];
      if (!run || run.status === 'done' || run.status === 'error' || run.status === 'idle') {
        await startCleanup(item);
      }
    }
  }, [items, latestRuns, startCleanup]);

  const stopAll = useCallback(async () => {
    for (const item of items) {
      const run = latestRuns[item.id];
      if (run && (run.status === 'running' || run.status === 'paused')) {
        await stopRun(run.id);
      }
    }
  }, [items, latestRuns, stopRun]);

  // ─── GROUP BY TYPE ───
  const groupedItems = items.reduce<Record<string, CleanupItem[]>>((acc, item) => {
    const type = item.type || 'db';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    cache: 'ქეში',
    files: 'ფაილები',
    db: 'მონაცემთა ბაზა',
    logs: 'ლოგები',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto pb-6 space-y-3" style={{ maxHeight: 'calc(100vh - 150px)', WebkitOverflowScrolling: 'touch' }}>
      {/* Header Controls */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-yellow-500" />
            Cleanup Center
          </CardTitle>
          <CardDescription className="text-sm">
            რეგისტრირებული cleanup ელემენტები — ახალი ელემენტი ავტომატურად გამოჩნდება
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Time selector */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">შეინარჩუნე ბოლო:</span>
            <Select
              value={`${timeConfig.value}-${timeConfig.unit}`}
              onValueChange={(val) => {
                const [value, unit] = val.split('-');
                setTimeConfig({ value: parseInt(value), unit: unit as TimeUnit });
              }}
            >
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((opt) => (
                  <SelectItem key={`${opt.value}-${opt.unit}`} value={`${opt.value}-${opt.unit}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Global actions */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={scanAll} className="flex-1 min-w-[100px]">
              <Database className="h-4 w-4 mr-1" />
              სკანირება
            </Button>
            <Button size="sm" variant="default" onClick={startAll} className="flex-1 min-w-[100px]">
              <Play className="h-4 w-4 mr-1" />
              ყველა
            </Button>
            <Button size="sm" variant="destructive" onClick={stopAll} className="flex-1 min-w-[100px]">
              <Square className="h-4 w-4 mr-1" />
              გაჩერება
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items grouped by type */}
      {Object.entries(groupedItems).map(([type, typeItems]) => (
        <Card key={type} className="border-0 shadow-md">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {typeLabels[type] || type}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {typeItems.map((item) => {
              const run = latestRuns[item.id];
              const status = run?.status || 'idle';
              const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
              const riskConf = RISK_CONFIG[item.risk_level] || RISK_CONFIG.safe;
              const Icon = ICON_MAP[item.key] || Database;
              const RiskIcon = riskConf.icon;
              const estimate = estimates[item.id];
              const isRunning = status === 'running' && activeRunIds.has(run?.id);
              const isPaused = status === 'paused';

              return (
                <div key={item.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
                  {/* Row 1: Name + Status + Risk */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{item.title_ka}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConf.color}`}>
                        {statusConf.label}
                      </Badge>
                      <RiskIcon className={`h-3.5 w-3.5 ${riskConf.color}`} />
                    </div>
                  </div>

                  {/* Row 2: Estimate + Progress */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {estimate !== undefined && estimate >= 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        ~{estimate.toLocaleString()}
                      </Badge>
                    )}
                    {estimate === -1 && (
                      <Badge variant="outline" className="text-[10px]">N/A</Badge>
                    )}
                    {run && run.processed_count > 0 && (
                      <span>წაშლილი: {run.processed_count.toLocaleString()} ({run.processed_batches} ბეჩი)</span>
                    )}
                    {run?.last_error && (
                      <span className="text-red-400 truncate max-w-[150px]" title={run.last_error}>
                        ⚠ {run.last_error}
                      </span>
                    )}
                  </div>

                  {/* Row 2.5: Progress bar when running */}
                  {isRunning && (
                    <Progress value={Math.min(95, (run?.processed_batches || 0) * 3)} className="h-1.5" />
                  )}

                  {/* Row 3: Last run time + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {run?.started_at ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: ka }) : 'არასდროს'}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Start / Resume */}
                      {(status === 'idle' || status === 'done' || status === 'error') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => startCleanup(item)}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isPaused && run && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => resumeRun(run.id, item)}
                        >
                          <Play className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                      )}
                      {/* Pause */}
                      {isRunning && run && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => pauseRun(run.id)}
                        >
                          <Pause className="h-3.5 w-3.5 text-yellow-500" />
                        </Button>
                      )}
                      {/* Stop */}
                      {(isRunning || isPaused) && run && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => stopRun(run.id)}
                        >
                          <Square className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                      {/* Single scan */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => scanEstimate(item.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {items.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">რეგისტრირებული cleanup ელემენტები არ მოიძებნა</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
