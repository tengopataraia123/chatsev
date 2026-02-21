import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Group, GroupTab } from '../types';

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<GroupTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId);
      }

      if (activeTab === 'my-groups' && user) {
        query = query.eq('owner_user_id', user.id);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      let filteredGroups = data || [];

      // For joined/friends tabs, filter by membership
      if (activeTab === 'joined' && user) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        const joinedIds = new Set(memberships?.map(m => m.group_id) || []);
        filteredGroups = filteredGroups.filter(g => joinedIds.has(g.id));
      }

      if (activeTab === 'friends' && user) {
        // Get friends
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        const friendIds = new Set(
          friendships?.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id) || []
        );

        // Get groups where friends are members
        if (friendIds.size > 0) {
          const { data: friendMemberships } = await supabase
            .from('group_members')
            .select('group_id')
            .in('user_id', Array.from(friendIds))
            .eq('status', 'active');

          const friendGroupIds = new Set(friendMemberships?.map(m => m.group_id) || []);
          filteredGroups = filteredGroups.filter(g => friendGroupIds.has(g.id));
        } else {
          filteredGroups = [];
        }
      }

      setGroups(filteredGroups as Group[]);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, searchQuery, selectedCategoryId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    refresh: fetchGroups,
  };
}
