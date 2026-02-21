import { useState, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Pin, Trash2, Edit, Flag, Lock, Megaphone, HelpCircle, FileText, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { GroupPost, GroupPostPoll } from '../types';
import GroupPostPollDisplay from './GroupPostPollDisplay';

interface GroupPostCardProps {
  post: GroupPost;
  isAdmin: boolean;
  isMember: boolean;
  privacyType: 'public' | 'closed' | 'secret';
  groupId: string;
  groupName: string;
  onRefresh: () => void;
  onUserClick?: (userId: string) => void;
  onShare?: (post: GroupPost) => void;
}

const GroupPostCard = ({
  post, isAdmin, isMember, privacyType, groupId, groupName,
  onRefresh, onUserClick, onShare,
}: GroupPostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const isAuthor = user?.id === post.user_id;

  const handleReaction = async () => {
    if (!user) return;
    if (post.is_liked) {
      await supabase.from('group_post_reactions').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('group_post_reactions').insert({ post_id: post.id, user_id: user.id, reaction_type: 'like' });
    }
    onRefresh();
  };

  const handleBookmark = async () => {
    if (!user) return;
    if (post.is_bookmarked) {
      await supabase.from('group_post_bookmarks').delete().eq('post_id', post.id).eq('user_id', user.id);
      toast({ title: 'სანიშნი წაიშალა' });
    } else {
      await supabase.from('group_post_bookmarks').insert({ post_id: post.id, user_id: user.id });
      toast({ title: 'სანიშნეში დაემატა' });
    }
    onRefresh();
  };

  const handlePin = async () => {
    await supabase.from('group_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    toast({ title: post.is_pinned ? 'პოსტი ჩამოიხსნა' : 'პოსტი მიემაგრა' });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm('ნამდვილად გსურთ წაშლა?')) return;
    await supabase.from('group_posts').delete().eq('id', post.id);
    toast({ title: 'პოსტი წაიშალა' });
    onRefresh();
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    await supabase.from('group_posts').update({
      content: editContent.trim(),
      edited_at: new Date().toISOString(),
    }).eq('id', post.id);
    setIsEditing(false);
    toast({ title: 'პოსტი განახლდა' });
    onRefresh();
  };

  const handleReport = async () => {
    if (!user) return;
    const { error } = await supabase.from('group_post_reports').insert({
      post_id: post.id,
      reporter_id: user.id,
      reason: 'inappropriate',
    });
    if (error?.code === '23505') {
      toast({ title: 'უკვე მოხსენებულია', variant: 'destructive' });
    } else {
      toast({ title: 'რეპორტი გაიგზავნა' });
    }
  };

  const handleSharePost = async () => {
    if (privacyType === 'secret') {
      toast({ title: 'საიდუმლო ჯგუფის პოსტი ვერ გაზიარდება', variant: 'destructive' });
      return;
    }
    const shareUrl = `${window.location.origin}/?group=${groupId}&post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: groupName, text: post.content || '', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'ლინკი დაკოპირდა! 📋' });
      }
    } catch {}
  };

  const postTypeIcon = post.post_type === 'announcement'
    ? <Megaphone className="w-3.5 h-3.5 text-primary" />
    : post.post_type === 'question'
      ? <HelpCircle className="w-3.5 h-3.5 text-primary" />
      : null;

  return (
    <div className={`bg-card border rounded-2xl p-4 space-y-3 ${post.is_pinned ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'}`}>
      {/* Pinned badge */}
      {post.is_pinned && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Pin className="w-3 h-3" /> მიმაგრებული
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 cursor-pointer" onClick={() => onUserClick?.(post.user_id)}>
          <AvatarImage src={post.author?.avatar_url || undefined} />
          <AvatarFallback>{post.author?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm text-foreground truncate">{post.author?.username || 'მომხმარებელი'}</p>
            {postTypeIcon}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{format(new Date(post.created_at), 'd MMM, HH:mm', { locale: ka })}</span>
            {post.edited_at && <span>• რედაქტირებული</span>}
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-secondary rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={handlePin}>
                  <Pin className="w-4 h-4 mr-2" />
                  {post.is_pinned ? 'ჩამოხსნა' : 'მიმაგრება'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {isAuthor && (
              <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(post.content || ''); }}>
                <Edit className="w-4 h-4 mr-2" /> რედაქტირება
              </DropdownMenuItem>
            )}
            {(isAuthor || isAdmin) && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> წაშლა
              </DropdownMenuItem>
            )}
            {!isAuthor && (
              <DropdownMenuItem onClick={handleReport}>
                <Flag className="w-4 h-4 mr-2" /> რეპორტი
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[80px] bg-secondary rounded-lg p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary text-[16px]"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground">გაუქმება</button>
            <button onClick={handleEdit} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg">შენახვა</button>
          </div>
        </div>
      ) : post.content ? (
        <div>
          <p className="text-foreground text-sm whitespace-pre-wrap">
            {post.content.length > 200 && !isExpanded
              ? post.content.slice(0, 200) + '...'
              : post.content}
          </p>
          {post.content.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-primary text-xs font-medium mt-1 hover:underline"
            >
              {isExpanded ? (
                <><ChevronUp className="w-3 h-3" /> ნაკლები</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> მეტის ნახვა</>
              )}
            </button>
          )}
        </div>
      ) : null}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className={`grid gap-1 rounded-xl overflow-hidden ${
          post.media.filter(m => m.media_type === 'image' || m.media_type === 'video').length === 1 ? 'grid-cols-1' :
          post.media.filter(m => m.media_type === 'image' || m.media_type === 'video').length === 2 ? 'grid-cols-2' : 'grid-cols-2'
        }`}>
          {post.media.filter(m => m.media_type === 'image' || m.media_type === 'video').slice(0, 4).map((m, i, arr) => (
            <div key={m.id} className={`relative ${arr.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
              {m.media_type === 'image' ? (
                <img src={m.url} alt="" className="w-full object-contain bg-secondary" style={{ maxHeight: arr.length === 1 ? '500px' : '300px' }} loading="lazy" />
              ) : (
                <div className="relative">
                  <video src={m.url} className="w-full object-contain bg-secondary" style={{ maxHeight: '500px' }} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="w-10 h-10 text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File attachments */}
      {post.media && post.media.filter(m => m.media_type === 'file').length > 0 && (
        <div className="space-y-1">
          {post.media.filter(m => m.media_type === 'file').map(m => (
            <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 hover:bg-secondary/80 transition-colors">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground truncate">{m.file_name || 'ფაილი'}</span>
              {m.file_size && <span className="text-xs text-muted-foreground ml-auto">{(m.file_size / 1024 / 1024).toFixed(1)}MB</span>}
            </a>
          ))}
        </div>
      )}

      {/* Single image fallback */}
      {!post.media?.length && post.image_url && (
        <img src={post.image_url} alt="" className="rounded-xl w-full max-h-80 object-cover" loading="lazy" />
      )}

      {/* Poll */}
      {post.poll && <GroupPostPollDisplay poll={post.poll} postId={post.id} onRefresh={onRefresh} />}

      {/* Interactions */}
      <div className="flex items-center gap-1 pt-1">
        <button onClick={handleReaction}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${post.is_liked ? 'text-destructive' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
          <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
          <span>{post.reactions_count || 0}</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count || 0}</span>
        </button>
        <button onClick={handleSharePost}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            privacyType === 'secret' ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          disabled={privacyType === 'secret'}>
          <Share2 className="w-4 h-4" />
          {privacyType === 'secret' && <Lock className="w-3 h-3" />}
        </button>
        <div className="flex-1" />
        <button onClick={handleBookmark}
          className={`p-2 rounded-lg transition-colors ${post.is_bookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
          <Bookmark className={`w-4 h-4 ${post.is_bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default GroupPostCard;
