import { memo, useState, useRef, useCallback } from 'react';
import { X, Image, Video, Type, Check, ChevronLeft, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useStoryUpload } from './hooks/useStoryUpload';
import { TEXT_BACKGROUNDS, FONT_STYLES, type StoryType, type TextStoryContent } from './types';
import { cn } from '@/lib/utils';
import StoryMusicPicker, { type SelectedMusic } from './StoryMusicPicker';
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

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'select' | 'photo' | 'video' | 'text' | 'preview';

const StoryCreateModal = memo(function StoryCreateModal({ 
  isOpen, 
  onClose,
  onSuccess 
}: StoryCreateModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<TextStoryContent>({
    text: '',
    align: 'center',
    fontSize: 'large'
  });
  const [selectedBackground, setSelectedBackground] = useState<string>(TEXT_BACKGROUNDS[0]);
  const [selectedFont, setSelectedFont] = useState<string>(FONT_STYLES[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { uploadStory, uploading, progress } = useStoryUpload();

  const handleFileSelect = useCallback((type: 'photo' | 'video') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'photo' 
        ? 'image/jpeg,image/png,image/webp,image/heic' 
        : 'video/mp4,video/webm,video/mov';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep('preview');
    }
  }, []);

  const handleTextStory = useCallback(() => {
    setStep('text');
  }, []);

  const handlePublish = useCallback(async () => {
    let storyType: StoryType = 'text';
    
    if (selectedFile) {
      storyType = selectedFile.type.startsWith('video') ? 'video' : 'photo';
    }

    const result = await uploadStory({
      type: storyType,
      file: selectedFile || undefined,
      textContent: storyType === 'text' ? textContent : undefined,
      backgroundStyle: storyType === 'text' ? selectedBackground : undefined,
      fontStyle: storyType === 'text' ? selectedFont : undefined,
      duration: 30,
      musicTitle: selectedMusic ? `${selectedMusic.title} - ${selectedMusic.artist}` : undefined,
      musicUrl: selectedMusic?.previewUrl,
      musicArtist: selectedMusic?.artist,
      musicStartTime: selectedMusic?.startTime || 0,
      musicDeezerId: selectedMusic?.deezerId,
    });

    if (result) {
      onSuccess?.();
      handleReset();
      onClose();
    }
  }, [selectedFile, textContent, selectedBackground, selectedFont, selectedMusic, uploadStory, onSuccess, onClose]);

  const handleReset = useCallback(() => {
    setStep('select');
    setSelectedFile(null);
    setPreviewUrl(null);
    setTextContent({ text: '', align: 'center', fontSize: 'large' });
    setSelectedBackground(TEXT_BACKGROUNDS[0]);
    setSelectedFont(FONT_STYLES[0].id);
    setSelectedMusic(null);
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'preview' || step === 'text') {
      handleReset();
    }
  }, [step, handleReset]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      style={{ height: '100dvh', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/20 safe-area-top">
        {step !== 'select' ? (
          <button onClick={handleBack} className="text-white p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-8" />
        )}
        <h2 className="text-white font-medium">
          {step === 'select' && 'ახალი სთორი'}
          {step === 'text' && 'ტექსტური სთორი'}
          {step === 'preview' && 'გადახედვა'}
        </h2>
        <button onClick={onClose} className="text-white p-1">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Step: Select Type */}
        {step === 'select' && (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
            <p className="text-muted-foreground text-center mb-4">
              აირჩიე სთორის ტიპი
            </p>
            
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
              <button
                onClick={() => handleFileSelect('photo')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 hover:border-pink-500/60 transition-all"
              >
                <Image className="w-10 h-10 text-pink-400" />
                <span className="text-white text-sm font-medium">ფოტო</span>
              </button>

              <button
                onClick={() => handleFileSelect('video')}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:border-blue-500/60 transition-all"
              >
                <Video className="w-10 h-10 text-blue-400" />
                <span className="text-white text-sm font-medium">ვიდეო</span>
              </button>

              <button
                onClick={handleTextStory}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500/60 transition-all"
              >
                <Type className="w-10 h-10 text-green-400" />
                <span className="text-white text-sm font-medium">ტექსტი</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Step: Text Story Editor */}
        {step === 'text' && (
          <div className="flex flex-col h-full">
            {/* Preview */}
            <div 
              className="flex-1 flex items-center justify-center p-6"
              style={{ background: selectedBackground }}
            >
              <textarea
                value={textContent.text}
                onChange={(e) => setTextContent(prev => ({ ...prev, text: e.target.value }))}
                placeholder="დაწერე შენი სთორი..."
                className={cn(
                  "w-full bg-transparent text-white text-center resize-none border-none focus:outline-none",
                  FONT_STYLES.find(f => f.id === selectedFont)?.className,
                  textContent.fontSize === 'small' && 'text-lg',
                  textContent.fontSize === 'medium' && 'text-2xl',
                  textContent.fontSize === 'large' && 'text-3xl'
                )}
                style={{ textAlign: textContent.align }}
                rows={5}
                maxLength={200}
              />
            </div>

            {/* Controls */}
            <div className="bg-background/90 backdrop-blur p-4 space-y-4">
              {/* Backgrounds */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {TEXT_BACKGROUNDS.map((bg, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedBackground(bg)}
                    className={cn(
                      "w-10 h-10 rounded-full shrink-0 border-2 transition-all",
                      selectedBackground === bg ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ background: bg }}
                  />
                ))}
              </div>

              {/* Fonts */}
              <div className="flex gap-2 overflow-x-auto">
                {FONT_STYLES.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFont(font.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm shrink-0 transition-all",
                      selectedFont === font.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground",
                      font.className
                    )}
                  >
                    {font.name}
                  </button>
                ))}
              </div>

              {/* Alignment */}
              <div className="flex justify-center gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => setTextContent(prev => ({ ...prev, align }))}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm",
                      textContent.align === align 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {align === 'left' && 'მარცხნივ'}
                    {align === 'center' && 'ცენტრში'}
                    {align === 'right' && 'მარჯვნივ'}
                  </button>
                ))}
              </div>

              <Button 
                onClick={() => setStep('preview')}
                className="w-full"
                disabled={!textContent.text.trim()}
              >
                გადახედვა
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="flex flex-col h-full">
            {/* Media Preview */}
            <div className="flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
              {previewUrl && selectedFile?.type.startsWith('image') && (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain"
                />
              )}
              {previewUrl && selectedFile?.type.startsWith('video') && (
                <video
                  ref={videoRef}
                  src={previewUrl}
                  className="max-w-full max-h-full object-contain"
                  controls
                  autoPlay
                  muted
                />
              )}
              {!selectedFile && textContent.text && (
                <div 
                  className="w-full h-full flex items-center justify-center p-6"
                  style={{ background: selectedBackground }}
                >
                  <p 
                    className={cn(
                      "text-white",
                      FONT_STYLES.find(f => f.id === selectedFont)?.className,
                      textContent.fontSize === 'small' && 'text-lg',
                      textContent.fontSize === 'medium' && 'text-2xl',
                      textContent.fontSize === 'large' && 'text-3xl'
                    )}
                    style={{ textAlign: textContent.align }}
                  >
                    {textContent.text}
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="absolute inset-x-0 bottom-24 px-6 z-10">
                <Progress value={progress} className="h-2" />
                <p className="text-white text-center mt-2 text-sm">
                  იტვირთება... {progress}%
                </p>
              </div>
            )}

            {/* Music Picker + Publish Button */}
            <div 
              className="flex-shrink-0 p-4 bg-background/90 backdrop-blur safe-area-bottom space-y-3"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              {/* Music Picker - show for photo and text stories */}
              {(!selectedFile || selectedFile?.type.startsWith('image')) && (
                <StoryMusicPicker 
                  selectedMusic={selectedMusic}
                  onSelect={setSelectedMusic}
                />
              )}

              <Button 
                onClick={() => setShowConfirmDialog(true)}
                className="w-full h-12 text-lg"
                disabled={uploading}
              >
                <Check className="w-5 h-5 mr-2" />
                გამოქვეყნება
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>სთორის გამოქვეყნება</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხარ, რომ გსურს ამ სთორის გამოქვეყნება?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              დადასტურება
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default StoryCreateModal;
