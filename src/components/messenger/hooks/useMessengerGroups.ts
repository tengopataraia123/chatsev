/**
 * Hook for managing messenger groups
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MessengerGroup, MessengerGroupMember, ChatTheme } from '../types';

export function useMessengerGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<MessengerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  const fetchGroups = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      
      // Get groups where user is a member
      const { data: memberships, error: memError } = await supabase
        .from('messenger_group_members')
        .select('group_id, role')
        .eq('user_id', user.id);
      
      if (memError) throw memError;
      
      if (!memberships || memberships.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }
      
      const groupIds = memberships.map(m => m.group_id);
      const roleMap = new Map(memberships.map(m => [m.group_id, m.role]));
      
      // Fetch group details
      const { data: groupsData, error: groupsError } = await supabase
        .from('messenger_groups')
        .select('*')
        .in('id', groupIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      if (groupsError) throw groupsError;
      
      // Count unread messages per group
      const { data: readData } = await supabase
        .from('messenger_group_reads')
        .select('group_id, last_read_at')
        .eq('user_id', user.id)
        .in('group_id', groupIds);
      
      const readMap = new Map(readData?.map(r => [r.group_id, r.last_read_at]) || []);
      
      // Count unread for each group
      const unreadPromises = groupIds.map(async (groupId) => {
        const lastRead = readMap.get(groupId);
        let query = supabase
          .from('messenger_group_messages')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .neq('sender_id', user.id);
        
        if (lastRead) {
          query = query.gt('created_at', lastRead);
        }
        
        const { count } = await query;
        return { groupId, count: count || 0 };
      });
      
      const unreadResults = await Promise.all(unreadPromises);
      const unreadMap = new Map(unreadResults.map(r => [r.groupId, r.count]));
      
      // Map groups with role and unread count
      const mapped: MessengerGroup[] = (groupsData || []).map(group => ({
        ...group,
        my_role: roleMap.get(group.id) as 'admin' | 'moderator' | 'member',
        unread_count: unreadMap.get(group.id) || 0,
      }));
      
      setGroups(mapped);
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Create a new group
  const createGroup = useCallback(async (
    name: string,
    memberIds: string[],
    options?: {
      description?: string;
      avatarUrl?: string;
      isPrivate?: boolean;
    }
  ): Promise<string | null> => {
    if (!user?.id) return null;
    
    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('messenger_groups')
        .insert({
          name,
          description: options?.description || null,
          avatar_url: options?.avatarUrl || null,
          creator_id: user.id,
          is_private: options?.isPrivate ?? true,
          member_count: memberIds.length + 1,
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add creator as admin
      const membersToAdd: Array<{
        group_id: string;
        user_id: string;
        role: 'admin' | 'member' | 'moderator';
        can_send_messages?: boolean;
        can_send_media?: boolean;
        can_add_members?: boolean;
        invited_by?: string;
      }> = [
        {
          group_id: group.id,
          user_id: user.id,
          role: 'admin' as const,
          can_send_messages: true,
          can_send_media: true,
          can_add_members: true,
        },
        ...memberIds.map(id => ({
          group_id: group.id,
          user_id: id,
          role: 'member' as const,
          can_send_messages: true,
          can_send_media: true,
          can_add_members: false,
          invited_by: user.id,
        })),
      ];
      
      const { error: membersError } = await supabase
        .from('messenger_group_members')
        .insert(membersToAdd);
      
      if (membersError) throw membersError;
      
      await fetchGroups();
      return group.id;
    } catch (err: any) {
      console.error('Error creating group:', err);
      return null;
    }
  }, [user?.id, fetchGroups]);

  // Update group settings
  const updateGroup = useCallback(async (
    groupId: string,
    updates: Partial<Pick<MessengerGroup, 'name' | 'description' | 'avatar_url' | 'theme' | 'custom_emoji' | 'vanish_mode_enabled'>>
  ) => {
    try {
      const { error } = await supabase
        .from('messenger_groups')
        .update(updates)
        .eq('id', groupId);
      
      if (error) throw error;
      
      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, ...updates } : g
      ));
      
      return true;
    } catch (err: any) {
      console.error('Error updating group:', err);
      return false;
    }
  }, []);

  // Add members to group
  const addMembers = useCallback(async (groupId: string, memberIds: string[]) => {
    if (!user?.id) return false;
    
    try {
      const members: Array<{
        group_id: string;
        user_id: string;
        role: 'member';
        invited_by: string;
      }> = memberIds.map(id => ({
        group_id: groupId,
        user_id: id,
        role: 'member' as const,
        invited_by: user.id,
      }));
      
      const { error } = await supabase
        .from('messenger_group_members')
        .insert(members);
      
      if (error) throw error;
      
      // Get current member count and update
      const { data: group } = await supabase
        .from('messenger_groups')
        .select('member_count')
        .eq('id', groupId)
        .single();
      
      if (group) {
        await supabase
          .from('messenger_groups')
          .update({ member_count: (group.member_count || 0) + memberIds.length })
          .eq('id', groupId);
      }
      
      await fetchGroups();
      return true;
    } catch (err: any) {
      console.error('Error adding members:', err);
      return false;
    }
  }, [user?.id, fetchGroups]);

  // Remove member from group
  const removeMember = useCallback(async (groupId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('messenger_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberId);
      
      if (error) throw error;
      
      await fetchGroups();
      return true;
    } catch (err: any) {
      console.error('Error removing member:', err);
      return false;
    }
  }, [fetchGroups]);

  // Leave group
  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user?.id) return false;
    return removeMember(groupId, user.id);
  }, [user?.id, removeMember]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    
    fetchGroups();
    
    subscriptionRef.current = supabase
      .channel(`messenger-groups-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messenger_groups',
        },
        () => fetchGroups()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messenger_group_members',
        },
        (payload) => {
          const member = payload.new as any || payload.old as any;
          if (member?.user_id === user.id) {
            fetchGroups();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_group_messages',
        },
        () => fetchGroups()
      )
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, fetchGroups]);

  return {
    groups,
    loading,
    error,
    fetchGroups,
    createGroup,
    updateGroup,
    addMembers,
    removeMember,
    leaveGroup,
  };
}
