import { X, FileText, Play } from 'lucide-react';

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'file';
}

interface MediaPreviewProps {
  files: MediaFile[];
  onRemove: (index: number) => void;
}

const MediaPreview = ({ files, onRemove }: MediaPreviewProps) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((media, index) => (
        <div key={index} className="relative group">
          {media.type === 'image' && (
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary">
              <img src={media.preview} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {media.type === 'video' && (
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary relative">
              <video src={media.preview} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
            </div>
          )}
          {media.type === 'file' && (
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 max-w-[180px]">
              <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{media.file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(media.file.size)}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => onRemove(index)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default MediaPreview;
