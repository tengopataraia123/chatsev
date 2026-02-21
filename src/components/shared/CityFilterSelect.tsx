import { useState, useMemo } from 'react';
import { MapPin, Search, Check, ChevronDown, X } from 'lucide-react';
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

interface CityFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showAllOption?: boolean;
}

const CityFilterSelect = ({ 
  value, 
  onChange, 
  placeholder = 'აირჩიე ქალაქი', 
  className,
  showAllOption = true 
}: CityFilterSelectProps) => {
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

  const displayValue = value && value !== 'all' ? value : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between h-8 text-sm bg-background border-border",
            !value || value === 'all' ? "text-muted-foreground" : "",
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 z-50 bg-popover border border-border shadow-lg" align="start">
        <div className="p-2 border-b border-border bg-popover">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-60 bg-popover">
          <div className="p-1">
            {showAllOption && (
              <button
                onClick={() => handleSelect('')}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-left",
                  (!value || value === 'all') && "bg-primary/10 text-primary"
                )}
              >
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1">ყველა ქალაქი</span>
                {(!value || value === 'all') && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            )}
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

export default CityFilterSelect;