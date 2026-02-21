/**
 * Messenger Settings Modal - Privacy Controls
 */
import { memo } from 'react';
import { Settings, Eye, EyeOff, MessageCircle, Bell, Volume2, VolumeX, Image, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useMessengerPreferences } from '../hooks/useMessengerPreferences';

interface MessengerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessengerSettingsModal = memo(({ isOpen, onClose }: MessengerSettingsModalProps) => {
  const { preferences, loading, updatePreferences } = useMessengerPreferences();

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            მესენჯერის პარამეტრები
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 py-2 pr-4">
            {/* Privacy Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              კონფიდენციალურობა
            </h3>

            {/* Read Receipts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  preferences?.show_read_receipts ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {preferences?.show_read_receipts ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium">წაკითხვის სტატუსი</p>
                  <p className="text-sm text-muted-foreground">
                    აჩვენეთ როდის წაიკითხეთ შეტყობინება
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.show_read_receipts ?? true}
                onCheckedChange={(checked) => updatePreferences({ show_read_receipts: checked })}
              />
            </div>

            {/* Typing Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  preferences?.show_typing_indicator ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">წერის ინდიკატორი</p>
                  <p className="text-sm text-muted-foreground">
                    აჩვენეთ როდის წერთ შეტყობინებას
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.show_typing_indicator ?? true}
                onCheckedChange={(checked) => updatePreferences({ show_typing_indicator: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              შეტყობინებები
            </h3>

            {/* Notification Sounds */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  preferences?.notification_sounds ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {preferences?.notification_sounds ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium">შეტყობინების ხმა</p>
                  <p className="text-sm text-muted-foreground">
                    ახალი შეტყობინების ხმოვანი სიგნალი
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.notification_sounds ?? true}
                onCheckedChange={(checked) => updatePreferences({ notification_sounds: checked })}
              />
            </div>

            {/* Notification Previews */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  preferences?.notification_previews ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">შეტყობინების პრევიუ</p>
                  <p className="text-sm text-muted-foreground">
                    აჩვენეთ ტექსტი შეტყობინებაში
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.notification_previews ?? true}
                onCheckedChange={(checked) => updatePreferences({ notification_previews: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Media Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              მედია
            </h3>

            {/* Auto-play Videos */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  preferences?.auto_play_videos ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">ვიდეოს ავტო-პლეი</p>
                  <p className="text-sm text-muted-foreground">
                    ავტომატურად დაიწყეთ ვიდეოები
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.auto_play_videos ?? true}
                onCheckedChange={(checked) => updatePreferences({ auto_play_videos: checked })}
              />
            </div>

            {/* Auto-play GIFs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  preferences?.auto_play_gifs ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">GIF-ების ავტო-პლეი</p>
                  <p className="text-sm text-muted-foreground">
                    ავტომატურად დაიწყეთ GIF-ები
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.auto_play_gifs ?? true}
                onCheckedChange={(checked) => updatePreferences({ auto_play_gifs: checked })}
              />
            </div>
          </div>
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

MessengerSettingsModal.displayName = 'MessengerSettingsModal';

export default MessengerSettingsModal;
