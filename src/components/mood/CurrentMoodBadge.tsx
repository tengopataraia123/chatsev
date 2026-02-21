import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildMoodSentence } from './moodData';

interface CurrentMoodBadgeProps {
  userId: string;
}

const CurrentMoodBadge = memo(({ userId }: CurrentMoodBadgeProps) => {
  const { data: mood } = useQuery({
    queryKey: ['active-mood', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_status')
        .select('emoji, display_text, type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  if (!mood) return null;

  const sentenceText = buildMoodSentence(mood.emoji, mood.display_text || '', mood.type);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl">
      <span className="text-lg">{mood.emoji}</span>
      <div>
        <p className="text-xs text-muted-foreground">ამჟამინდელი ხასიათი</p>
        <p className="text-sm font-medium">{sentenceText}</p>
      </div>
    </div>
  );
});

CurrentMoodBadge.displayName = 'CurrentMoodBadge';
export default CurrentMoodBadge;
