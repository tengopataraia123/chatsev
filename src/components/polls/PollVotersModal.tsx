import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, EyeOff } from 'lucide-react';

interface PollVotersModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: string;
  options: string[];
  isAnonymous: boolean;
  onUserClick?: (userId: string) => void;
}

interface Voter {
  user_id: string;
  option_index: number;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

const PollVotersModal = ({ isOpen, onClose, pollId, options, isAnonymous, onUserClick }: PollVotersModalProps) => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchVoters();
    }
  }, [isOpen, pollId]);

  const fetchVoters = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('poll_votes')
        .select('user_id, option_index')
        .eq('poll_id', pollId);

      if (data && data.length > 0) {
        // Fetch profiles for all voters
        const userIds = [...new Set(data.map(v => v.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const votersWithProfiles = data.map(vote => ({
          ...vote,
          profile: profiles?.find(p => p.user_id === vote.user_id)
        }));

        setVoters(votersWithProfiles);
      } else {
        setVoters([]);
      }
    } catch (error) {
      console.error('Error fetching voters:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVotersByOption = (optionIndex: number) => {
    return voters.filter(v => v.option_index === optionIndex);
  };

  const handleUserClick = (userId: string) => {
    onClose();
    onUserClick?.(userId);
  };

  if (isAnonymous) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="w-5 h-5" />
              ანონიმური გამოკითხვა
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <EyeOff className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              ეს გამოკითხვა ანონიმურია. ხმის მიმცემები არ ჩანს.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 shrink-0" />
            ხმის მიმცემები
            <Badge variant="secondary" className="ml-2">{voters.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : voters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">ჯერ არავის მიუცია ხმა</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-hidden">
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <TabsList className="inline-flex w-auto min-w-full">
                <TabsTrigger value="all" className="flex-shrink-0 text-xs">
                  ყველა ({voters.length})
                </TabsTrigger>
                {options.map((option, index) => (
                  <TabsTrigger key={index} value={`option-${index}`} className="flex-shrink-0 text-xs">
                    {option.length > 10 ? option.slice(0, 10) + '…' : option} ({getVotersByOption(index).length})
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="h-[300px] mt-4">
              <TabsContent value="all" className="mt-0 space-y-2 pr-2">
                {voters.map((voter, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors overflow-hidden"
                    onClick={() => handleUserClick(voter.user_id)}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={voter.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {voter.profile?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate min-w-0 flex-1">{voter.profile?.username || 'უცნობი'}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 max-w-[40%] truncate text-right">
                      {options[voter.option_index]}
                    </span>
                  </div>
                ))}
              </TabsContent>

              {options.map((option, index) => (
                <TabsContent key={index} value={`option-${index}`} className="mt-0 space-y-2 pr-2">
                  {getVotersByOption(index).length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      არავის აურჩევია ეს ვარიანტი
                    </p>
                  ) : (
                    getVotersByOption(index).map((voter, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors overflow-hidden"
                        onClick={() => handleUserClick(voter.user_id)}
                      >
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={voter.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {voter.profile?.username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm truncate">{voter.profile?.username || 'უცნობი'}</span>
                      </div>
                    ))
                  )}
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PollVotersModal;
