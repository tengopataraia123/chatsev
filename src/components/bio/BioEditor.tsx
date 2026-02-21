import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bold, Italic, Underline, Link2, AtSign, Hash, 
  Globe, Users, Lock, History, Trash2, X, Check,
  Smile, Palette, Highlighter, RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBio } from '@/hooks/useBio';
import { 
  BioContent, EMOJI_ICONS, COLOR_PALETTE, HIGHLIGHT_COLORS, 
  BIO_MAX_LENGTH 
} from './types';
import BioPreview from './BioPreview';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface BioEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const BioEditor = ({ isOpen, onClose }: BioEditorProps) => {
  const { bio, history, saving, saveBio, restoreFromHistory, deleteBio } = useBio();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'hidden'>('public');
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && bio) {
      setContent(bio.content || '');
      setVisibility(bio.visibility);
    } else if (isOpen) {
      setContent('');
      setVisibility('public');
    }
  }, [isOpen, bio]);

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + text + content.slice(end);
    
    if (newContent.length <= BIO_MAX_LENGTH) {
      setContent(newContent);
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    }
  };

  const handleSave = async () => {
    // Parse content to content_json (simplified version)
    const contentJson: BioContent[] = content ? [{ type: 'text', value: content }] : [];
    
    const success = await saveBio(content, contentJson, visibility);
    if (success) {
      onClose();
    }
  };

  const handleDelete = async () => {
    const success = await deleteBio();
    if (success) {
      setContent('');
      onClose();
    }
  };

  const handleRestore = async (historyItem: typeof history[0]) => {
    setContent(historyItem.content);
    setShowHistory(false);
  };

  const getVisibilityLabel = () => {
    switch (visibility) {
      case 'friends': return 'მეგობრები';
      case 'hidden': return 'მხოლოდ მე';
      default: return 'ყველა';
    }
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'friends': return <Users className="w-4 h-4" />;
      case 'hidden': return <Lock className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Bio-ს რედაქტირება</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="edit">რედაქტირება</TabsTrigger>
            <TabsTrigger value="preview">პრევიუ</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 overflow-y-auto space-y-4 mt-4">
            {/* Text Area */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  if (e.target.value.length <= BIO_MAX_LENGTH) {
                    setContent(e.target.value);
                  }
                }}
                placeholder="დაწერე შენი Bio... 🎵 Music lover | 📍 Tbilisi"
                className="min-h-[120px] resize-none pr-12 text-sm"
                maxLength={BIO_MAX_LENGTH}
              />
              <span className={cn(
                "absolute bottom-2 right-2 text-xs",
                content.length > BIO_MAX_LENGTH * 0.9 ? "text-destructive" : "text-muted-foreground"
              )}>
                {content.length}/{BIO_MAX_LENGTH}
              </span>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/30 rounded-lg">
              {/* Emoji Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Smile className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="grid grid-cols-6 gap-1">
                    {EMOJI_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertAtCursor(emoji)}
                        className="text-xl p-1.5 hover:bg-muted rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Color Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Palette className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          // For now, just add color hex as hint in content
                        }}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Quick Insert Buttons */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => insertAtCursor('@')}
              >
                <AtSign className="w-3 h-3" />
                <span className="hidden sm:inline">Mention</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => insertAtCursor('#')}
              >
                <Hash className="w-3 h-3" />
                <span className="hidden sm:inline">Hashtag</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => insertAtCursor('📍 ')}
              >
                📍
                <span className="hidden sm:inline">ლოკაცია</span>
              </Button>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {getVisibilityIcon()}
                <span className="text-sm font-medium">ვინ ხედავს: {getVisibilityLabel()}</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    შეცვლა
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    {(['public', 'friends', 'hidden'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setVisibility(v)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded text-sm transition-colors",
                          visibility === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        )}
                      >
                        {v === 'public' && <Globe className="w-4 h-4" />}
                        {v === 'friends' && <Users className="w-4 h-4" />}
                        {v === 'hidden' && <Lock className="w-4 h-4" />}
                        <span>
                          {v === 'public' && 'ყველა'}
                          {v === 'friends' && 'მეგობრები'}
                          {v === 'hidden' && 'მხოლოდ მე'}
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <History className="w-4 h-4" />
                  <span>ისტორია ({history.length})</span>
                </button>

                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-2 space-y-2"
                    >
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-start justify-between gap-2 p-2 bg-muted/30 rounded text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-foreground/80">{h.content}</p>
                            <p className="text-muted-foreground mt-0.5">
                              {format(new Date(h.created_at), 'dd MMM, HH:mm')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleRestore(h)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            აღდგენა
                          </Button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-4">
            <div className="p-4 bg-muted/20 rounded-lg min-h-[150px]">
              <p className="text-xs text-muted-foreground mb-2">პრევიუ:</p>
              <BioPreview content={content} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {bio?.content && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                წაშლა
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              გაუქმება
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="animate-pulse">შენახვა...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  შენახვა
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BioEditor;
