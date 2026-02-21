import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Group, GroupMember, GroupSettings, GroupPost, GroupPostMedia, GroupPostPoll } from '../types';

export function useGroupDetail(groupId: string | null) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [membership, setMembership] = useState<GroupMember | null>(null);
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');

  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (!groupData) return;
      setGroup(groupData as Group);

      if (user) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();
        setMembership(memberData as GroupMember | null);
      }

      const { data: settingsData } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle();
      setSettings(settingsData as GroupSettings | null);
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  const fetchMembers = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'active')
      .order('role', { ascending: true })
      .limit(100);

    if (data) {
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_verified, gender')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setMembers(data.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || undefined,
      })) as GroupMember[]);
    }
  }, [groupId]);

  const fetchPosts = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_posts')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'published')
      .eq('is_approved', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const postIds = data.map(p => p.id);

      // Fetch profiles, reactions, comments, media, polls, bookmarks in parallel
      const [profilesRes, reactionsRes, commentsRes, mediaRes, pollsRes, userReactionsRes, bookmarksRes] = await Promise.all([
        supabase.from('profiles').select('user_id, username, avatar_url, is_verified, gender').in('user_id', userIds),
        supabase.from('group_post_reactions').select('post_id').in('post_id', postIds),
        supabase.from('group_post_comments').select('post_id').in('post_id', postIds),
        supabase.from('group_post_media').select('*').in('post_id', postIds).order('sort_order'),
        supabase.from('group_post_polls').select('*').in('post_id', postIds),
        user ? supabase.from('group_post_reactions').select('post_id').eq('user_id', user.id).in('post_id', postIds) : Promise.resolve({ data: [] }),
        user ? supabase.from('group_post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds) : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);

      const reactionsMap = new Map<string, number>();
      const commentsMap = new Map<string, number>();
      reactionsRes.data?.forEach(r => reactionsMap.set(r.post_id, (reactionsMap.get(r.post_id) || 0) + 1));
      commentsRes.data?.forEach(c => commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1));

      const userReactedSet = new Set(userReactionsRes.data?.map((r: any) => r.post_id) || []);
      const userBookmarkSet = new Set(bookmarksRes.data?.map((b: any) => b.post_id) || []);

      // Group media by post
      const mediaMap = new Map<string, GroupPostMedia[]>();
      mediaRes.data?.forEach((m: any) => {
        const arr = mediaMap.get(m.post_id) || [];
        arr.push(m as GroupPostMedia);
        mediaMap.set(m.post_id, arr);
      });

      // Fetch poll options & user votes for each poll
      const pollMap = new Map<string, GroupPostPoll>();
      if (pollsRes.data && pollsRes.data.length > 0) {
        const pollIds = pollsRes.data.map((p: any) => p.id);
        const [optionsRes, votesRes] = await Promise.all([
          supabase.from('group_post_poll_options').select('*').in('poll_id', pollIds).order('sort_order'),
          user ? supabase.from('group_post_poll_votes').select('poll_id, option_id').eq('user_id', user.id).in('poll_id', pollIds) : Promise.resolve({ data: [] }),
        ]);

        const optionsMap = new Map<string, any[]>();
        optionsRes.data?.forEach((o: any) => {
          const arr = optionsMap.get(o.poll_id) || [];
          arr.push(o);
          optionsMap.set(o.poll_id, arr);
        });

        const userVotesMap = new Map<string, string[]>();
        votesRes.data?.forEach((v: any) => {
          const arr = userVotesMap.get(v.poll_id) || [];
          arr.push(v.option_id);
          userVotesMap.set(v.poll_id, arr);
        });

        pollsRes.data.forEach((p: any) => {
          pollMap.set(p.post_id, {
            ...p,
            options: optionsMap.get(p.id) || [],
            user_votes: userVotesMap.get(p.id) || [],
          } as GroupPostPoll);
        });
      }

      setPosts(data.map(p => ({
        ...p,
        author: profileMap.get(p.user_id) || undefined,
        media: mediaMap.get(p.id) || [],
        poll: pollMap.get(p.id) || undefined,
        reactions_count: reactionsMap.get(p.id) || 0,
        comments_count: commentsMap.get(p.id) || 0,
        is_liked: userReactedSet.has(p.id),
        is_bookmarked: userBookmarkSet.has(p.id),
      })) as GroupPost[]);
    }
  }, [groupId, user]);

  const fetchPendingPosts = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_posts')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .eq('is_approved', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setPendingPosts(data.map(p => ({
        ...p,
        author: profileMap.get(p.user_id) || undefined,
      })));
    }
  }, [groupId]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);
  useEffect(() => { if (activeTab === 'members') fetchMembers(); }, [activeTab, fetchMembers]);
  useEffect(() => {
    if (activeTab === 'feed') {
      fetchPosts();
      fetchPendingPosts();
    }
  }, [activeTab, fetchPosts, fetchPendingPosts]);

  // Actions
  const joinGroup = useCallback(async () => {
    if (!user || !groupId || !group) return;
    const status = group.privacy_type === 'public' ? 'active' : 'pending';
    await supabase.from('group_members').insert({
      group_id: groupId, user_id: user.id, role: 'member', status,
    });
    fetchGroup();
  }, [user, groupId, group, fetchGroup]);

  const leaveGroup = useCallback(async () => {
    if (!user || !groupId) return;
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
    setMembership(null);
    fetchGroup();
  }, [user, groupId, fetchGroup]);

  return {
    group, membership, settings, members, posts, pendingPosts,
    loading, activeTab, setActiveTab,
    joinGroup, leaveGroup,
    refreshPosts: fetchPosts,
    refreshMembers: fetchMembers,
    refreshGroup: fetchGroup,
    refreshPending: fetchPendingPosts,
  };
}
