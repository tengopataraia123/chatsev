import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Trash2, Plus, Edit2, Check, X, MessageSquareOff } from 'lucide-react';
import { logAdminAction } from '@/hooks/useAdminActionLog';

interface BlockedWord {
  id: string;
  word: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const WordFilterAdmin = () => {
  const [words, setWords] = useState<BlockedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_words')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWords(data || []);
    } catch (error) {
      console.error('Error fetching blocked words:', error);
      toast.error('შეცდომა სიტყვების ჩატვირთვისას');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const addWord = async () => {
    if (!newWord.trim()) {
      toast.error('შეიყვანეთ სიტყვა');
      return;
    }

    try {
      const { error } = await supabase
        .from('blocked_words')
        .insert({ word: newWord.trim().toLowerCase() });

      if (error) {
        if (error.code === '23505') {
          toast.error('ეს სიტყვა უკვე დამატებულია');
        } else {
          throw error;
        }
        return;
      }

      await logAdminAction({
        actionType: 'other',
        actionCategory: 'moderation',
        description: `აკრძალული სიტყვა დაემატა: ${newWord.trim()}`,
        metadata: { word: newWord.trim() }
      });

      toast.success('სიტყვა დაემატა');
      setNewWord('');
      fetchWords();
    } catch (error) {
      console.error('Error adding word:', error);
      toast.error('შეცდომა სიტყვის დამატებისას');
    }
  };

  const deleteWord = async (id: string) => {
    const word = words.find(w => w.id === id);
    try {
      const { error } = await supabase
        .from('blocked_words')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAdminAction({
        actionType: 'delete',
        actionCategory: 'moderation',
        targetContentId: id,
        targetContentType: 'blocked_word',
        description: `აკრძალული სიტყვა წაიშალა: ${word?.word || 'უცნობი'}`,
        metadata: { word: word?.word }
      });

      toast.success('სიტყვა წაიშალა');
      fetchWords();
    } catch (error) {
      console.error('Error deleting word:', error);
      toast.error('შეცდომა სიტყვის წაშლისას');
    }
  };

  const toggleWord = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('blocked_words')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(isActive ? 'სიტყვა გაითიშა' : 'სიტყვა გააქტიურდა');
      fetchWords();
    } catch (error) {
      console.error('Error toggling word:', error);
      toast.error('შეცდომა სტატუსის შეცვლისას');
    }
  };

  const startEdit = (word: BlockedWord) => {
    setEditingId(word.id);
    setEditValue(word.word);
  };

  const saveEdit = async () => {
    if (!editValue.trim() || !editingId) return;

    try {
      const { error } = await supabase
        .from('blocked_words')
        .update({ word: editValue.trim().toLowerCase() })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('სიტყვა განახლდა');
      setEditingId(null);
      setEditValue('');
      fetchWords();
    } catch (error) {
      console.error('Error updating word:', error);
      toast.error('შეცდომა სიტყვის განახლებისას');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 150px)' }}>
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <MessageSquareOff className="h-5 w-5" />
            სიტყვების ფილტრი
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
        {/* Add new word */}
        <div className="flex gap-2">
          <Input
            placeholder="ახალი სიტყვა..."
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
          />
          <Button onClick={addWord} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Words list - Scrollable */}
        <ScrollArea className="flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-2 pr-4">
          {words.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              აკრძალული სიტყვები არ არის
            </p>
          ) : (
            words.map((word) => (
              <div
                key={word.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={word.is_active}
                    onCheckedChange={() => toggleWord(word.id, word.is_active)}
                  />
                  
                  {editingId === word.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <span className={!word.is_active ? 'text-muted-foreground line-through' : ''}>
                      {word.word}
                    </span>
                  )}
                </div>

                {editingId !== word.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(word)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteWord(word.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground flex-shrink-0 pt-2">
          აკრძალული სიტყვები ავტომატურად დაიფიფქება (***) ჯგუფურ ჩატში, პირად შეტყობინებებში, კომენტარებსა და პოსტებში.
        </p>
      </CardContent>
    </Card>
    </div>
  );
};
