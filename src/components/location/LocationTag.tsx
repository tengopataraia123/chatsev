import { MapPin, X } from 'lucide-react';

interface LocationTagProps {
  locationName: string;
  locationFull: string;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
  showRemove?: boolean;
}

const LocationTag = ({ 
  locationName, 
  locationFull, 
  onRemove, 
  onClick, 
  className = '',
  showRemove = true 
}: LocationTagProps) => {
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm transition-colors ${onClick ? 'cursor-pointer hover:bg-primary/20' : ''} ${className}`}
      onClick={onClick}
    >
      <MapPin className="w-3.5 h-3.5 text-primary" />
      <span className="text-foreground font-medium">{locationName}</span>
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 p-0.5 hover:bg-destructive/20 rounded-full transition-colors"
        >
          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
};

export default LocationTag;
