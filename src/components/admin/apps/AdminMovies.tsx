import { memo, useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Film, Pencil, Trash2, Eye, EyeOff, 
  Loader2, Search, X, GripVertical, ExternalLink, Play, Upload, ImageIcon, User, ChevronUp, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  useAdminMovies, useCreateMovie, useUpdateMovie, useDeleteMovie,
  useMovieGenres, useCreateMovieSource, useUpdateMovieSource, useDeleteMovieSource, useMovie
} from '@/hooks/useMovies';
import { Movie, MovieSource, MovieSourceType, MovieQuality, AgeRating, MovieStatus } from '@/components/movies/types';

const SOURCE_TYPES: { value: MovieSourceType; label: string }[] = [
  { value: 'iframe', label: 'iFrame' },
  { value: 'mp4', label: 'MP4' },
  { value: 'hls_m3u8', label: 'HLS (m3u8)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'external', label: 'გარე ლინკი' },
];

const QUALITY_OPTIONS: MovieQuality[] = ['360p', '480p', '720p', '1080p', '4K'];
const AGE_RATINGS: AgeRating[] = ['0+', '6+', '12+', '16+', '18+'];
const LANGUAGE_OPTIONS = ['KA', 'EN', 'RU', 'TR', 'DE', 'FR'];

interface MovieFormData {
  title_ka: string;
  title_en: string;
  year: number | null;
  genres: string[];
  country: string;
  duration_minutes: number | null;
  description_ka: string;
  description_en: string;
  poster_url: string;
  trailer_url: string;
  age_rating: AgeRating;
  tags: string[];
  status: MovieStatus;
}

interface SourceFormData {
  id?: string;
  label: string;
  url: string;
  source_type: MovieSourceType;
  quality: MovieQuality | null;
  language: string;
  priority: number;
  is_active: boolean;
}

const initialFormData: MovieFormData = {
  title_ka: '',
  title_en: '',
  year: null,
  genres: [],
  country: '',
  duration_minutes: null,
  description_ka: '',
  description_en: '',
  poster_url: '',
  trailer_url: '',
  age_rating: '0+',
  tags: [],
  status: 'draft',
};

const initialSourceData: SourceFormData = {
  label: '',
  url: '',
  source_type: 'iframe',
  quality: null,
  language: 'KA',
  priority: 0,
  is_active: true,
};

const AdminMovies = memo(() => {
  const navigate = useNavigate();
  const { isSuperAdmin, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [formData, setFormData] = useState<MovieFormData>(initialFormData);
  const [sources, setSources] = useState<SourceFormData[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const { data: movies = [], isLoading } = useAdminMovies();
  const { data: genres = [] } = useMovieGenres();
  const createMovie = useCreateMovie();
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();
  const createSource = useCreateMovieSource();
  const updateSource = useUpdateMovieSource();
  const deleteSource = useDeleteMovieSource();

  // Filter movies by search
  const filteredMovies = movies.filter((movie) =>
    movie.title_ka.toLowerCase().includes(searchQuery.toLowerCase()) ||
    movie.title_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Access check
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">წვდომა შეზღუდულია</h2>
          <p className="text-muted-foreground">მხოლოდ Super Admin-ს აქვს ფილმების მართვის უფლება</p>
        </div>
      </div>
    );
  }

  const openAddForm = () => {
    setEditingMovie(null);
    setFormData(initialFormData);
    setSources([]);
    setIsFormOpen(true);
  };

  const openEditForm = (movie: Movie) => {
    setEditingMovie(movie);
    setFormData({
      title_ka: movie.title_ka,
      title_en: movie.title_en || '',
      year: movie.year,
      genres: movie.genres,
      country: movie.country || '',
      duration_minutes: movie.duration_minutes,
      description_ka: movie.description_ka || '',
      description_en: movie.description_en || '',
      poster_url: movie.poster_url || '',
      trailer_url: movie.trailer_url || '',
      age_rating: movie.age_rating,
      tags: movie.tags,
      status: movie.status,
    });
    // Load sources from movie data
    setSources(
      movie.sources?.map((s) => ({
        id: s.id,
        label: s.label,
        url: s.url,
        source_type: s.source_type,
        quality: s.quality,
        language: s.language,
        priority: s.priority,
        is_active: s.is_active,
      })) || []
    );
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title_ka.trim()) {
      toast({ title: 'შეცდომა', description: 'ქართული სათაური აუცილებელია', variant: 'destructive' });
      return;
    }

    try {
      let movieId = editingMovie?.id;

      if (editingMovie) {
        // Update existing movie
        await updateMovie.mutateAsync({
          id: editingMovie.id,
          ...formData,
        });
      } else {
        // Create new movie with current user as creator
        const newMovie = await createMovie.mutateAsync({
          ...formData,
          created_by: user?.id,
        });
        movieId = newMovie.id;
      }

      // Handle sources
      if (movieId) {
        for (const source of sources) {
          if (source.id) {
            // Update existing source
            await updateSource.mutateAsync({
              id: source.id,
              label: source.label,
              url: source.url,
              source_type: source.source_type,
              quality: source.quality,
              language: source.language,
              priority: source.priority,
              is_active: source.is_active,
            });
          } else {
            // Create new source
            await createSource.mutateAsync({
              movie_id: movieId,
              label: source.label,
              url: source.url,
              source_type: source.source_type,
              quality: source.quality,
              language: source.language,
              priority: source.priority,
              is_active: source.is_active,
            });
          }
        }
      }

      toast({ title: 'წარმატება', description: editingMovie ? 'ფილმი განახლდა' : 'ფილმი დაემატა' });
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (movieId: string) => {
    try {
      await deleteMovie.mutateAsync(movieId);
      toast({ title: 'წარმატება', description: 'ფილმი წაიშალა' });
      setDeleteConfirmId(null);
    } catch (error: any) {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    }
  };

  const addSource = () => {
    setSources([...sources, { ...initialSourceData, priority: sources.length }]);
  };

  const removeSource = (index: number) => {
    const source = sources[index];
    if (source.id && editingMovie) {
      // Delete from database
      deleteSource.mutate({ sourceId: source.id, movieId: editingMovie.id });
    }
    setSources(sources.filter((_, i) => i !== index));
  };

  const updateSourceField = (index: number, field: keyof SourceFormData, value: any) => {
    setSources(sources.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const toggleGenre = (genreName: string) => {
    setFormData({
      ...formData,
      genres: formData.genres.includes(genreName)
        ? formData.genres.filter((g) => g !== genreName)
        : [...formData.genres, genreName],
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'შეცდომა', description: 'მხოლოდ სურათის ატვირთვაა შესაძლებელი', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'შეცდომა', description: 'სურათი 5MB-ზე მეტია', variant: 'destructive' });
      return;
    }

    setIsUploadingPoster(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `posters/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('movie-posters')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('movie-posters')
        .getPublicUrl(filePath);

      setFormData({ ...formData, poster_url: publicUrl });
      toast({ title: 'წარმატება', description: 'პოსტერი აიტვირთა' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'შეცდომა', description: error.message || 'ატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setIsUploadingPoster(false);
      if (posterInputRef.current) posterInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              ფილმების მართვა
            </h2>
            <p className="text-sm text-muted-foreground">სულ: {movies.length} ფილმი</p>
          </div>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="w-4 h-4 mr-1" />
          დამატება
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ძებნა..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Movies List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          ფილმები არ მოიძებნა
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMovies.map((movie) => (
            <Card key={movie.id} className="overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                {/* Poster */}
                <div className="w-14 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{movie.title_ka}</h3>
                  {movie.title_en && (
                    <p className="text-sm text-muted-foreground truncate">{movie.title_en}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {movie.year && <Badge variant="outline" className="text-xs">{movie.year}</Badge>}
                    <Badge 
                      variant={movie.status === 'published' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {movie.status === 'published' ? 'გამოქვეყნებული' : 'დრაფტი'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {movie.views_count}
                    </span>
                    {(movie as any).profiles?.username && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {(movie as any).profiles.username}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(`/movies/${movie.id}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(movie)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteConfirmId(movie.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {editingMovie ? 'ფილმის რედაქტირება' : 'ახალი ფილმი'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-140px)]">
            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>სათაური (ქართ.) *</Label>
                  <Input
                    value={formData.title_ka}
                    onChange={(e) => setFormData({ ...formData, title_ka: e.target.value })}
                    placeholder="ფილმის სახელი"
                  />
                </div>
                <div className="space-y-2">
                  <Label>სათაური (ინგლ.)</Label>
                  <Input
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    placeholder="Movie title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>წელი</Label>
                  <Input
                    type="number"
                    value={formData.year || ''}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="2024"
                    min={1900}
                    max={2100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ხანგრძ. (წთ)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes || ''}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="120"
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ქვეყანა</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="საქართველო"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ასაკი</Label>
                  <Select
                    value={formData.age_rating}
                    onValueChange={(v) => setFormData({ ...formData, age_rating: v as AgeRating })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RATINGS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Genres - Collapsible Dropdown */}
              <Collapsible open={isGenreOpen} onOpenChange={setIsGenreOpen}>
                <div className="space-y-2">
                  <Label>ჟანრები</Label>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-9 font-normal"
                    >
                      <span className="text-muted-foreground">
                        {formData.genres.length > 0 ? (
                          <span className="flex items-center gap-2">
                            <span>არჩეულია</span>
                            <Badge variant="secondary" className="text-xs">
                              {formData.genres.length}
                            </Badge>
                          </span>
                        ) : (
                          'აირჩიეთ ჟანრი'
                        )}
                      </span>
                      {isGenreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="mt-2">
                  <div className="border border-border rounded-lg overflow-hidden">
                    <ScrollArea className="h-48">
                      <div className="p-2 space-y-1">
                        {[...genres]
                          .sort((a, b) => a.name_ka.localeCompare(b.name_ka, 'ka'))
                          .map((genre) => (
                            <div
                              key={genre.id}
                              className={`px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                                formData.genres.includes(genre.name_ka)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => toggleGenre(genre.name_ka)}
                            >
                              {genre.name_ka}
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Descriptions */}
              <div className="space-y-2">
                <Label>აღწერა (ქართ.)</Label>
                <Textarea
                  value={formData.description_ka}
                  onChange={(e) => setFormData({ ...formData, description_ka: e.target.value })}
                  placeholder="ფილმის აღწერა..."
                  rows={3}
                />
              </div>

              {/* Poster & Trailer */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ფილმის პოსტერი/ყდა</Label>
                  <div className="flex gap-4">
                    {/* Poster Preview */}
                    <div className="w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-muted border-2 border-dashed border-border">
                      {formData.poster_url ? (
                        <img 
                          src={formData.poster_url} 
                          alt="პოსტერი" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload & URL options */}
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <input
                          ref={posterInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePosterUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => posterInputRef.current?.click()}
                          disabled={isUploadingPoster}
                          className="flex-1"
                        >
                          {isUploadingPoster ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          ატვირთვა
                        </Button>
                        {formData.poster_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormData({ ...formData, poster_url: '' })}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          value={formData.poster_url}
                          onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                          placeholder="ან ჩასვით URL..."
                          className="text-xs"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        რეკომენდირებული: 300x450px, მაქს. 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ტრეილერის URL</Label>
                  <Input
                    value={formData.trailer_url}
                    onChange={(e) => setFormData({ ...formData, trailer_url: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>თეგები</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="ახალი თეგი"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        #{tag}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label>სტატუსი</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.status === 'published' ? 'გამოქვეყნებული - ყველას ჩანს' : 'დრაფტი - მხოლოდ ადმინს ჩანს'}
                  </p>
                </div>
                <Switch
                  checked={formData.status === 'published'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'published' : 'draft' })}
                />
              </div>

              {/* Sources */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">წყაროები (ლინკები)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSource}>
                    <Plus className="w-4 h-4 mr-1" />
                    წყარო
                  </Button>
                </div>

                {sources.map((source, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">წყარო #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeSource(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">ლეიბლი</Label>
                          <Input
                            value={source.label}
                            onChange={(e) => updateSourceField(index, 'label', e.target.value)}
                            placeholder="Server 1"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">ტიპი</Label>
                          <Select
                            value={source.source_type}
                            onValueChange={(v) => updateSourceField(index, 'source_type', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SOURCE_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">URL</Label>
                        <Input
                          value={source.url}
                          onChange={(e) => updateSourceField(index, 'url', e.target.value)}
                          placeholder="https://..."
                          className="h-9"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">ხარისხი</Label>
                          <Select
                            value={source.quality || 'none'}
                            onValueChange={(v) => updateSourceField(index, 'quality', v === 'none' ? null : v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-</SelectItem>
                              {QUALITY_OPTIONS.map((q) => (
                                <SelectItem key={q} value={q}>{q}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">ენა</Label>
                          <Select
                            value={source.language}
                            onValueChange={(v) => updateSourceField(index, 'language', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGE_OPTIONS.map((l) => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end pb-0.5">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={source.is_active}
                              onCheckedChange={(v) => updateSourceField(index, 'is_active', v)}
                            />
                            <Label className="text-xs">აქტიური</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {sources.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    წყაროები არ არის დამატებული
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              გაუქმება
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMovie.isPending || updateMovie.isPending}
            >
              {(createMovie.isPending || updateMovie.isPending) && (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              )}
              {editingMovie ? 'შენახვა' : 'დამატება'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ფილმის წაშლა</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            დარწმუნებული ხართ, რომ გსურთ ამ ფილმის წაშლა? ეს მოქმედება შეუქცევადია.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              გაუქმება
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMovie.isPending}
            >
              {deleteMovie.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              წაშლა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

AdminMovies.displayName = 'AdminMovies';

export default AdminMovies;
