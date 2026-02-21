/**
 * Create Group Modal
 */
import { useState, useEffect, useMemo } from 'react';
import { X, Search, Users, Plus, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAvatarUrl } from '@/lib/avatar';
import { toast } from 'sonner';

interface Friend {
  user_id: string;
  username: string;
  avatar_url: string | null;
  gender?: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<string | null>;
}

const CreateGroupModal = ({ isOpen, onClose, onCreateGroup }: CreateGroupModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'members' | 'name'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Fetch friends list
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    
    const fetchFriends = async () => {
      setLoading(true);
      try {
        // Get accepted friendships
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted');
        
        if (!friendships || friendships.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }
        
        const friendIds = friendships.map(f => 
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, gender')
          .in('user_id', friendIds)
          .order('username');
        
        setFriends(profiles || []);
      } catch (err) {
        console.error('Error fetching friends:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFriends();
  }, [isOpen, user?.id]);

  // Filter friends by search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(f => f.username.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleNext = () => {
    if (selectedIds.length === 0) {
      toast.error('აირჩიეთ მინიმუმ ერთი მეგობარი');
      return;
    }
    setStep('name');
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('შეიყვანეთ ჯგუფის სახელი');
      return;
    }
    
    setCreating(true);
    try {
      const groupId = await onCreateGroup(groupName.trim(), selectedIds);
      if (groupId) {
        toast.success('ჯგუფი შეიქმნა');
        handleClose();
      } else {
        toast.error('ჯგუფის შექმნა ვერ მოხერხდა');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep('members');
    setSearchQuery('');
    setSelectedIds([]);
    setGroupName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {step === 'members' ? 'ახალი ჯგუფი' : 'ჯგუფის სახელი'}
          </DialogTitle>
        </DialogHeader>

        {step === 'members' ? (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="მეგობრების ძებნა..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected preview */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">არჩეული:</span>
                <div className="flex -space-x-2">
                  {selectedIds.slice(0, 5).map(id => {
                    const friend = friends.find(f => f.user_id === id);
                    return (
                      <Avatar key={id} className="w-7 h-7 border-2 border-background">
                        <AvatarImage src={getAvatarUrl(friend?.avatar_url || null, friend?.gender)} />
                        <AvatarFallback>{friend?.username?.[0]}</AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {selectedIds.length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background">
                      +{selectedIds.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Friends list */}
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'მეგობარი ვერ მოიძებნა' : 'მეგობრები არ გყავთ'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredFriends.map(friend => {
                    const isSelected = selectedIds.includes(friend.user_id);
                    return (
                      <button
                        key={friend.user_id}
                        onClick={() => toggleSelect(friend.user_id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                          isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getAvatarUrl(friend.avatar_url, friend.gender)} />
                          <AvatarFallback>{friend.username[0]}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-left font-medium">{friend.username}</span>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          isSelected 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                გაუქმება
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleNext}
                disabled={selectedIds.length === 0}
              >
                შემდეგი
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="ჯგუფის სახელი"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
              maxLength={50}
            />
            
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} მონაწილე არჩეული
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('members')}>
                უკან
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreate}
                disabled={!groupName.trim() || creating}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'შექმნა'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
