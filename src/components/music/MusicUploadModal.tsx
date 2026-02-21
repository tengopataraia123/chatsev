import { useState, useRef } from 'react';
import { X, Upload, Music, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Reggae', 'Folk', 'Metal', 'Blues', 'Soul', 'Indie', 'Other'
];

const PRIVACY_OPTIONS = [
  { value: 'public', label: 'საჯარო' },
  { value: 'friends', label: 'მეგობრები' },
  { value: 'private', label: 'მხოლოდ მე' },
];

interface MusicUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MusicUploadModal = ({ onClose, onSuccess }: MusicUploadModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [privacy, setPrivacy] = useState('public');
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/wav'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'არასწორი ფორმატი',
        description: 'მხოლოდ MP3, M4A და WAV ფორმატები',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: 'ფაილი ძალიან დიდია',
        description: 'მაქსიმალური ზომა: 100MB',
        variant: 'destructive'
      });
      return;
    }
    
    setAudioFile(file);
    
    // Try to extract title from filename
    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'არასწორი ფორმატი',
        description: 'მხოლოდ სურათები',
        variant: 'destructive'
      });
      return;
    }
    
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!audioFile || !title.trim() || !user) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload audio
      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `${user.id}/${Date.now()}.${audioExt}`;
      
      setUploadProgress(20);
      
      const { error: audioError } = await supabase.storage
        .from('music')
        .upload(audioFileName, audioFile);
      
      if (audioError) throw audioError;
      
      const { data: audioUrlData } = supabase.storage
        .from('music')
        .getPublicUrl(audioFileName);
      
      setUploadProgress(60);
      
      // Upload cover if exists
      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverFileName = `${user.id}/covers/${Date.now()}.${coverExt}`;
        
        const { error: coverError } = await supabase.storage
          .from('music')
          .upload(coverFileName, coverFile);
        
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage
            .from('music')
            .getPublicUrl(coverFileName);
          coverUrl = coverUrlData.publicUrl;
        }
      }
      
      setUploadProgress(80);
      
      // Get audio duration
      let duration = 0;
      try {
        const audio = new Audio();
        audio.src = URL.createObjectURL(audioFile);
        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            duration = Math.round(audio.duration);
            resolve();
          };
          audio.onerror = () => resolve();
        });
      } catch (e) {
        console.error('Error getting duration:', e);
      }
      
      // Insert to database
      const { error: insertError } = await supabase
        .from('music')
        .insert({
          title: title.trim(),
          artist: artist.trim() || null,
          album: album.trim() || null,
          genre: genre || null,
          lyrics: lyrics.trim() || null,
          privacy,
          audio_url: audioUrlData.publicUrl,
          cover_url: coverUrl,
          duration,
          file_size: audioFile.size,
          user_id: user.id,
          status: 'approved'
        });
      
      if (insertError) throw insertError;
      
      setUploadProgress(100);
      
      toast({ title: 'მუსიკა აიტვირთა!' });
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'შეცდომა',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">მუსიკის ატვირთვა</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Audio Upload */}
          <div>
            <Label>აუდიო ფაილი *</Label>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav"
              className="hidden"
              onChange={handleAudioSelect}
            />
            <div
              onClick={() => audioInputRef.current?.click()}
              className="mt-2 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {audioFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  <span className="font-medium">{audioFile.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    აირჩიეთ აუდიო ფაილი (MP3, M4A, WAV)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    მაქსიმუმ 100MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <Label>გარეკანი (არასავალდებულო)</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverSelect}
            />
            <div
              onClick={() => coverInputRef.current?.click()}
              className="mt-2 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {coverPreview ? (
                <img 
                  src={coverPreview} 
                  alt="Cover" 
                  className="w-24 h-24 mx-auto rounded-lg object-cover"
                />
              ) : (
                <>
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">გარეკანის სურათი</p>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label>სათაური *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="სიმღერის სახელი"
              className="mt-1"
            />
          </div>

          {/* Artist */}
          <div>
            <Label>შემსრულებელი</Label>
            <Input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="არტისტის სახელი"
              className="mt-1"
            />
          </div>

          {/* Album */}
          <div>
            <Label>ალბომი</Label>
            <Input
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="ალბომის სახელი"
              className="mt-1"
            />
          </div>

          {/* Genre */}
          <div>
            <Label>ჟანრი</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="აირჩიეთ ჟანრი" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Privacy */}
          <div>
            <Label>ხილვადობა</Label>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIVACY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lyrics */}
          <div>
            <Label>ტექსტი (არასავალდებულო)</Label>
            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="სიმღერის ტექსტი..."
              className="mt-1 min-h-[100px]"
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                იტვირთება... {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={uploading}>
            გაუქმება
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleUpload}
            disabled={!audioFile || !title.trim() || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                იტვირთება...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                ატვირთვა
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MusicUploadModal;