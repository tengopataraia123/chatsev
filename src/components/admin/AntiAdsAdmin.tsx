import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Save, X, Shield, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface BlockedDomain {
  id: string;
  domain: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdViolation {
  id: string;
  user_id: string;
  target_user_id: string | null;
  original_text: string;
  filtered_text: string;
  detected_domain: string;
  context_type: string;
  created_at: string;
  is_read: boolean;
  user_profile?: { username: string; avatar_url: string | null };
  target_profile?: { username: string; avatar_url: string | null };
}

export const AntiAdsAdmin = () => {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [violations, setViolations] = useState<AdViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState<'domains' | 'violations'>('domains');
  const { toast } = useToast();

  const fetchDomains = async () => {
    const { data, error } = await supabase
      .from('blocked_domains')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'შეცდომა', description: 'დომენების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } else {
      setDomains(data || []);
    }
  };

  const fetchViolations = async () => {
    const { data, error } = await supabase
      .from('ad_violations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching violations:', error);
      return;
    }

    // Fetch user profiles for violations
    if (data && data.length > 0) {
      const userIds = [...new Set([
        ...data.map(v => v.user_id),
        ...data.filter(v => v.target_user_id).map(v => v.target_user_id)
      ])].filter(Boolean);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedViolations = data.map(v => ({
        ...v,
        user_profile: profileMap.get(v.user_id),
        target_profile: v.target_user_id ? profileMap.get(v.target_user_id) : undefined
      }));

      setViolations(enrichedViolations);
    } else {
      setViolations([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDomains(), fetchViolations()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const addDomain = async () => {
    if (!newDomain.trim()) return;

    const cleanDomain = newDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');

    const { error } = await supabase
      .from('blocked_domains')
      .insert({ domain: cleanDomain });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'შეცდომა', description: 'ეს დომენი უკვე დამატებულია', variant: 'destructive' });
      } else {
        toast({ title: 'შეცდომა', description: 'დომენის დამატება ვერ მოხერხდა', variant: 'destructive' });
      }
    } else {
      toast({ title: 'წარმატება', description: 'დომენი დამატებულია' });
      setNewDomain('');
      fetchDomains();
    }
  };

  const deleteDomain = async (id: string) => {
    const { error } = await supabase
      .from('blocked_domains')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'შეცდომა', description: 'წაშლა ვერ მოხერხდა', variant: 'destructive' });
    } else {
      toast({ title: 'წარმატება', description: 'დომენი წაშლილია' });
      fetchDomains();
    }
  };

  const toggleDomain = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('blocked_domains')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({ title: 'შეცდომა', description: 'სტატუსის შეცვლა ვერ მოხერხდა', variant: 'destructive' });
    } else {
      fetchDomains();
    }
  };

  const startEdit = (domain: BlockedDomain) => {
    setEditingId(domain.id);
    setEditValue(domain.domain);
  };

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) return;

    const cleanDomain = editValue.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');

    const { error } = await supabase
      .from('blocked_domains')
      .update({ domain: cleanDomain })
      .eq('id', editingId);

    if (error) {
      toast({ title: 'შეცდომა', description: 'რედაქტირება ვერ მოხერხდა', variant: 'destructive' });
    } else {
      toast({ title: 'წარმატება', description: 'დომენი განახლებულია' });
      setEditingId(null);
      setEditValue('');
      fetchDomains();
    }
  };

  const contextLabels: Record<string, string> = {
    private_message: 'პირადი შეტყობინება',
    group_chat: 'ჯგუფური ჩატი',
    comment: 'კომენტარი',
    post: 'პოსტი',
    unknown: 'უცნობი'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-120px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
    <div className="space-y-6 pb-6 pr-4">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">ანტირეკლამა</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'domains' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('domains')}
          size="sm"
        >
          აკრძალული დომენები ({domains.length})
        </Button>
        <Button
          variant={activeTab === 'violations' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('violations')}
          size="sm"
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          დარღვევები ({violations.filter(v => !v.is_read).length})
        </Button>
      </div>

      {activeTab === 'domains' && (
        <div className="space-y-4">
          {/* Add new domain */}
          <div className="flex gap-2">
            <Input
              placeholder="დაამატე დომენი (მაგ: example.ge)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              className="flex-1"
            />
            <Button onClick={addDomain} disabled={!newDomain.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              დამატება
            </Button>
          </div>

          {/* Domain list */}
          <div className="space-y-2">
            {domains.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                აკრძალული დომენები არ არის
              </p>
            ) : (
              domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border"
                >
                  {editingId === domain.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={saveEdit}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className={domain.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}>
                          {domain.domain}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(domain.created_at), 'dd MMM yyyy', { locale: ka })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={domain.is_active}
                          onCheckedChange={() => toggleDomain(domain.id, domain.is_active)}
                        />
                        <Button size="sm" variant="ghost" onClick={() => startEdit(domain)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteDomain(domain.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="space-y-3">
          {violations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              დარღვევები არ არის
            </p>
          ) : (
            violations.map((violation) => (
              <div
                key={violation.id}
                className={`p-4 rounded-lg border ${!violation.is_read ? 'bg-destructive/10 border-destructive/30' : 'bg-card'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">
                      {violation.detected_domain}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                      {contextLabels[violation.context_type] || violation.context_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {format(new Date(violation.created_at), 'dd.MM.yyyy HH:mm', { locale: ka })}
                  </div>
                </div>

                <div className="text-sm mb-2">
                  <span className="text-muted-foreground">მომხმარებელი: </span>
                  <span className="font-medium">{violation.user_profile?.username || 'უცნობი'}</span>
                  {violation.target_profile && (
                    <>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{violation.target_profile.username}</span>
                    </>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <div className="p-2 bg-destructive/5 rounded border border-destructive/20">
                    <span className="text-muted-foreground">ორიგინალი: </span>
                    <span className="text-destructive">{violation.original_text}</span>
                  </div>
                  <div className="p-2 bg-secondary/50 rounded">
                    <span className="text-muted-foreground">გაფილტრული: </span>
                    <span>{violation.filtered_text}</span>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/profile/${violation.user_id}`}
                  >
                    პროფილზე გადასვლა
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
    </ScrollArea>
  );
};
