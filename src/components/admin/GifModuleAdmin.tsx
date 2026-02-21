import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, GripVertical, FolderOpen, ChevronRight, Image, Shield } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GifCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface Gif {
  id: string;
  title: string;
  file_original: string;
  file_preview: string | null;
  category_id: string | null;
  tags: string[];
  status: string;
  usage_count: number;
  created_at: string;
  shortcode: string | null;
}

const SortableGifItem = ({ 
  gif, 
  onDelete,
  onEdit,
  canEdit
}: { 
  gif: Gif; 
  onDelete: (id: string) => void;
  onEdit: (gif: Gif) => void;
  canEdit: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gif.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-card border border-border rounded-xl overflow-hidden"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 z-10 cursor-grab active:cursor-grabbing bg-background/80 backdrop-blur-sm rounded-lg p-1 touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <img
        src={gif.file_preview || gif.file_original}
        alt={gif.title}
        className="w-full aspect-square object-cover"
      />
      <div className="p-2">
        <p className="text-xs font-medium truncate">{gif.title}</p>
        {gif.shortcode && (
          <p className="text-[10px] text-muted-foreground truncate">{gif.shortcode}</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {gif.usage_count || 0}
          </Badge>
          <div className="flex gap-0.5">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(gif)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(gif.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CategoryDropZone = ({ 
  category, 
  gifs, 
  onDeleteGif,
  onEditGif,
  isOver,
  canEdit
}: { 
  category: GifCategory; 
  gifs: Gif[]; 
  onDeleteGif: (id: string) => void;
  onEditGif: (gif: Gif) => void;
  isOver: boolean;
  canEdit: boolean;
}) => {
  return (
    <Card className={`transition-colors rounded-xl ${isOver ? 'border-primary bg-primary/5' : ''}`}>
      <CardHeader className="py-3 px-3 sm:px-6">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <span className="truncate">{category.name}</span>
          <Badge variant="secondary" className="ml-auto flex-shrink-0">
            {gifs.length} GIF
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 sm:px-6">
        <SortableContext items={gifs.map(g => g.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 min-h-[100px]">
            {gifs.length === 0 ? (
              <div className="col-span-full flex items-center justify-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-xl">
                გადმოათრიე GIF-ები აქ
              </div>
            ) : (
              gifs.map((gif) => (
                <SortableGifItem key={gif.id} gif={gif} onDelete={onDeleteGif} onEdit={onEditGif} canEdit={canEdit} />
              ))
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
};

const SortableCategoryItem = ({ 
  category, 
  gifCount,
  onEdit, 
  onDelete, 
  onToggleActive,
  onUploadGif,
  onViewGifs,
  canEdit
}: { 
  category: GifCategory; 
  gifCount: number;
  onEdit: (category: GifCategory) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onUploadGif: (categoryId: string) => void;
  onViewGifs: (category: GifCategory) => void;
  canEdit: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors overflow-hidden"
    >
      {/* Main Row - Click to view */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => onViewGifs(category)}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        {/* Category Info */}
        <div className="flex-1 min-w-0">
          <span className={`font-medium truncate block ${!category.is_active ? 'text-muted-foreground' : ''}`}>
            {category.name}
          </span>
        </div>
        
        {/* GIF Count Badge */}
        <Badge variant="secondary" className="text-xs flex-shrink-0 gap-1">
          <Image className="h-3 w-3" />
          {gifCount}
        </Badge>
        
        {/* Chevron for mobile indication */}
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
      
      {/* Action Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">აქტიური:</span>
          <Switch
            checked={category.is_active}
            onCheckedChange={(checked) => onToggleActive(category.id, checked)}
            className="scale-90"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9" 
            onClick={(e) => { e.stopPropagation(); onUploadGif(category.id); }}
          >
            <Upload className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={(e) => { e.stopPropagation(); onEdit(category); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9" 
            onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export function GifModuleAdmin() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<GifCategory[]>([]);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Category form
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GifCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  
  // GIF upload
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadCategoryId, setUploadCategoryId] = useState<string | null>(null);
  const [gifShortcode, setGifShortcode] = useState('');
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // GIF edit
  const [showEditGifDialog, setShowEditGifDialog] = useState(false);
  const [editingGif, setEditingGif] = useState<Gif | null>(null);
  const [editGifTitle, setEditGifTitle] = useState('');
  const [editGifShortcode, setEditGifShortcode] = useState('');
  const [editGifCategoryId, setEditGifCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation states
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [showDeleteGifDialog, setShowDeleteGifDialog] = useState(false);
  const [deletingGifId, setDeletingGifId] = useState<string | null>(null);
  
  // Drag state
  const [activeGif, setActiveGif] = useState<Gif | null>(null);
  const [overCategoryId, setOverCategoryId] = useState<string | null>(null);
  
  // Category GIFs view state
  const [showCategoryGifsDialog, setShowCategoryGifsDialog] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<GifCategory | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchCategories();
    fetchGifs();
    checkSuperAdmin();
  }, [user?.id]);
  
  const checkSuperAdmin = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    setIsSuperAdmin(data?.role === 'super_admin');
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('gif_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      toast.error('კატეგორიების ჩატვირთვა ვერ მოხერხდა');
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const fetchGifs = async () => {
    const { data, error } = await supabase
      .from('gifs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('GIF-ების ჩატვირთვა ვერ მოხერხდა');
    } else {
      setGifs(data || []);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('შეიყვანეთ კატეგორიის სახელი');
      return;
    }

    if (editingCategory) {
      const { error } = await supabase
        .from('gif_categories')
        .update({ name: categoryName })
        .eq('id', editingCategory.id);
      
      if (error) {
        toast.error('კატეგორიის განახლება ვერ მოხერხდა');
      } else {
        toast.success('კატეგორია განახლდა');
        fetchCategories();
      }
    } else {
      const maxOrder = Math.max(...categories.map(c => c.sort_order), 0);
      const { error } = await supabase
        .from('gif_categories')
        .insert({ name: categoryName, sort_order: maxOrder + 1 });
      
      if (error) {
        toast.error('კატეგორიის დამატება ვერ მოხერხდა');
      } else {
        toast.success('კატეგორია დაემატა');
        fetchCategories();
      }
    }
    
    setShowCategoryDialog(false);
    setCategoryName('');
    setEditingCategory(null);
  };

  const handleOpenDeleteCategoryDialog = (id: string) => {
    setDeletingCategoryId(id);
    setShowDeleteCategoryDialog(true);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategoryId) return;
    
    try {
      // First, update any GIFs in this category to have no category
      const { error: updateError } = await supabase
        .from('gifs')
        .update({ category_id: null })
        .eq('category_id', deletingCategoryId);
      
      if (updateError) {
        console.error('Error updating GIFs:', updateError);
      }
      
      // Then delete the category
      const { error } = await supabase
        .from('gif_categories')
        .delete()
        .eq('id', deletingCategoryId);
      
      if (error) {
        console.error('Category delete error:', error);
        toast.error(`კატეგორიის წაშლა ვერ მოხერხდა: ${error.message}`);
      } else {
        toast.success('კატეგორია წაიშალა');
        fetchCategories();
        fetchGifs();
      }
    } catch (err) {
      console.error('Delete category exception:', err);
      toast.error('კატეგორიის წაშლა ვერ მოხერხდა');
    }
    
    setShowDeleteCategoryDialog(false);
    setDeletingCategoryId(null);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('gif_categories')
      .update({ is_active: isActive })
      .eq('id', id);
    
    if (error) {
      toast.error('სტატუსის შეცვლა ვერ მოხერხდა');
    } else {
      fetchCategories();
    }
  };

  const handleEditCategory = (category: GifCategory) => {
    if (!isSuperAdmin) {
      toast.error('რედაქტირება მხოლოდ სუპერ ადმინებისთვის');
      return;
    }
    setEditingCategory(category);
    setCategoryName(category.name);
    setShowCategoryDialog(true);
  };

  const handleOpenUploadDialog = (categoryId: string) => {
    setUploadCategoryId(categoryId);
    setShowUploadDialog(true);
  };

  const handleUploadGif = async () => {
    if (!gifShortcode.trim()) {
      toast.error('შეცდომა: შორტკოდი ცარიელია. გთხოვთ შეიყვანოთ შორტკოდი, მაგ: .შელბი.');
      return;
    }

    // Validate shortcode format (must start and end with .)
    const shortcode = gifShortcode.trim();
    if (!shortcode.startsWith('.') || !shortcode.endsWith('.') || shortcode.length < 3) {
      toast.error('შეცდომა: შორტკოდი უნდა იწყებოდეს და მთავრდებოდეს წერტილით, მაგ: .შელბი.');
      return;
    }

    if (!gifFile) {
      toast.error('შეცდომა: ფაილი არ არის არჩეული. გთხოვთ აირჩიოთ GIF ფაილი ასატვირთად.');
      return;
    }

    // Validate file type
    const isGif = gifFile.type === 'image/gif' || gifFile.name.toLowerCase().endsWith('.gif');
    if (!isGif) {
      toast.error(`შეცდომა: არასწორი ფაილის ფორმატი. თქვენ აირჩიეთ "${gifFile.type || 'უცნობი'}" ტიპის ფაილი. მხოლოდ GIF ფორმატის ფაილები დაშვებულია.`);
      return;
    }

    // Validate file size (max 1MB)
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    const fileSizeKB = Math.round(gifFile.size / 1024);
    const fileSizeMB = (gifFile.size / (1024 * 1024)).toFixed(2);
    
    if (gifFile.size > MAX_FILE_SIZE) {
      toast.error(`შეცდომა: ფაილის ზომა ძალიან დიდია. თქვენი ფაილი: ${fileSizeMB}MB (${fileSizeKB}KB). მაქსიმალური დაშვებული ზომა: 1MB.`);
      return;
    }

    if (!uploadCategoryId) {
      toast.error('შეცდომა: კატეგორია არ არის არჩეული. გთხოვთ აირჩიოთ კატეგორია GIF-ისთვის.');
      return;
    }

    setUploading(true);

    try {
      const fileName = `${Date.now()}_${gifFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('gifs')
        .upload(fileName, gifFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Handle specific storage errors
        if (uploadError.message.includes('Bucket not found')) {
          toast.error('შეცდომა: GIF-ების საცავი არ არსებობს. დაუკავშირდით ადმინისტრატორს.');
        } else if (uploadError.message.includes('Payload too large')) {
          toast.error('შეცდომა: ფაილი ძალიან დიდია სერვერისთვის.');
        } else if (uploadError.message.includes('Invalid file type')) {
          toast.error('შეცდომა: სერვერმა არ მიიღო ფაილის ტიპი.');
        } else if (uploadError.message.includes('not allowed')) {
          toast.error('შეცდომა: თქვენ არ გაქვთ GIF-ების ატვირთვის უფლება.');
        } else if (uploadError.message.includes('duplicate') || uploadError.message.includes('already exists')) {
          toast.error('შეცდომა: ასეთი ფაილი უკვე არსებობს საცავში.');
        } else {
          toast.error(`შეცდომა ატვირთვისას: ${uploadError.message}`);
        }
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('gifs')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('gifs')
        .insert({
          title: shortcode, // Use shortcode as title
          file_original: publicUrl,
          category_id: uploadCategoryId,
          status: 'active',
          shortcode: shortcode.toLowerCase(),
        });

      if (insertError) {
        // Handle specific database errors
        if (insertError.message.includes('violates foreign key')) {
          toast.error('შეცდომა: არჩეული კატეგორია არ არსებობს.');
        } else if (insertError.message.includes('permission denied') || insertError.message.includes('RLS')) {
          toast.error('შეცდომა: თქვენ არ გაქვთ GIF-ის დამატების უფლება მონაცემთა ბაზაში.');
        } else if (insertError.message.includes('duplicate key') || insertError.message.includes('unique')) {
          toast.error('შეცდომა: ეს შორტკოდი უკვე გამოყენებულია სხვა GIF-ისთვის. გთხოვთ აირჩიოთ სხვა.');
        } else {
          toast.error(`შეცდომა მონაცემთა ბაზაში შენახვისას: ${insertError.message}`);
        }
        setUploading(false);
        return;
      }

      toast.success(`GIF წარმატებით აიტვირთა შორტკოდით: ${shortcode}`);
      setShowUploadDialog(false);
      setGifShortcode('');
      setGifFile(null);
      setUploadCategoryId(null);
      fetchGifs();
    } catch (error: any) {
      const errorMessage = error?.message || 'უცნობი შეცდომა';
      toast.error(`მოულოდნელი შეცდომა: ${errorMessage}. გთხოვთ სცადოთ თავიდან.`);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDeleteGifDialog = (id: string) => {
    setDeletingGifId(id);
    setShowDeleteGifDialog(true);
  };

  const handleConfirmDeleteGif = async () => {
    if (!deletingGifId) return;
    
    const { error } = await supabase
      .from('gifs')
      .delete()
      .eq('id', deletingGifId);
    
    if (error) {
      toast.error('GIF-ის წაშლა ვერ მოხერხდა');
    } else {
      toast.success('GIF წაიშალა');
      fetchGifs();
    }
    
    setShowDeleteGifDialog(false);
    setDeletingGifId(null);
  };

  const handleOpenEditGifDialog = (gif: Gif) => {
    if (!isSuperAdmin) {
      toast.error('რედაქტირება მხოლოდ სუპერ ადმინებისთვის');
      return;
    }
    setEditingGif(gif);
    setEditGifTitle(gif.title);
    setEditGifShortcode(gif.shortcode || '');
    setEditGifCategoryId(gif.category_id);
    setShowEditGifDialog(true);
  };

  const handleSaveGifEdit = async () => {
    if (!editingGif) return;

    if (!editGifTitle.trim()) {
      toast.error('შეცდომა: სათაური ცარიელია. გთხოვთ შეიყვანოთ GIF-ის სათაური.');
      return;
    }

    if (!editGifShortcode.trim()) {
      toast.error('შეცდომა: შორტკოდი ცარიელია. გთხოვთ შეიყვანოთ შორტკოდი, მაგ: .შელბი.');
      return;
    }

    const shortcode = editGifShortcode.trim();
    if (!shortcode.startsWith('.') || !shortcode.endsWith('.') || shortcode.length < 3) {
      toast.error('შეცდომა: შორტკოდი უნდა იწყებოდეს და მთავრდებოდეს წერტილით, მაგ: .შელბი.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('gifs')
        .update({
          title: editGifTitle.trim(),
          shortcode: shortcode.toLowerCase(),
          category_id: editGifCategoryId,
        })
        .eq('id', editingGif.id);

      if (error) {
        if (error.message.includes('duplicate key') || error.message.includes('unique')) {
          toast.error('შეცდომა: ეს შორტკოდი უკვე გამოყენებულია სხვა GIF-ისთვის.');
        } else {
          toast.error(`შეცდომა: ${error.message}`);
        }
      } else {
        toast.success('GIF წარმატებით განახლდა');
        setShowEditGifDialog(false);
        setEditingGif(null);
        fetchGifs();
      }
    } catch (error: any) {
      toast.error(`მოულოდნელი შეცდომა: ${error?.message || 'უცნობი'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    
    const newCategories = [...categories];
    const [removed] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, removed);
    
    // Update sort orders
    const updates = newCategories.map((cat, index) => ({
      id: cat.id,
      sort_order: index,
    }));
    
    setCategories(newCategories.map((cat, index) => ({ ...cat, sort_order: index })));
    
    for (const update of updates) {
      await supabase
        .from('gif_categories')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }
  };

  const handleGifDragStart = (event: DragStartEvent) => {
    const gif = gifs.find(g => g.id === event.active.id);
    if (gif) setActiveGif(gif);
  };

  const handleGifDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverCategoryId(null);
      return;
    }
    
    // Check if dragging over a category drop zone
    const overGif = gifs.find(g => g.id === over.id);
    if (overGif) {
      setOverCategoryId(overGif.category_id);
    }
  };

  const handleGifDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGif(null);
    setOverCategoryId(null);
    
    if (!over) return;
    
    const draggedGif = gifs.find(g => g.id === active.id);
    if (!draggedGif) return;
    
    // Find the category of the drop target
    const overGif = gifs.find(g => g.id === over.id);
    const newCategoryId = overGif?.category_id;
    
    if (newCategoryId && newCategoryId !== draggedGif.category_id) {
      // Update category
      const { error } = await supabase
        .from('gifs')
        .update({ category_id: newCategoryId })
        .eq('id', draggedGif.id);
      
      if (error) {
        toast.error('GIF-ის გადატანა ვერ მოხერხდა');
      } else {
        toast.success('GIF გადატანილია');
        fetchGifs();
      }
    }
  };

  const getGifsByCategory = (categoryId: string) => {
    return gifs.filter(g => g.category_id === categoryId);
  };

  const uncategorizedGifs = gifs.filter(g => !g.category_id);

  if (loading) {
    return <div className="flex justify-center p-8">იტვირთება...</div>;
  }

  return (
    <ScrollArea className="h-[calc(100vh-120px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
    <div className="space-y-6 pb-6 pr-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="categories" className="text-sm">კატეგორიები</TabsTrigger>
          <TabsTrigger value="gifs" className="text-sm">GIF-ები</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 flex-shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-medium">კატეგორიების მართვა</h3>
              {isSuperAdmin && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Shield className="h-3 w-3" />
                  სუპერ ადმინი - რედაქტირება ხელმისაწვდომია
                </p>
              )}
            </div>
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => { setEditingCategory(null); setCategoryName(''); }}
                  className="w-full sm:w-auto"
                  size="default"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  დამატება
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-4 sm:mx-auto max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>სახელი</Label>
                    <Input
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="კატეგორიის სახელი"
                      className="text-base"
                    />
                  </div>
                  <Button onClick={handleSaveCategory} className="w-full h-11">
                    შენახვა
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCategoryDragEnd}
            >
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 pr-4">
                  {categories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      gifCount={gifs.filter(g => g.category_id === category.id).length}
                      onEdit={handleEditCategory}
                      onDelete={handleOpenDeleteCategoryDialog}
                      onToggleActive={handleToggleActive}
                      onUploadGif={handleOpenUploadDialog}
                      onViewGifs={(cat) => {
                        setViewingCategory(cat);
                        setShowCategoryGifsDialog(true);
                      }}
                      canEdit={isSuperAdmin}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {categories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                კატეგორიები არ არის დამატებული
              </p>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="gifs" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-medium">GIF-ების მართვა</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Drag & Drop გადაადგილებისთვის</p>
              {isSuperAdmin && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Shield className="h-3 w-3" />
                  სუპერ ადმინი - რედაქტირება ხელმისაწვდომია
                </p>
              )}
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleGifDragStart}
            onDragOver={handleGifDragOver}
            onDragEnd={handleGifDragEnd}
          >
            <div className="grid gap-4">
              {/* Uncategorized GIFs */}
              <Card className="rounded-xl">
                <CardHeader className="py-3 px-3 sm:px-6">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">კატეგორიის გარეშე</span>
                    <Badge variant="secondary" className="ml-auto flex-shrink-0">
                      {uncategorizedGifs.length} GIF
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-6">
                  <SortableContext items={uncategorizedGifs.map(g => g.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 min-h-[100px]">
                      {uncategorizedGifs.length === 0 ? (
                        <div className="col-span-full flex items-center justify-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-xl">
                          კატეგორიის გარეშე GIF-ები არ არის
                        </div>
                      ) : (
                        uncategorizedGifs.map((gif) => (
                          <SortableGifItem key={gif.id} gif={gif} onDelete={handleOpenDeleteGifDialog} onEdit={handleOpenEditGifDialog} canEdit={isSuperAdmin} />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>

              {/* Categories with GIFs */}
              {categories.map((category) => (
                <CategoryDropZone
                  key={category.id}
                  category={category}
                  gifs={getGifsByCategory(category.id)}
                  onDeleteGif={handleOpenDeleteGifDialog}
                  onEditGif={handleOpenEditGifDialog}
                  isOver={overCategoryId === category.id}
                  canEdit={isSuperAdmin}
                />
              ))}
            </div>

            <DragOverlay>
              {activeGif && (
                <div className="bg-card border-2 border-primary rounded-xl overflow-hidden shadow-xl">
                  <img
                    src={activeGif.file_preview || activeGif.file_original}
                    alt={activeGif.title}
                    className="w-24 h-24 object-cover"
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </TabsContent>
      </Tabs>

      {/* GIF Upload Dialog - Mobile Optimized */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="mx-4 sm:mx-auto max-w-md">
          <DialogHeader>
            <DialogTitle>GIF-ის ატვირთვა</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">შორტკოდი (მაგ: .შელბი.)</Label>
              <Input
                value={gifShortcode}
                onChange={(e) => setGifShortcode(e.target.value)}
                placeholder=".შელბი."
                className="text-base h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                შორტკოდი უნდა იწყებოდეს და მთავრდებოდეს წერტილით.
              </p>
            </div>
            <div>
              <Label className="text-sm">ფაილი (მაქს. 1MB)</Label>
              <Input
                type="file"
                accept=".gif,image/gif"
                onChange={(e) => setGifFile(e.target.files?.[0] || null)}
                className="text-base h-11 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1.5">მხოლოდ GIF ფორმატი</p>
            </div>
            <Button onClick={handleUploadGif} disabled={uploading} className="w-full h-11">
              {uploading ? 'იტვირთება...' : 'ატვირთვა'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GIF Edit Dialog - Mobile Optimized */}
      <Dialog open={showEditGifDialog} onOpenChange={setShowEditGifDialog}>
        <DialogContent className="mx-4 sm:mx-auto max-w-md">
          <DialogHeader>
            <DialogTitle>GIF-ის რედაქტირება</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingGif && (
              <div className="flex justify-center p-3 bg-secondary/30 rounded-xl">
                <img 
                  src={editingGif.file_preview || editingGif.file_original} 
                  alt={editingGif.title}
                  className="h-28 sm:h-32 rounded-lg object-contain"
                />
              </div>
            )}
            <div>
              <Label className="text-sm">სათაური</Label>
              <Input
                value={editGifTitle}
                onChange={(e) => setEditGifTitle(e.target.value)}
                placeholder="GIF-ის სათაური"
                className="text-base h-11"
              />
            </div>
            <div>
              <Label className="text-sm">შორტკოდი (მაგ: .შელბი.)</Label>
              <Input
                value={editGifShortcode}
                onChange={(e) => setEditGifShortcode(e.target.value)}
                placeholder=".შელბი."
                className="text-base h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                შორტკოდი უნდა იწყებოდეს და მთავრდებოდეს წერტილით.
              </p>
            </div>
            <div>
              <Label className="text-sm">კატეგორია</Label>
              <select
                value={editGifCategoryId || ''}
                onChange={(e) => setEditGifCategoryId(e.target.value || null)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-base"
              >
                <option value="">კატეგორიის გარეშე</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleSaveGifEdit} disabled={saving} className="w-full h-11">
              {saving ? 'ინახება...' : 'შენახვა'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>კატეგორიის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ ამ კატეგორიის წაშლა? ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete GIF Confirmation */}
      <AlertDialog open={showDeleteGifDialog} onOpenChange={setShowDeleteGifDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>GIF-ის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ ამ GIF-ის წაშლა? ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteGif} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category GIFs View Dialog - Mobile Optimized */}
      <Dialog open={showCategoryGifsDialog} onOpenChange={setShowCategoryGifsDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 sm:p-6">
          <DialogHeader className="p-4 sm:p-0 pb-0 border-b sm:border-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FolderOpen className="h-5 w-5 text-primary" />
              <span className="truncate">{viewingCategory?.name}</span>
              <Badge variant="secondary" className="ml-auto flex-shrink-0">
                {viewingCategory ? gifs.filter(g => g.category_id === viewingCategory.id).length : 0} GIF
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-0 sm:pt-4">
            {viewingCategory && gifs.filter(g => g.category_id === viewingCategory.id).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Image className="h-8 w-8" />
                </div>
                <p className="text-sm">ამ კატეგორიაში გიფები არ არის</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setShowCategoryGifsDialog(false);
                    handleOpenUploadDialog(viewingCategory.id);
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  ატვირთვა
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {viewingCategory && gifs
                  .filter(g => g.category_id === viewingCategory.id)
                  .map((gif) => (
                    <div 
                      key={gif.id} 
                      className="relative bg-card border border-border rounded-xl overflow-hidden"
                    >
                      <img
                        src={gif.file_preview || gif.file_original}
                        alt={gif.title}
                        className="w-full aspect-square object-cover"
                      />
                      {/* Mobile: Always visible action bar at bottom */}
                      <div className="p-2 bg-card">
                        <p className="text-xs font-medium truncate mb-1">{gif.shortcode || gif.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{gif.usage_count || 0} გამოყენება</span>
                          <div className="flex gap-1">
                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleOpenEditGifDialog(gif)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDeleteGifDialog(gif.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between p-4 sm:p-0 sm:pt-4 border-t">
            <Button 
              variant="outline"
              className="w-full sm:w-auto order-2 sm:order-1"
              onClick={() => {
                if (viewingCategory) {
                  handleOpenUploadDialog(viewingCategory.id);
                }
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              ახალი GIF
            </Button>
            <Button 
              variant="secondary" 
              className="w-full sm:w-auto order-1 sm:order-2"
              onClick={() => setShowCategoryGifsDialog(false)}
            >
              დახურვა
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ScrollArea>
  );
}
