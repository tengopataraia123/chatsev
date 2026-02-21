import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface FullscreenImageViewerProps {
  urls: string[];
  index: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const FullscreenImageViewer = ({ urls, index, onClose, onNavigate }: FullscreenImageViewerProps) => {
  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <button 
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            className="absolute left-2 z-10 p-2 rounded-full bg-black/50 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index - 1 + urls.length) % urls.length);
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-2 z-10 p-2 rounded-full bg-black/50 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index + 1) % urls.length);
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <img
        src={urls[index]}
        alt=""
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
};

export default FullscreenImageViewer;
