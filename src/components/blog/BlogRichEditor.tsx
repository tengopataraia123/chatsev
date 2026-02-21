import { useState, useRef, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, 
  Image, Video, Link, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, 
  AlignRight, Undo, Redo, Eye, Minus, Hash, AtSign, Upload, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BlogRichEditorProps {
  content: string;
  onChange: (content: string) => void;
  coverUrl?: string;
  onCoverChange: (url: string) => void;
}

const BlogRichEditor = ({ content, onChange, coverUrl, onCoverChange }: BlogRichEditorProps) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleUploadImage = async (file: File, isCover = false) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      if (isCover) {
        onCoverChange(publicUrl);
        toast.success('Cover სურათი აიტვირთა');
      } else {
        insertText(`\n![სურათი](${publicUrl})\n`);
        toast.success('სურათი აიტვირთა');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('შეცდომა სურათის ატვირთვისას');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isCover = false) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadImage(file, isCover);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleUploadImage(file);
    }
  }, []);

  const renderPreview = () => {
    // Simple markdown-like preview
    let html = content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic my-4">$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4">')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
      .replace(/#(\w+)/g, '<span class="text-primary">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-blue-500">@$1</span>');

    return html;
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertText('**', '**'), title: 'Bold' },
    { icon: Italic, action: () => insertText('*', '*'), title: 'Italic' },
    { icon: Underline, action: () => insertText('__', '__'), title: 'Underline' },
    { icon: Strikethrough, action: () => insertText('~~', '~~'), title: 'Strikethrough' },
    { divider: true },
    { icon: Heading1, action: () => insertText('# '), title: 'Heading 1' },
    { icon: Heading2, action: () => insertText('## '), title: 'Heading 2' },
    { icon: Heading3, action: () => insertText('### '), title: 'Heading 3' },
    { divider: true },
    { icon: List, action: () => insertText('- '), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertText('1. '), title: 'Numbered List' },
    { icon: Quote, action: () => insertText('> '), title: 'Quote' },
    { icon: Minus, action: () => insertText('\n---\n'), title: 'Divider' },
    { divider: true },
    { icon: Link, action: () => insertText('[', '](url)'), title: 'Link' },
    { icon: Image, action: () => fileInputRef.current?.click(), title: 'Image' },
    { icon: Hash, action: () => insertText('#'), title: 'Hashtag' },
    { icon: AtSign, action: () => insertText('@'), title: 'Mention' },
  ];

  return (
    <div className="space-y-4">
      {/* Cover Image */}
      <div className="relative">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">Cover სურათი</label>
        {coverUrl ? (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <button
              onClick={() => onCoverChange('')}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 bg-secondary/50"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">აირჩიეთ Cover სურათი</span>
          </button>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e, true)}
        />
      </div>

      {/* Editor */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-secondary/50 border-b border-border">
          {toolbarButtons.map((btn, idx) => 
            btn.divider ? (
              <div key={idx} className="w-px h-6 bg-border mx-1" />
            ) : (
              <Button
                key={idx}
                variant="ghost"
                size="sm"
                onClick={btn.action}
                title={btn.title}
                className="h-8 w-8 p-0"
              >
                <btn.icon className="w-4 h-4" />
              </Button>
            )
          )}
          <div className="flex-1" />
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')}>
            <TabsList className="h-8">
              <TabsTrigger value="write" className="text-xs px-2 py-1">რედაქტორი</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs px-2 py-1">
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area */}
        <div 
          className="min-h-[400px]"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {activeTab === 'write' ? (
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder="დაწერეთ თქვენი სტატია აქ...

გამოიყენეთ:
**bold** ტექსტისთვის
*italic* ტექსტისთვის
# სათაურისთვის
> ციტატისთვის
- სიისთვის
#hashtag თემებისთვის
@username მოხსენიებისთვის

ან გადმოათრიეთ სურათი აქ..."
              className="min-h-[400px] border-0 rounded-none resize-none focus-visible:ring-0 font-mono text-sm"
            />
          ) : (
            <div 
              className="p-4 min-h-[400px] prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderPreview() }}
            />
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e)}
      />

      {uploading && (
        <div className="text-sm text-muted-foreground animate-pulse">
          სურათი იტვირთება...
        </div>
      )}
    </div>
  );
};

export default BlogRichEditor;
