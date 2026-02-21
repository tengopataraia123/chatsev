import { useState, useMemo } from 'react';
import { MapPin, Search, Check } from 'lucide-react';
import { georgianCities } from '@/lib/georgianCities';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CitySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CitySelect = ({ value, onChange, placeholder = 'აირჩიეთ ქალაქი', className }: CitySelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCities = useMemo(() => {
    if (!search.trim()) return georgianCities;
    const searchLower = search.toLowerCase();
    return georgianCities.filter(city => 
      city.toLowerCase().includes(searchLower)
    );
  }, [search]);

  const handleSelect = (city: string) => {
    onChange(city);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-12 text-base bg-secondary/50 border-border/50 rounded-xl",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <span>{value || placeholder}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-60">
          <div className="p-1">
            {filteredCities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                ქალაქი ვერ მოიძებნა
              </p>
            ) : (
              filteredCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleSelect(city)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-left",
                    value === city && "bg-primary/10 text-primary"
                  )}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1">{city}</span>
                  {value === city && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default CitySelect;
