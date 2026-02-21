import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle, XCircle, Bug, Database, Wifi, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorLog {
  id: string;
  type: 'uuid' | 'duplicate' | 'rls' | 'network' | 'other';
  message: string;
  table?: string;
  timestamp: Date;
  count: number;
}

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  lastChecked: Date;
}

const DebugPanel = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Only show for CHEGE
  const isChege = profile?.username?.toUpperCase() === 'CHEGE';

  const runHealthChecks = useCallback(async () => {
    const checks: HealthCheck[] = [];
    const now = new Date();

    // Check 1: Database connection
    try {
      const start = Date.now();
      await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;
      checks.push({
        name: 'Database კონექცია',
        status: latency < 500 ? 'ok' : latency < 2000 ? 'warning' : 'error',
        message: `${latency}ms latency`,
        lastChecked: now
      });
    } catch {
      checks.push({
        name: 'Database კონექცია',
        status: 'error',
        message: 'კავშირი ვერ დამყარდა',
        lastChecked: now
      });
    }

    // Check 2: Auth status
    checks.push({
      name: 'ავთენტიფიკაცია',
      status: user ? 'ok' : 'warning',
      message: user ? `შესული: ${user.email}` : 'არ ხართ შესული',
      lastChecked: now
    });

    // Check 3: Storage buckets
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const publicBuckets = buckets?.filter(b => b.public) || [];
      checks.push({
        name: 'Storage Buckets',
        status: publicBuckets.length >= 5 ? 'ok' : 'warning',
        message: `${buckets?.length || 0} buckets (${publicBuckets.length} public)`,
        lastChecked: now
      });
    } catch {
      checks.push({
        name: 'Storage Buckets',
        status: 'error',
        message: 'ვერ წაიკითხა',
        lastChecked: now
      });
    }

    // Check 4: Realtime connection
    try {
      const channel = supabase.channel('health-check');
      const status = channel.subscribe();
      checks.push({
        name: 'Realtime',
        status: 'ok',
        message: 'კავშირი აქტიურია',
        lastChecked: now
      });
      supabase.removeChannel(channel);
    } catch {
      checks.push({
        name: 'Realtime',
        status: 'error',
        message: 'კავშირი გაწყვეტილია',
        lastChecked: now
      });
    }

    // Check 5: Recent errors in console
    const errorCount = errors.filter(e => e.timestamp > new Date(Date.now() - 5 * 60 * 1000)).length;
    checks.push({
      name: 'ბოლო 5 წუთის ერორები',
      status: errorCount === 0 ? 'ok' : errorCount < 5 ? 'warning' : 'error',
      message: `${errorCount} ერორი`,
      lastChecked: now
    });

    setHealthChecks(checks);
  }, [user, errors]);

  const detectErrors = useCallback(() => {
    const detectedErrors: ErrorLog[] = [];
    const errorCounts = new Map<string, number>();

    // Intercept console errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.map(a => String(a)).join(' ');
      
      let type: ErrorLog['type'] = 'other';
      let table: string | undefined;
      
      if (message.includes('invalid input syntax for type uuid')) {
        type = 'uuid';
        const match = message.match(/table[:\s]+["']?(\w+)["']?/i);
        table = match?.[1];
      } else if (message.includes('duplicate key')) {
        type = 'duplicate';
        const match = message.match(/constraint[:\s]+["']?(\w+)["']?/i);
        table = match?.[1];
      } else if (message.includes('row-level security') || message.includes('RLS')) {
        type = 'rls';
      } else if (message.includes('network') || message.includes('fetch')) {
        type = 'network';
      }

      const key = `${type}-${message.slice(0, 100)}`;
      const count = (errorCounts.get(key) || 0) + 1;
      errorCounts.set(key, count);

      setErrors(prev => {
        const existing = prev.find(e => e.message.slice(0, 100) === message.slice(0, 100));
        if (existing) {
          return prev.map(e => 
            e.id === existing.id 
              ? { ...e, count: e.count + 1, timestamp: new Date() }
              : e
          );
        }
        return [...prev, {
          id: crypto.randomUUID(),
          type,
          message: message.slice(0, 200),
          table,
          timestamp: new Date(),
          count: 1
        }].slice(-50); // Keep last 50 errors
      });

      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await runHealthChecks();
    setLastRefresh(new Date());
    setLoading(false);
  }, [runHealthChecks]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  useEffect(() => {
    if (!isChege) return;
    
    const cleanup = detectErrors();
    refresh();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    
    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [isChege, detectErrors, refresh]);

  if (!isChege) return null;

  const errorsByType = {
    uuid: errors.filter(e => e.type === 'uuid'),
    duplicate: errors.filter(e => e.type === 'duplicate'),
    rls: errors.filter(e => e.type === 'rls'),
    network: errors.filter(e => e.type === 'network'),
    other: errors.filter(e => e.type === 'other')
  };

  const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);

  return (
    <>
      {/* Floating debug button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-colors ${
          totalErrors > 0 
            ? 'bg-destructive text-destructive-foreground animate-pulse' 
            : 'bg-primary text-primary-foreground'
        }`}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <Bug className="w-5 h-5" />
        {totalErrors > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {totalErrors > 99 ? '99+' : totalErrors}
          </span>
        )}
      </motion.button>

      {/* Debug panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" />
                <h2 className="font-bold">Debug Panel</h2>
                {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Health Checks */}
                  <section>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      სისტემის სტატუსი
                    </h3>
                    <div className="space-y-2">
                      {healthChecks.map((check, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            {check.status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                            {check.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="text-sm">{check.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{check.message}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Error Summary */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        ერორები ({totalErrors})
                      </h3>
                      <Button variant="ghost" size="sm" onClick={clearErrors}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        გასუფთავება
                      </Button>
                    </div>

                    {/* Error type badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {errorsByType.uuid.length > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          UUID ერორები: {errorsByType.uuid.reduce((s, e) => s + e.count, 0)}
                        </Badge>
                      )}
                      {errorsByType.duplicate.length > 0 && (
                        <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-600">
                          Duplicate Key: {errorsByType.duplicate.reduce((s, e) => s + e.count, 0)}
                        </Badge>
                      )}
                      {errorsByType.rls.length > 0 && (
                        <Badge variant="secondary" className="gap-1 bg-orange-500/20 text-orange-600">
                          RLS: {errorsByType.rls.reduce((s, e) => s + e.count, 0)}
                        </Badge>
                      )}
                      {errorsByType.network.length > 0 && (
                        <Badge variant="secondary" className="gap-1 bg-blue-500/20 text-blue-600">
                          Network: {errorsByType.network.reduce((s, e) => s + e.count, 0)}
                        </Badge>
                      )}
                    </div>

                    {/* Error list */}
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {errors.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          ✨ ერორები არ არის
                        </p>
                      ) : (
                        errors.slice().reverse().map(error => (
                          <div 
                            key={error.id} 
                            className={`p-2 rounded-lg text-xs ${
                              error.type === 'uuid' ? 'bg-red-500/10 border border-red-500/20' :
                              error.type === 'duplicate' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                              error.type === 'rls' ? 'bg-orange-500/10 border border-orange-500/20' :
                              'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-mono break-all flex-1">{error.message}</p>
                              <Badge variant="outline" className="shrink-0">×{error.count}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                              <span>{error.type.toUpperCase()}</span>
                              {error.table && <span>• {error.table}</span>}
                              <span>• {error.timestamp.toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Quick fixes */}
                  <section>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      სწრაფი გამოსწორებები
                    </h3>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        გვერდის განახლება
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          localStorage.clear();
                          sessionStorage.clear();
                          window.location.reload();
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        ქეშის გასუფთავება
                      </Button>
                    </div>
                  </section>

                  {/* Last refresh time */}
                  {lastRefresh && (
                    <p className="text-xs text-muted-foreground text-center">
                      ბოლო განახლება: {lastRefresh.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DebugPanel;
