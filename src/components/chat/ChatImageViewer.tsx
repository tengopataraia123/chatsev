import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Maximize2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ChatImageViewer = ({ imageUrl, onClose }: ChatImageViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef<number>(0);

  // Reset state when image changes
  useEffect(() => {
    if (imageUrl) {
      setIsLoading(true);
      setHasError(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [imageUrl]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    if (imageUrl) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [imageUrl, onClose]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = prev / 1.5;
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
        return 1;
      }
      return newScale;
    });
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setNaturalSize({
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight
    });
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2);
      }
    }
    lastTapRef.current = now;
  }, [scale]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for pinch zoom and drag
  const touchStartRef = useRef<{ x: number; y: number; distance: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance
      };
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
    handleDoubleTap(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleChange = distance / touchStartRef.current.distance;
      setScale(prev => Math.max(1, Math.min(prev * scaleChange, 5)));
      touchStartRef.current.distance = distance;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  if (!imageUrl) return null;

  const modalContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleBackdropClick}
    >
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2 text-white/70 text-sm">
          {naturalSize.width > 0 && (
            <span>{naturalSize.width} × {naturalSize.height}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Reset (0)"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="flex flex-col items-center justify-center gap-4 text-white">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <X className="w-8 h-8" />
          </div>
          <p className="text-lg">ფოტო ვერ ჩაიტვირთა</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            თავიდან ცდა
          </button>
        </div>
      )}

      {/* Image container */}
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center overflow-hidden",
          isDragging && "cursor-grabbing",
          scale > 1 && !isDragging && "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Full size"
          className={cn(
            "max-w-[90vw] max-h-[85vh] object-contain transition-opacity duration-300 select-none",
            isLoading ? "opacity-0" : "opacity-100",
            hasError && "hidden"
          )}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
        />
      </div>

      {/* Scale indicator - shows only when zoomed */}
      {scale > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="px-4 py-2 bg-black/50 rounded-full text-white/60 text-sm">
            {Math.round(scale * 100)}%
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ChatImageViewer;
