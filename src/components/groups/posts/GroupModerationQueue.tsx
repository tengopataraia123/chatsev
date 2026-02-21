import { useState, useCallback } from 'react';
import { Check, X, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface PendingPost {
  id: string;
  content: string | null;
  image_url: string | null;
  user_id: string;
  created_at: string;
  author?: { username: string; avatar_url: string | null };
}

interface GroupModerationQueueProps {
  groupId: string;
  pendingPosts: PendingPost[];
  onRefresh: () => void;
}

const GroupModerationQueue = ({ groupId, pendingPosts, onRefresh }: GroupModerationQueueProps) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = useCallback(async (postId: string) => {
    setProcessing(postId);
    try {
      await supabase.from('group_posts').update({
        is_approved: true,
        status: 'published',
      }).eq('id', postId);
      toast({ title: 'პოსტი დამტკიცდა ✅' });
      onRefresh();
    } finally {
      setProcessing(null);
    }
  }, [toast, onRefresh]);

  const handleReject = useCallback(async (postId: string) => {
    setProcessing(postId);
    try {
      await supabase.from('group_posts').delete().eq('id', postId);
      toast({ title: 'პოსტი უარყოფილია' });
      onRefresh();
    } finally {
      setProcessing(null);
    }
  }, [toast, onRefresh]);

  if (pendingPosts.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-accent/30">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">მოდერაციის რიგი ({pendingPosts.length})</h3>
      </div>

      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {pendingPosts.map(post => (
          <div key={post.id} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.author?.avatar_url || undefined} />
                <AvatarFallback>{post.author?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{post.author?.username}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(post.created_at), 'd MMM, HH:mm', { locale: ka })}</p>
              </div>
            </div>

            {post.content && <p className="text-sm text-foreground line-clamp-3">{post.content}</p>}
            {post.image_url && <img src={post.image_url} alt="" className="w-full max-h-32 object-cover rounded-lg" />}

            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleApprove(post.id)} disabled={processing === post.id} className="flex-1">
                {processing === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> დამტკიცება</>}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleReject(post.id)} disabled={processing === post.id} className="flex-1">
                <X className="w-4 h-4 mr-1" /> უარყოფა
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupModerationQueue;
