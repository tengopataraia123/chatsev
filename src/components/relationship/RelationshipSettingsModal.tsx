import { useState, useEffect } from 'react';
import { Heart, Settings, Lock, Users, Eye, Save, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  RelationshipStatus,
  RelationshipStatusType,
  RelationshipPrivacyLevel,
  RELATIONSHIP_STATUS_LABELS,
  PRIVACY_LABELS
} from '@/hooks/useRelationshipStatus';

interface RelationshipSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: RelationshipStatus | null;
  onUpdateStatus: (status: RelationshipStatusType) => Promise<boolean>;
  onUpdatePrivacy: (privacy: RelationshipPrivacyLevel, hidePartner: boolean) => Promise<boolean>;
  onEndRelationship: () => Promise<boolean>;
  loading?: boolean;
}

const SOLO_STATUSES: RelationshipStatusType[] = [
  'single',
  'separated',
  'divorced',
  'secret'
];

const RelationshipSettingsModal = ({
  isOpen,
  onClose,
  currentStatus,
  onUpdateStatus,
  onUpdatePrivacy,
  onEndRelationship,
  loading = false
}: RelationshipSettingsModalProps) => {
  const [privacy, setPrivacy] = useState<RelationshipPrivacyLevel>('public');
  const [hidePartner, setHidePartner] = useState(false);
  const [soloStatus, setSoloStatus] = useState<RelationshipStatusType>('single');
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  useEffect(() => {
    if (currentStatus) {
      setPrivacy(currentStatus.privacy_level);
      setHidePartner(currentStatus.hide_partner_name);
      if (!currentStatus.partner_id) {
        setSoloStatus(currentStatus.status);
      }
    }
  }, [currentStatus]);

  const hasPartner = currentStatus?.partner_id;

  const handleSavePrivacy = async () => {
    const success = await onUpdatePrivacy(privacy, hidePartner);
    if (success) {
      onClose();
    }
  };

  const handleUpdateSoloStatus = async () => {
    const success = await onUpdateStatus(soloStatus);
    if (success) {
      onClose();
    }
  };

  const handleEndRelationship = async () => {
    const success = await onEndRelationship();
    if (success) {
      setShowEndConfirm(false);
      onClose();
    }
  };

  const getPrivacyIcon = (level: RelationshipPrivacyLevel) => {
    switch (level) {
      case 'public':
        return <Eye className="w-4 h-4" />;
      case 'friends':
        return <Users className="w-4 h-4" />;
      case 'only_me':
        return <Lock className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              ურთიერთობის პარამეტრები
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Status Display */}
            {currentStatus && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">მიმდინარე სტატუსი</p>
                <p className="font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  {RELATIONSHIP_STATUS_LABELS[currentStatus.status]}
                  {currentStatus.partner_profile && (
                    <span className="text-primary">
                      — {currentStatus.partner_profile.username}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* If has partner - show privacy settings */}
            {hasPartner && (
              <>
                <div className="space-y-4">
                  <Label className="text-base font-semibold">კონფიდენციალურობა</Label>
                  
                  <RadioGroup 
                    value={privacy} 
                    onValueChange={(v) => setPrivacy(v as RelationshipPrivacyLevel)}
                    className="space-y-2"
                  >
                    {(Object.keys(PRIVACY_LABELS) as RelationshipPrivacyLevel[]).map((level) => (
                      <div key={level} className="relative">
                        <RadioGroupItem
                          value={level}
                          id={level}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={level}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer transition-all hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                        >
                          {getPrivacyIcon(level)}
                          <span className="font-medium">{PRIVACY_LABELS[level]}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="hide-partner" className="cursor-pointer">
                      პარტნიორის სახელის დამალვა
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      სტატუსი ჩანს, მაგრამ პარტნიორი არა
                    </p>
                  </div>
                  <Switch
                    id="hide-partner"
                    checked={hidePartner}
                    onCheckedChange={setHidePartner}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    საშიში ზონა
                  </Label>
                  
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowEndConfirm(true)}
                    disabled={loading}
                  >
                    ურთიერთობის დასრულება
                  </Button>
                </div>
              </>
            )}

            {/* If no partner - show status selection */}
            {!hasPartner && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">აირჩიეთ სტატუსი</Label>
                
                <RadioGroup 
                  value={soloStatus} 
                  onValueChange={(v) => setSoloStatus(v as RelationshipStatusType)}
                  className="grid grid-cols-2 gap-2"
                >
                  {SOLO_STATUSES.map((status) => (
                    <div key={status} className="relative">
                      <RadioGroupItem
                        value={status}
                        id={`solo-${status}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`solo-${status}`}
                        className="flex items-center justify-center p-3 rounded-lg border border-border cursor-pointer transition-all hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 text-sm"
                      >
                        {RELATIONSHIP_STATUS_LABELS[status]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              გაუქმება
            </Button>
            {hasPartner ? (
              <Button onClick={handleSavePrivacy} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'შენახვა...' : 'შენახვა'}
              </Button>
            ) : (
              <Button onClick={handleUpdateSoloStatus} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'შენახვა...' : 'შენახვა'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Relationship Confirmation */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ნამდვილად გსურთ ურთიერთობის დასრულება?</AlertDialogTitle>
            <AlertDialogDescription>
              ეს ქმედება გაუქმდება თქვენს და თქვენი პარტნიორის ურთიერთობის სტატუსს.
              ორივეს მიიღებთ შეტყობინებას ცვლილების შესახებ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEndRelationship}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'მუშავდება...' : 'დასრულება'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RelationshipSettingsModal;
