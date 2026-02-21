import { useState } from 'react';
import { ArrowLeft, Plus, Search, Users, Loader2, Mail } from 'lucide-react';
import { useGroups } from './hooks/useGroups';
import GroupCard from './GroupCard';
import GroupDetail from './GroupDetail';
import CreateGroupModal from './CreateGroupModal';
import { GroupTab } from './types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface GroupsViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

const GroupsView = ({ onBack, onUserClick }: GroupsViewProps) => {
  const { user, isSuperAdmin } = useAuth();
  const { groups, loading, activeTab, setActiveTab, searchQuery, setSearchQuery, refresh } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    const stored = sessionStorage.getItem('openGroupId');
    if (stored) {
      sessionStorage.removeItem('openGroupId');
      return stored;
    }
    return null;
  });
  const [showCreate, setShowCreate] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesCount, setInvitesCount] = useState(0);

  // Fetch invites count
  useEffect(() => {
    if (!user) return;
    supabase.from('group_invites')
      .select('id, group_id, created_at', { count: 'exact' })
      .eq('invited_user_id', user.id)
      .eq('status', 'pending')
      .then(({ data, count }) => {
        setInvites(data || []);
        setInvitesCount(count || 0);
      });
  }, [user]);

  const tabs: { id: GroupTab; label: string }[] = [
    { id: 'all', label: 'ყველა' },
    { id: 'my-groups', label: 'ჩემი' },
    { id: 'joined', label: 'გაწევრიანებული' },
    { id: 'friends', label: 'მეგობრების' },
    { id: 'invites', label: `მოწვევები${invitesCount > 0 ? ` (${invitesCount})` : ''}` },
  ];

  // If a group is selected, show detail
  if (selectedGroupId) {
    return (
      <GroupDetail
        groupId={selectedGroupId}
        onBack={() => setSelectedGroupId(null)}
        onUserClick={onUserClick}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">ჯგუფები</h1>
          {isSuperAdmin && (
            <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1 flex-shrink-0 text-xs px-3 h-8">
              <Plus className="w-3.5 h-3.5" />
              შექმნა
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძიება..."
              className="pl-9 h-9 text-[16px]"
            />
          </div>
        </div>

        {/* Tabs - scrollable */}
        <div className="flex overflow-x-auto scrollbar-hide px-3 gap-1.5 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full whitespace-nowrap transition-colors flex-shrink-0 min-h-[32px] ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === 'invites' ? (
          // Invites Tab
          <div className="space-y-3">
            {invitesCount === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">მოწვევები არ გაქვთ</p>
              </div>
            ) : (
              invites.map(invite => (
                <div key={invite.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <Users className="w-10 h-10 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">ჯგუფში მოწვევა</p>
                    <p className="text-xs text-muted-foreground">ID: {invite.group_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={async () => {
                      await supabase.from('group_invites').update({ status: 'accepted' }).eq('id', invite.id);
                      await supabase.from('group_members').insert({
                        group_id: invite.group_id,
                        user_id: user!.id,
                        role: 'member',
                        status: 'active',
                      });
                      refresh();
                    }}>
                      მიღება
                    </Button>
                    <Button size="sm" variant="secondary" onClick={async () => {
                      await supabase.from('group_invites').update({ status: 'declined' }).eq('id', invite.id);
                      refresh();
                    }}>
                      უარყოფა
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">ჯგუფები ვერ მოიძებნა</p>
            {isSuperAdmin && (
              <Button onClick={() => setShowCreate(true)} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                შექმენი პირველი ჯგუფი
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={setSelectedGroupId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateGroupModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => { setSelectedGroupId(id); refresh(); }}
      />
    </div>
  );
};

export default GroupsView;
