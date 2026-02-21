/**
 * Vanish Mode Toggle Component
 */
import { memo, useState } from 'react';
import { Ghost, Clock, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface VanishModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  timeoutHours: number;
  onToggle: (enable: boolean, hours: number) => Promise<boolean>;
}

const TIMEOUT_OPTIONS = [
  { value: '1', label: '1 საათი' },
  { value: '6', label: '6 საათი' },
  { value: '12', label: '12 საათი' },
  { value: '24', label: '24 საათი' },
  { value: '48', label: '48 საათი' },
  { value: '168', label: '1 კვირა' },
];

const VanishModeModal = memo(({ 
  isOpen, 
  onClose, 
  isEnabled, 
  timeoutHours, 
  onToggle 
}: VanishModeModalProps) => {
  const [enabled, setEnabled] = useState(isEnabled);
  const [hours, setHours] = useState(timeoutHours.toString());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const success = await onToggle(enabled, parseInt(hours));
    setSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ghost className="w-5 h-5 text-primary" />
            Vanish Mode
          </DialogTitle>
          <DialogDescription>
            შეტყობინებები ავტომატურად წაიშლება წაკითხვის შემდეგ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Vanish Mode-ის ჩართვისას, ყველა ახალი შეტყობინება წაიშლება წაკითხვის შემდეგ. 
              ეს მოქმედება შეუქცევადია.
            </p>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Ghost className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Vanish Mode</p>
                <p className="text-sm text-muted-foreground">
                  {enabled ? 'ჩართული' : 'გამორთული'}
                </p>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Timeout Selection */}
          {enabled && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">წაშლის ვადა</p>
                  <p className="text-sm text-muted-foreground">
                    წაკითხვიდან
                  </p>
                </div>
              </div>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEOUT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            გაუქმება
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'ინახება...' : 'შენახვა'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

VanishModeModal.displayName = 'VanishModeModal';

export default VanishModeModal;
