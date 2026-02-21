import { useState, useEffect } from 'react';
import { MapPin, X, Search, Navigation, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  location_name: string;
  location_full: string;
  location_lat?: number;
  location_lng?: number;
  place_id?: string;
  location_source: 'manual' | 'gps' | 'provider';
  hide_exact_location: boolean;
}

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: LocationData) => void;
  currentLocation?: LocationData | null;
}

// Popular Georgian cities
const popularLocations = [
  { name: 'თბილისი', full: 'თბილისი, საქართველო' },
  { name: 'ბათუმი', full: 'ბათუმი, საქართველო' },
  { name: 'ქუთაისი', full: 'ქუთაისი, საქართველო' },
  { name: 'რუსთავი', full: 'რუსთავი, საქართველო' },
  { name: 'გორი', full: 'გორი, საქართველო' },
  { name: 'ზუგდიდი', full: 'ზუგდიდი, საქართველო' },
  { name: 'ფოთი', full: 'ფოთი, საქართველო' },
  { name: 'თელავი', full: 'თელავი, საქართველო' },
  { name: 'მცხეთა', full: 'მცხეთა, საქართველო' },
  { name: 'სიღნაღი', full: 'სიღნაღი, საქართველო' },
  { name: 'ბორჯომი', full: 'ბორჯომი, საქართველო' },
  { name: 'კაზბეგი', full: 'კაზბეგი, საქართველო' },
  { name: 'მესტია', full: 'მესტია, საქართველო' },
  { name: 'ახალციხე', full: 'ახალციხე, საქართველო' },
  { name: 'ქობულეთი', full: 'ქობულეთი, საქართველო' },
];

const LocationPicker = ({ isOpen, onClose, onSelect, currentLocation }: LocationPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [hideExact, setHideExact] = useState(true);
  const [recentLocations, setRecentLocations] = useState<{ name: string; full: string }[]>([]);
  const [trendingLocations, setTrendingLocations] = useState<{ name: string; full: string; count: number }[]>([]);

  // Fetch recent and trending locations
  useEffect(() => {
    if (isOpen) {
      fetchTrendingLocations();
    }
  }, [isOpen]);

  const fetchTrendingLocations = async () => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from('posts')
        .select('location_name, location_full')
        .not('location_name', 'is', null)
        .gte('created_at', weekAgo.toISOString())
        .limit(100);

      if (data) {
        // Count occurrences
        const counts: Record<string, { full: string; count: number }> = {};
        data.forEach(p => {
          if (p.location_name) {
            if (!counts[p.location_name]) {
              counts[p.location_name] = { full: p.location_full || p.location_name, count: 0 };
            }
            counts[p.location_name].count++;
          }
        });

        // Sort by count
        const sorted = Object.entries(counts)
          .map(([name, { full, count }]) => ({ name, full, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTrendingLocations(sorted);
      }
    } catch (error) {
      console.error('Error fetching trending locations:', error);
    }
  };

  const handleSelectLocation = (name: string, full: string, lat?: number, lng?: number, source: 'manual' | 'gps' | 'provider' = 'manual') => {
    onSelect({
      location_name: name,
      location_full: full,
      location_lat: lat,
      location_lng: lng,
      location_source: source,
      hide_exact_location: hideExact,
    });
    onClose();
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setGpsError('თქვენი ბრაუზერი არ უჭერს მხარს GPS-ს');
      return;
    }

    setIsLoadingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use Nominatim (OpenStreetMap) for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ka,en`,
            {
              headers: {
                'User-Agent': 'ChatSev/1.0'
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            
            // Extract city and country
            const city = address.city || address.town || address.village || address.municipality || address.county || '';
            const country = address.country || '';
            
            // Use both city and country for location_name
            const locationName = [city, country].filter(Boolean).join(', ') || 'ჩემი ლოკაცია';
            const locationFull = locationName;
            
            handleSelectLocation(locationName, locationFull, latitude, longitude, 'gps');
          } else {
            // Fallback if geocoding fails
            handleSelectLocation('ჩემი ლოკაცია', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude, 'gps');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Fallback if geocoding fails
          handleSelectLocation('ჩემი ლოკაცია', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude, 'gps');
        }
        
        setIsLoadingGPS(false);
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsError('ლოკაციის მიღება ვერ მოხერხდა');
        setIsLoadingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const filteredLocations = searchQuery.trim()
    ? popularLocations.filter(loc => 
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.full.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularLocations;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            მდებარეობის არჩევა
          </DrawerTitle>
        </DrawerHeader>

        <div className="p-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="მოძებნე ადგილი..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Use Current Location Toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">გამოიყენე მიმდინარე მდებარეობა</p>
                <p className="text-xs text-muted-foreground">GPS-ით განსაზღვრა</p>
              </div>
            </div>
            <button
              onClick={handleUseCurrentLocation}
              disabled={isLoadingGPS}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoadingGPS ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'გამოყენება'
              )}
            </button>
          </div>

          {gpsError && (
            <p className="text-destructive text-sm mb-3">{gpsError}</p>
          )}

          {/* Hide Exact Location Toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl mb-4">
            <Label htmlFor="hide-exact" className="text-sm cursor-pointer">
              ზუსტი ლოკაცია არ აჩვენო
            </Label>
            <Switch
              id="hide-exact"
              checked={hideExact}
              onCheckedChange={setHideExact}
            />
          </div>

          <ScrollArea className="h-[400px]">
            {/* Trending Locations */}
            {trendingLocations.length > 0 && !searchQuery && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>პოპულარული ამ კვირაში</span>
                </div>
                <div className="space-y-1">
                  {trendingLocations.map((loc) => (
                    <button
                      key={`trending-${loc.name}`}
                      onClick={() => handleSelectLocation(loc.name, loc.full)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{loc.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{loc.full}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{loc.count} პოსტი</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular / Search Results */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="w-4 h-4" />
                    <span>შედეგები</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>პოპულარული ქალაქები</span>
                  </>
                )}
              </div>
              <div className="space-y-1">
                {filteredLocations.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => handleSelectLocation(loc.name, loc.full)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{loc.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{loc.full}</p>
                    </div>
                  </button>
                ))}

                {searchQuery && filteredLocations.length === 0 && (
                  <button
                    onClick={() => handleSelectLocation(searchQuery, searchQuery)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left border border-dashed border-border"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">დაამატე: "{searchQuery}"</p>
                      <p className="text-sm text-muted-foreground">ხელით შეყვანილი მდებარეობა</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default LocationPicker;
