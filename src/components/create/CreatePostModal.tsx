import { useState, useRef } from 'react';
import { X, Image, Video, Smile, Loader2, Palette, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sendFriendContentNotification } from '@/hooks/useFriendNotifications';
import { useS3Upload, S3_FOLDERS } from '@/hooks/useS3Upload';
import { createPendingApproval } from '@/hooks/useModerationQueue';
import VideoUploadTabs from './VideoUploadTabs';
import { LocationPicker, LocationTag, LocationData } from '@/components/location';
import { HashtagMentionInput } from '@/components/hashtag';
import { MoodPickerModal, MoodTag, SelectedMood, formatMoodDisplay } from '@/components/mood';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (content: string) => void;
}

const backgroundColors = [
  { id: 'none', value: '', label: 'ჩვეულებრივი' },
  { id: 'gradient1', value: 'bg-gradient-to-br from-blue-500 to-purple-600', label: 'ლურჯი' },
  { id: 'gradient2', value: 'bg-gradient-to-br from-pink-500 to-red-500', label: 'ვარდისფერი' },
  { id: 'gradient3', value: 'bg-gradient-to-br from-green-400 to-cyan-500', label: 'მწვანე' },
  { id: 'gradient4', value: 'bg-gradient-to-br from-yellow-400 to-orange-500', label: 'ყვითელი' },
  { id: 'gradient5', value: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'იისფერი' },
  { id: 'gradient6', value: 'bg-gradient-to-br from-gray-800 to-gray-900', label: 'მუქი' },
  { id: 'gradient7', value: 'bg-gradient-to-br from-indigo-600 to-blue-700', label: 'ინდიგო' },
  { id: 'gradient8', value: 'bg-gradient-to-br from-rose-400 to-red-600', label: 'წითელი' },
];

const CreatePostModal = ({ isOpen, onClose, onSubmit }: CreatePostModalProps) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState('');
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [selectedMood, setSelectedMood] = useState<SelectedMood | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { upload: s3Upload } = useS3Upload();

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'ფაილი ძალიან დიდია',
          description: 'მაქსიმუმ 10MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile && !selectedMood) {
      toast({
        title: 'შეცდომა',
        description: 'დაწერეთ რამე, ატვირთეთ მედია ან აირჩიეთ ხასიათი',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შედით სისტემაში',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // Upload image if exists
      if (imageFile) {
        const result = await s3Upload(imageFile, S3_FOLDERS.POSTS);
        if (result) {
          imageUrl = result.url;
        }
      }

      // Create post with optional background color stored in content
      let finalContent = content.trim();
      if (selectedBackground && finalContent) {
        finalContent = `[bg:${selectedBackground}]${finalContent}`;
      }

      // Create post as pending (not approved)
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: finalContent || null,
          image_url: imageUrl,
          is_approved: false,
          mood_emoji: selectedMood?.emoji || null,
          mood_text: selectedMood ? formatMoodDisplay(selectedMood) : null,
          mood_type: selectedMood?.type || null,
          // Location fields
          location_name: selectedLocation?.location_name || null,
          location_full: selectedLocation?.location_full || null,
          location_lat: selectedLocation?.hide_exact_location ? null : selectedLocation?.location_lat,
          location_lng: selectedLocation?.hide_exact_location ? null : selectedLocation?.location_lng,
          place_id: selectedLocation?.place_id || null,
          location_source: selectedLocation?.location_source || null,
          hide_exact_location: selectedLocation?.hide_exact_location ?? true,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Create pending approval for moderation
      if (postData) {
        const moderationType = imageUrl ? 'post_image' : 'post';
        await createPendingApproval({
          type: moderationType,
          userId: user.id,
          contentId: postData.id,
          contentData: {
            content: finalContent,
            image_url: imageUrl,
          },
        });

        // Save mood to user_status if selected
        if (selectedMood) {
          // Deactivate old moods
          await supabase
            .from('user_status')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('is_active', true);

          await supabase.from('user_status').insert({
            user_id: user.id,
            type: selectedMood.type,
            feeling_key: selectedMood.type === 'feeling' ? selectedMood.key : null,
            activity_key: selectedMood.type === 'activity' ? selectedMood.key : null,
            emoji: selectedMood.emoji,
            display_text: selectedMood.label,
            object_text: selectedMood.objectText || null,
            post_id: postData.id,
            is_active: true,
          });
        }
      }

      toast({
        title: 'წარმატება!',
        description: 'თქვენი პოსტი გაიგზავნა მოდერაციაზე',
      });

      onSubmit?.(content);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'შეცდომა',
        description: 'პოსტის შექმნა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setContent('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedBackground('');
    setShowBackgroundPicker(false);
    setShowVideoUpload(false);
    setShowLocationPicker(false);
    setSelectedLocation(null);
    setShowMoodPicker(false);
    setSelectedMood(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVideoSuccess = () => {
    toast({
      title: 'წარმატება!',
      description: 'ვიდეო გაზიარდა',
    });
    resetForm();
    onClose();
  };

  // Show video upload modal
  if (showVideoUpload) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in slide-in-from-bottom duration-300">
          <VideoUploadTabs
            onSuccess={handleVideoSuccess}
            onCancel={() => setShowVideoUpload(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={handleClose} className="p-1">
            <X className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-lg">ახალი პოსტი</h2>
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && !imageFile && !selectedMood) || isSubmitting}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'გამოქვეყნება'}
          </Button>
        </div>

        {/* Content */}
        <div className={`p-4 ${selectedBackground} ${selectedBackground ? 'min-h-[200px] flex items-center justify-center' : ''}`}>
          <HashtagMentionInput
            placeholder="რას ფიქრობთ? გამოიყენე # და @ ..."
            value={content}
            onChange={setContent}
            className={`min-h-[120px] border-none focus-visible:ring-0 text-lg placeholder:text-muted-foreground ${
              selectedBackground 
                ? 'bg-transparent text-white placeholder:text-white/70 text-center text-xl font-semibold' 
                : 'bg-transparent'
            }`}
            autoFocus
            minRows={4}
            maxRows={8}
          />
        </div>

        {/* Background Picker */}
        {showBackgroundPicker && (
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
              {backgroundColors.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBackground(bg.value)}
                  className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all ${
                    selectedBackground === bg.value ? 'border-primary scale-110' : 'border-border'
                  } ${bg.value || 'bg-card'}`}
                  title={bg.label}
                >
                  {bg.id === 'none' && <span className="text-xs">❌</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mood Tag */}
        {selectedMood && (
          <div className="px-4 pb-2">
            <MoodTag mood={selectedMood} onRemove={() => setSelectedMood(null)} />
          </div>
        )}

        {/* Location Tag */}
        {selectedLocation && (
          <div className="px-4 pb-2">
            <LocationTag
              locationName={selectedLocation.location_name}
              locationFull={selectedLocation.location_full}
              onRemove={() => setSelectedLocation(null)}
            />
          </div>
        )}

        {/* Media Preview */}
        {imagePreview && (
          <div className="px-4 pb-3">
            <div className="relative rounded-xl overflow-hidden">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full max-h-64 object-cover rounded-xl"
              />
              <button
                onClick={removeMedia}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Media Options */}
        <div className="flex items-center gap-3 p-4 border-t border-border">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors"
          >
            <Image className="w-6 h-6" />
            <span className="text-sm hidden sm:inline">ფოტო</span>
          </button>
          
          <button 
            onClick={() => setShowVideoUpload(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Video className="w-6 h-6" />
            <span className="text-sm hidden sm:inline">ვიდეო</span>
          </button>
          
          <button 
            onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
            className={`flex items-center gap-2 transition-colors ${
              showBackgroundPicker ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <Palette className="w-6 h-6" />
            <span className="text-sm hidden sm:inline">ფონი</span>
          </button>
          
          <button 
            onClick={() => setShowLocationPicker(true)}
            className={`flex items-center gap-2 transition-colors ${
              selectedLocation ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <MapPin className="w-6 h-6" />
            <span className="text-sm hidden sm:inline">ადგილი</span>
          </button>
          
          <button 
            onClick={() => setShowMoodPicker(true)}
            className={`flex items-center gap-2 transition-colors ${
              selectedMood ? 'text-primary' : 'text-muted-foreground hover:text-yellow-500'
            } ml-auto`}
          >
            <Smile className="w-6 h-6" />
            <span className="text-sm hidden sm:inline">ხასიათი</span>
          </button>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={setSelectedLocation}
        currentLocation={selectedLocation}
      />

      {/* Mood Picker Modal */}
      <MoodPickerModal
        isOpen={showMoodPicker}
        onClose={() => setShowMoodPicker(false)}
        onSelect={setSelectedMood}
        currentMood={selectedMood}
      />
    </div>
  );
};

export default CreatePostModal;
