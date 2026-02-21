import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BlogRichEditor from './BlogRichEditor';
import { BlogCategory } from './types';
import { toast } from 'sonner';

interface CreateBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: BlogCategory[];
  onSubmit: (data: {
    title: string;
    content: string;
    excerpt?: string;
    cover_url?: string;
    category_id?: string;
    tags: string[];
  }) => Promise<any>;
}

const CreateBlogModal = ({ isOpen, onClose, categories, onSubmit }: CreateBlogModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('გთხოვთ შეიყვანოთ სათაური');
      return;
    }
    if (!content.trim()) {
      toast.error('გთხოვთ შეიყვანოთ შინაარსი');
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim().replace('#', ''))
        .filter(t => t);

      const excerpt = content.replace(/[#*_\[\]()]/g, '').substring(0, 200);

      await onSubmit({
        title,
        content,
        excerpt,
        cover_url: coverUrl || undefined,
        category_id: categoryId || undefined,
        tags,
      });

      // Reset form
      setTitle('');
      setContent('');
      setCoverUrl('');
      setCategoryId('');
      setTagsInput('');
      onClose();
    } catch (error) {
      console.error('Error submitting blog:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">ახალი სტატიის შექმნა</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">სათაური *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="შეიყვანეთ სტატიის სათაური"
              className="text-lg font-medium"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>კატეგორია</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="აირჩიეთ კატეგორია" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span style={{ color: cat.color }}>●</span> {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">ტეგები (მძიმით გამოყოფილი)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="მაგ: ტექნოლოგია, ინოვაცია, AI"
            />
          </div>

          {/* Rich Editor */}
          <div className="space-y-2">
            <Label>შინაარსი *</Label>
            <BlogRichEditor
              content={content}
              onChange={setContent}
              coverUrl={coverUrl}
              onCoverChange={setCoverUrl}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            გაუქმება
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                იგზავნება...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                გაგზავნა მოდერაციაზე
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBlogModal;
