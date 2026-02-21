import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface PollData {
  question: string;
  options: string[];
  isMultipleChoice: boolean;
  endsAt: string | null;
}

interface PollCreatorProps {
  onUpdate: (data: PollData | null) => void;
  onRemove: () => void;
}

const PollCreator = ({ onUpdate, onRemove }: PollCreatorProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    const validOptions = options.filter(o => o.trim());
    if (question.trim() && validOptions.length >= 2) {
      onUpdate({
        question: question.trim(),
        options: validOptions,
        isMultipleChoice,
        endsAt: endsAt || null,
      });
    } else {
      onUpdate(null);
    }
  }, [question, options, isMultipleChoice, endsAt]);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((o, i) => i === index ? value : o));
  };

  return (
    <div className="bg-secondary/50 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">გამოკითხვა</h4>
        <button onClick={onRemove} className="p-1 hover:bg-secondary rounded">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <Input
        placeholder="კითხვა..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="text-[16px]"
        maxLength={200}
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder={`ვარიანტი ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              className="text-[16px] flex-1"
              maxLength={100}
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="p-1 text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 6 && (
        <button onClick={addOption} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
          <Plus className="w-4 h-4" />
          ვარიანტის დამატება
        </button>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Switch checked={isMultipleChoice} onCheckedChange={setIsMultipleChoice} />
          <span className="text-xs text-muted-foreground">მრავალი არჩევანი</span>
        </div>
        <Input
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="w-auto text-xs"
          placeholder="ვადა"
        />
      </div>
    </div>
  );
};

export default PollCreator;
