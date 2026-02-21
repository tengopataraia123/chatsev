import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  X, Upload, ZoomIn, ZoomOut, Move, RotateCcw, Loader2, Check, 
  Sparkles, Camera, Wand2, Film, ImageIcon, Send, Download
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
  currentAvatar?: string | null;
  uploading: boolean;
  onNavigateToAIAvatar?: () => void;
}

type FileType = 'image' | 'gif' | 'video';

// AI avatar styles
const AI_STYLES = [
  { id: 'realistic', label: 'რეალისტური', emoji: '📸' },
  { id: 'anime', label: 'ანიმე', emoji: '🎨' },
  { id: 'pixar', label: 'Pixar 3D', emoji: '✨' },
  { id: 'cartoon', label: 'კარტუნი', emoji: '🎬' },
  { id: 'oil-painting', label: 'ზეთი', emoji: '🖼️' },
  { id: 'cyberpunk', label: 'კიბერპანკი', emoji: '🤖' },
];

const AvatarUploaderModal = ({
  isOpen,
  onClose,
  onSave,
  currentAvatar,
  uploading,
  onNavigateToAIAvatar,
}: AvatarUploaderModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType>('image');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'upload' | 'ai'>('upload');
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('realistic');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileType('image');
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setActiveTab('upload');
      setAiPrompt('');
      setAiGeneratedImage(null);
    }
  }, [isOpen]);

  // Detect file type
  const detectFileType = (file: File): FileType => {
    const mimeType = file.type.toLowerCase();
    if (mimeType === 'image/gif') return 'gif';
    if (mimeType.startsWith('video/')) return 'video';
    return 'image';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type - accept images and ALL videos
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast.error('მხოლოდ ფოტო ან ვიდეო ფორმატები');
        return;
      }
      
      // Max 50MB for videos, 10MB for images
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`ფაილი ძალიან დიდია. მაქს: ${isVideo ? '50MB' : '10MB'}`);
        return;
      }

      const type = detectFileType(file);
      setFileType(type);
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
    
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewUrl || fileType === 'video') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!previewUrl || fileType === 'video' || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    if (!selectedFile || !previewUrl) return;

    // GIF and Video - upload directly without processing to preserve quality
    if (fileType === 'gif' || fileType === 'video') {
      await onSave(selectedFile);
      return;
    }

    // Regular images - upload original file directly (no circular cropping)
    // The circular display is handled in CSS, not by cropping the source image
    await onSave(selectedFile);
  };

  // AI Avatar Generation
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('გთხოვთ აღწერეთ სასურველი ავატარი');
      return;
    }

    setAiGenerating(true);
    setAiGeneratedImage(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('გთხოვთ გაიაროთ ავტორიზაცია');
        return;
      }

      // Create generation record
      const { data: generation, error: insertError } = await supabase
        .from('ai_avatar_generations')
        .insert({
          user_id: user.id,
          prompt: aiPrompt,
          style: aiStyle,
          status: 'processing'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: {
          generation_id: generation.id,
          prompt: aiPrompt,
          style: aiStyle
        }
      });

      if (error) {
        // Check for rate limit or payment errors
        if (error.message?.includes('429')) {
          toast.error('ძალიან ბევრი მოთხოვნა. გთხოვთ სცადეთ მოგვიანებით.');
        } else if (error.message?.includes('402')) {
          toast.error('საჭიროა კრედიტების შევსება AI ფუნქციებისთვის.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.image_url) {
        setAiGeneratedImage(data.image_url);
        toast.success('ავატარი წარმატებით შეიქმნა!');
      } else {
        throw new Error('სურათი ვერ შეიქმნა');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'შეცდომა გენერაციისას');
    } finally {
      setAiGenerating(false);
    }
  };

  // Set AI generated image as avatar
  const handleSetAIAvatar = async () => {
    if (!aiGeneratedImage) return;

    try {
      // Convert base64 to blob
      const response = await fetch(aiGeneratedImage);
      const blob = await response.blob();
      const file = new File([blob], 'ai-avatar.png', { type: 'image/png' });
      await onSave(file);
    } catch (error: any) {
      console.error('Error setting AI avatar:', error);
      toast.error('შეცდომა ავატარის დაყენებისას');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 overflow-hidden bg-gradient-to-b from-card to-background border-border/50 rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-4 pb-2 sticky top-0 bg-gradient-to-b from-card to-card/95 z-10">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold">ავატარის შეცვლა</h2>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1">
            ატვირთე ან შექმენი AI-ით
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'ai')} className="px-4">
          <TabsList className="grid grid-cols-2 w-full bg-muted/50">
            <TabsTrigger value="upload" className="gap-2 text-sm">
              <ImageIcon className="w-4 h-4" />
              ატვირთვა
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2 text-sm">
              <Sparkles className="w-4 h-4" />
              AI გენერაცია
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-4 space-y-4">
            {!previewUrl ? (
              // File selection - Modern design
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative group border-2 border-dashed border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all min-h-[220px] overflow-hidden active:scale-[0.98]"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Glow effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium text-center text-sm">
                    დააჭირე ფაილის ასარჩევად
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">
                    ფოტო, GIF ან ვიდეო • მაქს. 50MB
                  </p>
                  
                  {/* Supported formats badges */}
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {['JPG', 'PNG', 'GIF', 'MP4', 'MOV', 'WEBM', 'AVI'].map((format) => (
                      <span 
                        key={format}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Preview container
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative mx-auto">
                  <div 
                    className={cn(
                      "relative w-[220px] h-[220px] mx-auto rounded-full overflow-hidden bg-muted/30",
                      fileType !== 'video' && "cursor-move"
                    )}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ touchAction: fileType === 'video' ? 'auto' : 'none' }}
                  >
                    {/* Video preview */}
                    {fileType === 'video' ? (
                      <video 
                        src={previewUrl} 
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <>
                        {/* Grid overlay for adjustment */}
                        <div className="absolute inset-0 pointer-events-none z-10">
                          <div className="w-full h-full border border-white/20 rounded-full" />
                        </div>
                        
                        {/* Image/GIF */}
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                          }}
                        >
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                          />
                        </div>

                        {/* Move indicator */}
                        {fileType === 'image' && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black/60 backdrop-blur-sm rounded-full p-2.5">
                              <Move className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* File type indicator */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 bg-card rounded-full text-xs flex items-center gap-1.5 shadow-lg border border-border/50">
                    {fileType === 'gif' && <><Sparkles className="w-3 h-3 text-primary" /> GIF</>}
                    {fileType === 'video' && <><Film className="w-3 h-3 text-primary" /> ვიდეო</>}
                    {fileType === 'image' && <><ImageIcon className="w-3 h-3 text-primary" /> ფოტო</>}
                  </div>
                </div>

                {/* Zoom controls - only for regular images */}
                {fileType === 'image' && (
                  <div className="flex items-center gap-3 px-2">
                    <button 
                      onClick={() => setScale(Math.max(1, scale - 0.1))}
                      className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <ZoomOut className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="flex-1 relative">
                      <Slider
                        value={[scale]}
                        min={1}
                        max={3}
                        step={0.01}
                        onValueChange={([value]) => setScale(value)}
                        className="flex-1"
                      />
                    </div>
                    <button 
                      onClick={() => setScale(Math.min(3, scale + 0.1))}
                      className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <ZoomIn className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}

                {/* GIF/Video info */}
                {(fileType === 'gif' || fileType === 'video') && (
                  <div className="text-center text-xs text-muted-foreground px-4">
                    {fileType === 'gif' 
                      ? 'GIF შეინახება ხარისხის დაკარგვის გარეშე' 
                      : 'ვიდეო ავტომატურად დაიკრობა პროფილზე'
                    }
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-center gap-2">
                  {fileType === 'image' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleReset}
                      className="text-xs h-8"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      გადატვირთვა
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                    className="text-xs h-8"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    სხვა ფაილი
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* AI Generation Tab */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            {!aiGeneratedImage ? (
              // AI Generation form
              <div className="space-y-4">
                {/* Style selector */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">სტილი</label>
                  <div className="grid grid-cols-3 gap-2">
                    {AI_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setAiStyle(style.id)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-medium transition-all",
                          aiStyle === style.id 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "bg-muted/50 hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="mr-1">{style.emoji}</span>
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt input */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">აღწერა</label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="აღწერეთ სასურველი ავატარი... მაგ: 'მომღიმარი ახალგაზრდა კაცი შავი თმით, პროფესიონალური ფოტო'"
                    className="min-h-[80px] resize-none text-sm"
                    maxLength={500}
                  />
                  <div className="text-right text-[10px] text-muted-foreground mt-1">
                    {aiPrompt.length}/500
                  </div>
                </div>

                {/* Example prompts */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">მაგალითები</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'მომღიმარი გოგონა',
                      'კაცი სათვალით',
                      'კოსმონავტი',
                      'სუპერგმირი'
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setAiPrompt(example)}
                        className="px-2 py-1 text-[10px] rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <Button 
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 h-11"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      გენერაცია...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      შექმნა AI-ით
                    </>
                  )}
                </Button>

                {aiGenerating && (
                  <p className="text-center text-xs text-muted-foreground animate-pulse">
                    AI ქმნის თქვენს ავატარს... ეს შეიძლება რამდენიმე წამი გაგრძელდეს
                  </p>
                )}
              </div>
            ) : (
              // AI Generated result
              <div className="space-y-4">
                <div className="relative mx-auto">
                  <div className="w-[220px] h-[220px] mx-auto rounded-full overflow-hidden bg-muted/30 ring-4 ring-primary/30">
                    <img 
                      src={aiGeneratedImage} 
                      alt="AI Generated Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Success indicator */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs flex items-center gap-1.5 text-primary-foreground shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    AI შექმნილი
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  "{aiPrompt}" - {AI_STYLES.find(s => s.id === aiStyle)?.label}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setAiGeneratedImage(null)}
                    className="flex-1 h-10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    თავიდან
                  </Button>
                  <Button 
                    onClick={handleSetAIAvatar}
                    disabled={uploading}
                    className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent h-10"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    დაყენება
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.gif,.mp4,.mov,.avi,.mkv,.webm,.m4v,.3gp,.wmv"
          capture={false}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Actions - only show for upload tab */}
        {activeTab === 'upload' && (
          <div className="p-4 border-t border-border/50 bg-muted/30">
            <Button 
              onClick={handleSave} 
              disabled={!previewUrl || uploading}
              className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity h-11"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ატვირთვა...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  შენახვა
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AvatarUploaderModal;
