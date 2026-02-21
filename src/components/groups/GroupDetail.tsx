import { useState, useRef } from 'react';
import { ArrowLeft, Users, Lock, Eye, EyeOff, MoreHorizontal, Share2, Flag, LogOut, UserPlus, Loader2, Camera, Trash2, Copy, Plus } from 'lucide-react';
import { useGroupDetail } from './hooks/useGroupDetail';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { GroupPostComposer } from './composer';
import { GroupPostCard, GroupModerationQueue } from './posts';

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

const GroupDetail = ({ groupId, onBack, onUserClick }: GroupDetailProps) => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const {
    group, membership, settings, members, posts, pendingPosts, loading,
    activeTab, setActiveTab, joinGroup, leaveGroup, refreshPosts, refreshGroup, refreshPending
  } = useGroupDetail(groupId);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showMobileComposer, setShowMobileComposer] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin' || membership?.role === 'moderator' || isOwner;
  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const canEdit = isAdmin || isSuperAdmin;
  const memberRole = membership?.role;

  const privacyConfig = {
    public: { icon: Eye, label: 'საჯარო', color: 'text-primary' },
    closed: { icon: Lock, label: 'დახურული', color: 'text-accent-foreground' },
    secret: { icon: EyeOff, label: 'საიდუმლო', color: 'text-destructive' },
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !group) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${groupId}/avatar_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('group-assets').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('group-assets').getPublicUrl(path);
      await supabase.from('groups').update({ group_avatar_url: publicUrl }).eq('id', groupId);
      refreshGroup();
      toast({ title: 'ავატარი განახლდა! ✅' });
    } catch (err) {
      toast({ title: 'შეცდომა ავატარის ატვირთვისას', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !group) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${groupId}/cover_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('group-assets').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('group-assets').getPublicUrl(path);
      await supabase.from('groups').update({ group_cover_url: publicUrl }).eq('id', groupId);
      refreshGroup();
      toast({ title: 'ქოვერი განახლდა! ✅' });
    } catch (err) {
      toast({ title: 'შეცდომა ქოვერის ატვირთვისას', variant: 'destructive' });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleShare = async () => {
    if (!group) return;
    const shareUrl = `${window.location.origin}/?group=${group.group_slug || group.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: group.name, text: group.description || `შემოუერთდი ჯგუფს: ${group.name}`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'ლინკი დაკოპირდა! 📋' });
      }
    } catch {}
  };

  const handleCopyLink = async () => {
    if (!group) return;
    await navigator.clipboard.writeText(`${window.location.origin}/?group=${group.group_slug || group.id}`);
    toast({ title: 'ლინკი დაკოპირდა! 📋' });
  };

  const handleDeleteAvatar = async () => {
    if (!group) return;
    await supabase.from('groups').update({ group_avatar_url: null }).eq('id', groupId);
    refreshGroup();
    toast({ title: 'ავატარი წაიშალა' });
  };

  const handleDeleteCover = async () => {
    if (!group) return;
    await supabase.from('groups').update({ group_cover_url: null }).eq('id', groupId);
    refreshGroup();
    toast({ title: 'ქოვერი წაიშალა' });
  };

  const handlePostCreated = () => {
    refreshPosts();
    refreshPending();
    setShowMobileComposer(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">ჯგუფი ვერ მოიძებნა</p>
        <Button onClick={onBack} variant="ghost" className="mt-4">უკან</Button>
      </div>
    );
  }

  const privacy = privacyConfig[group.privacy_type];
  const PrivacyIcon = privacy.icon;

  const tabs = [
    { id: 'feed', label: 'ფიდი' },
    { id: 'members', label: `წევრები (${group.member_count})` },
    { id: 'photos', label: 'ფოტო' },
    { id: 'about', label: 'შესახებ' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 p-3">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold truncate flex-1">{group.name}</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-secondary rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" /> გაზიარება
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" /> ლინკის კოპირება
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => avatarInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> ავატარის შეცვლა
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => coverInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> ქოვერის შეცვლა
                  </DropdownMenuItem>
                  {group.group_avatar_url && (
                    <DropdownMenuItem onClick={handleDeleteAvatar} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> ავატარის წაშლა
                    </DropdownMenuItem>
                  )}
                  {group.group_cover_url && (
                    <DropdownMenuItem onClick={handleDeleteCover} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> ქოვერის წაშლა
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {isMember && !isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={leaveGroup} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> ჯგუფის დატოვება
                  </DropdownMenuItem>
                </>
              )}
              {!canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Flag className="w-4 h-4 mr-2" /> რეპორტი
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cover */}
      <div className="relative h-40 bg-gradient-to-br from-primary/30 to-accent/30">
        {group.group_cover_url && <img src={group.group_cover_url} alt="" className="w-full h-full object-cover" />}
        {canEdit && (
          <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
            className="absolute bottom-2 right-2 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-lg flex items-center gap-2 text-foreground text-xs font-medium hover:bg-card transition-colors shadow-lg disabled:opacity-50">
            {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <span className="hidden sm:inline">ქოვერის შეცვლა</span>
          </button>
        )}
      </div>

      {/* Group Info */}
      <div className="px-4 pb-3 -mt-8">
        <div className="flex items-end gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl border-4 border-background bg-secondary overflow-hidden">
              {group.group_avatar_url ? (
                <img src={group.group_avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Users className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
            {canEdit && (
              <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center shadow-lg border-2 border-background disabled:opacity-50">
                {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-foreground" /> : <Camera className="w-3.5 h-3.5 text-primary-foreground" />}
              </button>
            )}
          </div>
          <div className="flex-1 pb-1">
            <h2 className="text-lg font-bold text-foreground">{group.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <PrivacyIcon className={`w-3.5 h-3.5 ${privacy.color}`} />
              <span className="text-xs text-muted-foreground">{privacy.label}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{group.member_count} წევრი</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          {!membership && (
            <Button onClick={joinGroup} className="flex-1">
              <UserPlus className="w-4 h-4 mr-2" />
              {group.privacy_type === 'public' ? 'შემოერთება' : 'მოთხოვნის გაგზავნა'}
            </Button>
          )}
          {isPending && <Button disabled variant="secondary" className="flex-1">მოლოდინის რეჟიმში</Button>}
          {isMember && !isOwner && (
            <Button onClick={leaveGroup} variant="secondary" className="flex-1">
              <LogOut className="w-4 h-4 mr-2" /> დატოვება
            </Button>
          )}
          {isMember && (
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Moderation Queue (admin only) */}
            {isAdmin && pendingPosts.length > 0 && (
              <GroupModerationQueue
                groupId={groupId}
                pendingPosts={pendingPosts}
                onRefresh={handlePostCreated}
              />
            )}

            {/* Composer */}
            {isMember && (
              <>
                {/* Desktop composer */}
                <div className="hidden sm:block">
                  <GroupPostComposer
                    groupId={groupId}
                    groupName={group.name}
                    groupSlug={group.group_slug}
                    groupAvatarUrl={group.group_avatar_url}
                    privacyType={group.privacy_type}
                    settings={settings}
                    memberRole={memberRole}
                    onPostCreated={handlePostCreated}
                  />
                </div>

                {/* Mobile: Show compact or full composer */}
                <div className="sm:hidden">
                  {showMobileComposer ? (
                    <div className="space-y-2">
                      <GroupPostComposer
                        groupId={groupId}
                        groupName={group.name}
                        groupSlug={group.group_slug}
                        groupAvatarUrl={group.group_avatar_url}
                        privacyType={group.privacy_type}
                        settings={settings}
                        memberRole={memberRole}
                        onPostCreated={handlePostCreated}
                      />
                      <button onClick={() => setShowMobileComposer(false)} className="w-full text-xs text-muted-foreground py-1">
                        დახურვა
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMobileComposer(true)}
                      className="w-full bg-card border border-border rounded-2xl p-3 text-left text-muted-foreground text-sm"
                    >
                      დაწერე რამე...
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Posts */}
            {posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ჯერ პოსტები არ არის</p>
            ) : (
              posts.map(post => (
                <GroupPostCard
                  key={post.id}
                  post={post}
                  isAdmin={!!isAdmin}
                  isMember={!!isMember}
                  privacyType={group.privacy_type}
                  groupId={groupId}
                  groupName={group.name}
                  onRefresh={refreshPosts}
                  onUserClick={onUserClick}
                />
              ))
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-2">
            {members.map(member => (
              <button key={member.id} onClick={() => onUserClick?.(member.user_id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback>{member.profile?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{member.profile?.username || 'მომხმარებელი'}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                </div>
                {member.role !== 'member' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.role === 'owner' ? 'bg-primary/10 text-primary' :
                    member.role === 'admin' ? 'bg-primary/10 text-primary' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {member.role === 'owner' ? 'მფლობელი' : member.role === 'admin' ? 'ადმინი' : 'მოდერატორი'}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            {group.description && (
              <div>
                <h3 className="font-medium text-foreground mb-1">აღწერა</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{group.description}</p>
              </div>
            )}
            <div>
              <h3 className="font-medium text-foreground mb-1">ინფორმაცია</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>პრივატულობა: {privacy.label}</p>
                <p>წევრები: {group.member_count}</p>
                <p>შექმნილი: {format(new Date(group.created_at), 'd MMMM, yyyy', { locale: ka })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="text-center text-muted-foreground py-8">ფოტოები მალე დაემატება</div>
        )}
      </div>

      {/* Mobile FAB for new post */}
      {isMember && !showMobileComposer && activeTab === 'feed' && (
        <button
          onClick={() => setShowMobileComposer(true)}
          className="sm:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default GroupDetail;
