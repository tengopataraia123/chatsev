import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PhotoZoomContainerProps {
  imageUrl: string;
  className?: string;
}

const PhotoZoomContainer = ({ imageUrl, className }: PhotoZoomContainerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; distance: number } | null>(null);
  const initialScaleRef = useRef(1);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Touch handlers for pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance
      };
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleChange = distance / touchStartRef.current.distance;
      const newScale = Math.max(1, Math.min(initialScaleRef.current * scaleChange, 5));
      setScale(newScale);
      
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
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
    initialScaleRef.current = scale;
  };

  // Mouse drag handlers (for desktop)
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

  // Double click to toggle zoom on desktop
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden touch-none",
        isDragging && "cursor-grabbing",
        scale > 1 && !isDragging && "cursor-grab",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <img
        src={imageUrl}
        alt=""
        className="max-w-full max-h-full w-auto h-auto object-contain select-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          maxHeight: 'calc(100vh - 160px)'
        }}
        draggable={false}
      />
      
      {/* Scale indicator */}
      {scale > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="px-4 py-2 bg-black/50 rounded-full text-white/60 text-sm">
            {Math.round(scale * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoZoomContainer;
