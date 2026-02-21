import { useState, useEffect } from 'react';
import { ArrowLeft, Music, Video, Settings, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MediaSettingsAdminProps {
  onBack: () => void;
}

interface MediaSettings {
  maxMusicSize: number;
  maxVideoSize: number;
  allowedMusicFormats: string[];
  allowedVideoFormats: string[];
  enableMusicPiP: boolean;
  enableVideoPiP: boolean;
  enablePlaybackSpeed: boolean;
  musicModerationEnabled: boolean;
  videoModerationEnabled: boolean;
}

const DEFAULT_SETTINGS: MediaSettings = {
  maxMusicSize: 100,
  maxVideoSize: 500,
  allowedMusicFormats: ['mp3', 'm4a', 'wav', 'ogg'],
  allowedVideoFormats: ['mp4', 'webm', 'mov'],
  enableMusicPiP: false,
  enableVideoPiP: true,
  enablePlaybackSpeed: true,
  musicModerationEnabled: true,
  videoModerationEnabled: true,
};

const MediaSettingsAdmin = ({ onBack }: MediaSettingsAdminProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<MediaSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_modules')
        .select('settings')
        .eq('name', 'media_settings')
        .single();

      if (data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings as any) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Check if exists first
      const { data: existing } = await supabase
        .from('app_modules')
        .select('id')
        .eq('name', 'media_settings')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('app_modules')
          .update({ settings: settings as any })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_modules')
          .insert({
            name: 'media_settings',
            display_name: 'Media Settings',
            settings: settings as any,
            is_enabled: true,
          });
        if (error) throw error;
      }

      toast({ title: 'პარამეტრები შენახულია!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof MediaSettings>(key: K, value: MediaSettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">მედია პარამეტრები</h1>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'ინახება...' : 'შენახვა'}
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <Tabs defaultValue="music">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="music" className="gap-2">
              <Music className="w-4 h-4" />
              მუსიკა
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-2">
              <Video className="w-4 h-4" />
              ვიდეო
            </TabsTrigger>
          </TabsList>

          <TabsContent value="music" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  ატვირთვის პარამეტრები
                </CardTitle>
                <CardDescription>მუსიკის ატვირთვის ლიმიტები და ფორმატები</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>მაქსიმალური ზომა (MB)</Label>
                  <Input
                    type="number"
                    value={settings.maxMusicSize}
                    onChange={(e) => updateSetting('maxMusicSize', parseInt(e.target.value) || 100)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>დაშვებული ფორმატები (მძიმით გამოყოფილი)</Label>
                  <Input
                    value={settings.allowedMusicFormats.join(', ')}
                    onChange={(e) => updateSetting('allowedMusicFormats', e.target.value.split(',').map(s => s.trim()))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Player პარამეტრები
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">მოდერაცია</p>
                    <p className="text-sm text-muted-foreground">მუსიკა საჭიროებს ადმინის დადასტურებას</p>
                  </div>
                  <Switch
                    checked={settings.musicModerationEnabled}
                    onCheckedChange={(v) => updateSetting('musicModerationEnabled', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  ატვირთვის პარამეტრები
                </CardTitle>
                <CardDescription>ვიდეოს ატვირთვის ლიმიტები და ფორმატები</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>მაქსიმალური ზომა (MB)</Label>
                  <Input
                    type="number"
                    value={settings.maxVideoSize}
                    onChange={(e) => updateSetting('maxVideoSize', parseInt(e.target.value) || 500)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>დაშვებული ფორმატები (მძიმით გამოყოფილი)</Label>
                  <Input
                    value={settings.allowedVideoFormats.join(', ')}
                    onChange={(e) => updateSetting('allowedVideoFormats', e.target.value.split(',').map(s => s.trim()))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Player პარამეტრები
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Picture-in-Picture</p>
                    <p className="text-sm text-muted-foreground">PiP ფუნქციის ჩართვა</p>
                  </div>
                  <Switch
                    checked={settings.enableVideoPiP}
                    onCheckedChange={(v) => updateSetting('enableVideoPiP', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">სიჩქარის კონტროლი</p>
                    <p className="text-sm text-muted-foreground">Playback speed-ის ჩვენება</p>
                  </div>
                  <Switch
                    checked={settings.enablePlaybackSpeed}
                    onCheckedChange={(v) => updateSetting('enablePlaybackSpeed', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">მოდერაცია</p>
                    <p className="text-sm text-muted-foreground">ვიდეო საჭიროებს ადმინის დადასტურებას</p>
                  </div>
                  <Switch
                    checked={settings.videoModerationEnabled}
                    onCheckedChange={(v) => updateSetting('videoModerationEnabled', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MediaSettingsAdmin;
