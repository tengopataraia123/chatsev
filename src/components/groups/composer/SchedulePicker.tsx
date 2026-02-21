import { X, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SchedulePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onRemove: () => void;
}

const SchedulePicker = ({ value, onChange, onRemove }: SchedulePickerProps) => {
  // Min date = now + 5 minutes
  const minDate = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">დაგეგმვა</h4>
        </div>
        <button onClick={onRemove} className="p-1 hover:bg-secondary rounded">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <Input
        type="datetime-local"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        min={minDate}
        className="text-[16px]"
      />
    </div>
  );
};

export default SchedulePicker;
