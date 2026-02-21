import { useState, useRef, useCallback, useMemo } from 'react';
import { X, Image, Video, FileText, BarChart3, Loader2, Send, Calendar, Save, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';
import { HashtagMentionInput } from '@/components/hashtag';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GroupSettings } from '../types';
import PollCreator from './PollCreator';
import MediaPreview from './MediaPreview';
import SchedulePicker from './SchedulePicker';

interface GroupPostComposerProps {
  groupId: string;
  groupName: string;
  groupSlug?: string;
  groupAvatarUrl?: string | null;
  privacyType: 'public' | 'closed' | 'secret';
  settings?: GroupSettings | null;
  memberRole?: string;
  onPostCreated: () => void;
}

interface PollData {
  question: string;
  options: string[];
  isMultipleChoice: boolean;
  endsAt: string | null;
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'file';
}

const GroupPostComposer = ({
  groupId, groupName, groupSlug, groupAvatarUrl, privacyType,
  settings, memberRole, onPostCreated,
}: GroupPostComposerProps) => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { upload: s3Upload } = useS3Upload();

  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [postType, setPostType] = useState<'normal' | 'question' | 'announcement'>('normal');
  const [showPoll, setShowPoll] = useState(false);
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Permission check
  const canPostResult = useMemo(() => {
    if (!settings || !memberRole) return true;
    const whoCanPost = settings.who_can_post || 'members';
    if (whoCanPost === 'members') return true;
    if (whoCanPost === 'admins_mods_only') return ['owner', 'admin', 'moderator'].includes(memberRole);
    if (whoCanPost === 'admins_only') return ['owner', 'admin'].includes(memberRole);
    return true;
  }, [settings, memberRole]);

  const isAdminOrMod = memberRole && ['owner', 'admin', 'moderator'].includes(memberRole);
  const needsApproval = settings?.post_approval_required && !isAdminOrMod && !isSuperAdmin;

  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const files = e.target.files;
    if (!files) return;
    const maxFiles = 10;
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;

    Array.from(files).forEach(file => {
      if (mediaFiles.length >= maxFiles) {
        toast({ title: `მაქსიმუმ ${maxFiles} ფაილი`, variant: 'destructive' });
        return;
      }
      if (file.size > maxSize) {
        toast({ title: `ფაილი ძალიან დიდია (მაქს ${maxSize / 1024 / 1024}MB)`, variant: 'destructive' });
        return;
      }
      const preview = type === 'file' ? '' : URL.createObjectURL(file);
      setMediaFiles(prev => [...prev, { file, preview, type }]);
    });
    e.target.value = '';
  }, [mediaFiles.length, toast]);

  const removeMedia = useCallback((index: number) => {
    setMediaFiles(prev => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = useCallback(async (asDraft = false) => {
    if (!content.trim() && mediaFiles.length === 0 && !pollData) {
      toast({ title: 'დაწერეთ რამე ან ატვირთეთ მედია', variant: 'destructive' });
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      let status = 'published';
      let isApproved = !needsApproval;
      if (asDraft) { status = 'draft'; isApproved = false; }
      else if (scheduledAt) { status = 'scheduled'; isApproved = false; }
      else if (needsApproval) { status = 'pending'; isApproved = false; }

      const uploadedMedia: { url: string; type: string; fileName: string; fileSize: number; mimeType: string }[] = [];
      for (const media of mediaFiles) {
        const folder = media.type === 'video' ? S3_FOLDERS.VIDEOS : media.type === 'file' ? S3_FOLDERS.GROUP_FILES : S3_FOLDERS.POSTS;
        const result = await s3Upload(media.file, folder);
        if (result) {
          uploadedMedia.push({ url: result.url, type: media.type, fileName: media.file.name, fileSize: media.file.size, mimeType: media.file.type });
        }
      }

      const { data: postData, error: postError } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: content.trim() || null,
          image_url: uploadedMedia.find(m => m.type === 'image')?.url || null,
          video_url: uploadedMedia.find(m => m.type === 'video')?.url || null,
          post_type: postType,
          status,
          is_approved: isApproved,
          scheduled_at: scheduledAt || null,
          is_pinned: false,
        })
        .select()
        .single();

      if (postError) throw postError;

      if (uploadedMedia.length > 0 && postData) {
        await supabase.from('group_post_media').insert(
          uploadedMedia.map((m, i) => ({
            post_id: postData.id, media_type: m.type, url: m.url,
            file_name: m.fileName, file_size: m.fileSize, mime_type: m.mimeType, sort_order: i,
          }))
        );
      }

      if (pollData && postData) {
        const { data: poll } = await supabase.from('group_post_polls').insert({
          post_id: postData.id, question: pollData.question,
          is_multiple_choice: pollData.isMultipleChoice, ends_at: pollData.endsAt,
        }).select().single();

        if (poll) {
          await supabase.from('group_post_poll_options').insert(
            pollData.options.map((opt, i) => ({ poll_id: poll.id, option_text: opt, sort_order: i }))
          );
        }
      }

      if (status === 'published' && isApproved && privacyType === 'public' && postData) {
        const feedContent = `[group:${groupId}:${groupName}]\n${content.trim()}`;
        await supabase.from('posts').insert({
          user_id: user.id, content: feedContent,
          image_url: uploadedMedia.find(m => m.type === 'image')?.url || null,
          is_approved: true, post_type: 'group_post',
          metadata: { group_id: groupId, group_name: groupName, group_post_id: postData.id, group_slug: groupSlug, group_avatar_url: groupAvatarUrl, privacy_type: privacyType },
        });
      }

      const messages: Record<string, string> = { draft: 'დრაფტი შენახულია', scheduled: 'პოსტი დაიგეგმა', pending: 'პოსტი გაიგზავნა მოდერაციაზე', published: 'პოსტი გამოქვეყნდა!' };
      toast({ title: messages[status] || 'წარმატება!' });

      setContent(''); setMediaFiles([]); setPostType('normal');
      setShowPoll(false); setPollData(null); setShowSchedule(false);
      setScheduledAt(null); setIsExpanded(false);
      onPostCreated();
    } catch (error) {
      console.error('Error creating group post:', error);
      toast({ title: 'შეცდომა პოსტის შექმნისას', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [content, mediaFiles, pollData, user, needsApproval, scheduledAt, groupId, groupName, groupSlug, groupAvatarUrl, privacyType, postType, s3Upload, toast, onPostCreated]);

  if (!canPostResult) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 text-center">
        <p className="text-sm text-muted-foreground">ამ ჯგუფში პოსტის გამოქვეყნების უფლება არ გაქვთ</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleMediaSelect(e, 'image')} className="hidden" />
      <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleMediaSelect(e, 'video')} className="hidden" />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt" multiple onChange={(e) => handleMediaSelect(e, 'file')} className="hidden" />

      {isAdminOrMod && isExpanded && (
        <div className="flex gap-1 p-3 pb-0">
          {(['normal', 'question', 'announcement'] as const).map(type => (
            <button key={type} onClick={() => setPostType(type)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${postType === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              {type === 'normal' ? 'პოსტი' : type === 'question' ? 'კითხვა' : 'განცხადება'}
            </button>
          ))}
        </div>
      )}

      <div className="p-3">
        <HashtagMentionInput
          placeholder={postType === 'question' ? 'დასვით კითხვა... # და @' : 'დაწერე რამე... # და @'}
          value={content}
          onChange={(val) => { setContent(val); if (!isExpanded) setIsExpanded(true); }}
          className="min-h-[50px] border-none focus-visible:ring-0 text-[16px] bg-transparent placeholder:text-muted-foreground p-0"
          minRows={isExpanded ? 3 : 1}
          maxRows={8}
          autoFocus={false}
        />
      </div>

      {showPoll && (
        <div className="px-3 pb-3">
          <PollCreator onUpdate={setPollData} onRemove={() => { setShowPoll(false); setPollData(null); }} />
        </div>
      )}

      {mediaFiles.length > 0 && (
        <div className="px-3 pb-3">
          <MediaPreview files={mediaFiles} onRemove={removeMedia} />
        </div>
      )}

      {showSchedule && (
        <div className="px-3 pb-3">
          <SchedulePicker value={scheduledAt} onChange={setScheduledAt} onRemove={() => { setShowSchedule(false); setScheduledAt(null); }} />
        </div>
      )}

      {needsApproval && isExpanded && (
        <div className="mx-3 mb-3 px-3 py-2 bg-accent/50 border border-accent rounded-lg">
          <p className="text-xs text-accent-foreground">⚠️ ამ ჯგუფში პოსტები საჭიროებს მოდერაციას</p>
        </div>
      )}

      <div className="flex items-center justify-between px-2 py-2 border-t border-border">
        <div className="flex items-center gap-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-2 flex flex-col gap-1">
              <button onClick={() => { fileInputRef.current?.click(); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm text-foreground transition-colors">
                <Image className="w-4 h-4 text-primary" /> ფოტო
              </button>
              <button onClick={() => { videoInputRef.current?.click(); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm text-foreground transition-colors">
                <Video className="w-4 h-4 text-destructive" /> ვიდეო
              </button>
              <button onClick={() => { docInputRef.current?.click(); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm text-foreground transition-colors">
                <FileText className="w-4 h-4 text-blue-500" /> ფაილი
              </button>
            </PopoverContent>
          </Popover>
          <button onClick={() => { setShowPoll(!showPoll); if (showPoll) setPollData(null); }}
            className={`p-2 hover:bg-secondary rounded-lg transition-colors ${showPoll ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {isExpanded && (
            <Button onClick={() => handleSubmit(true)} variant="ghost" size="icon"
              disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0 && !pollData)} className="text-muted-foreground h-8 w-8" title="დრაფტი">
              <Save className="w-4 h-4" />
            </Button>
          )}
          {isExpanded && (
            <Button onClick={() => setShowSchedule(!showSchedule)} variant="ghost" size="icon"
              className={`h-8 w-8 ${showSchedule ? 'text-primary' : 'text-muted-foreground'}`} title="დაგეგმვა">
              <Calendar className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => handleSubmit(false)} disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0 && !pollData)} size="sm" className="h-8 px-3">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <><Send className="w-4 h-4 mr-1" /><span className="text-xs">გამოქვეყნება</span></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupPostComposer;
