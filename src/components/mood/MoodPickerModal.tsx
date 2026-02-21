import { useState, useMemo, memo } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FEELINGS, ACTIVITIES, MoodOption, SelectedMood } from './moodData';

interface MoodPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mood: SelectedMood) => void;
  currentMood?: SelectedMood | null;
}

const MoodPickerModal = memo(({ isOpen, onClose, onSelect, currentMood }: MoodPickerModalProps) => {
  const [activeTab, setActiveTab] = useState<'feelings' | 'activities'>('feelings');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const items = activeTab === 'feelings' ? FEELINGS : ACTIVITIES;

  const filtered = search.trim()
    ? items.filter(item => 
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.emoji.includes(search) ||
        item.searchTerms?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : items;

  const handleSelect = (item: MoodOption) => {
    onSelect({
      type: activeTab === 'feelings' ? 'feeling' : 'activity',
      key: item.key,
      emoji: item.emoji,
      label: item.label,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-semibold text-base">როგორ გრძნობ თავს?</h3>
          <div className="w-7" />
        </div>

        {/* Search */}
        <div className="px-4 pt-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="მოძებნე..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('feelings'); setSearch(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'feelings'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            😊 გრძნობები
          </button>
          <button
            onClick={() => { setActiveTab('activities'); setSearch(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'activities'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            🎬 აქტივობები
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">ვერ მოიძებნა</p>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {filtered.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleSelect(item)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-muted/70 ${
                    currentMood?.key === item.key ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                  }`}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-sm truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MoodPickerModal.displayName = 'MoodPickerModal';
export default MoodPickerModal;
