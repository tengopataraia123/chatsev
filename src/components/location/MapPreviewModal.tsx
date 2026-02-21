import { MapPin, ExternalLink, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  locationFull: string;
  lat?: number;
  lng?: number;
}

const MapPreviewModal = ({ isOpen, onClose, locationName, locationFull, lat, lng }: MapPreviewModalProps) => {
  // Try to extract coordinates from locationFull if lat/lng are null
  let mapLat = lat;
  let mapLng = lng;
  
  if (mapLat === undefined && mapLng === undefined && locationFull) {
    // Parse coordinates from "53.5556, 9.9863" format
    const coordMatch = locationFull.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      mapLat = parseFloat(coordMatch[1]);
      mapLng = parseFloat(coordMatch[2]);
    }
  }
  
  const hasCoordinates = mapLat !== undefined && mapLng !== undefined && !isNaN(mapLat) && !isNaN(mapLng);

  const openInGoogleMaps = () => {
    if (hasCoordinates) {
      window.open(`https://www.google.com/maps?q=${mapLat},${mapLng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(locationFull)}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            მდებარეობა
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map Preview */}
          {hasCoordinates ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapLat},${mapLng}&zoom=14`}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-secondary flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{locationName}</p>
                <p className="text-muted-foreground text-sm">{locationFull}</p>
              </div>
            </div>
          )}

          {/* Location Info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{locationName}</p>
              <p className="text-sm text-muted-foreground">{locationFull}</p>
            </div>
          </div>

          {/* Actions */}
          <Button onClick={openInGoogleMaps} className="w-full gap-2">
            <ExternalLink className="w-4 h-4" />
            გახსნა Google Maps-ში
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapPreviewModal;
