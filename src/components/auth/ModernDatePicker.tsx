import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInYears, format, getDaysInMonth, setMonth, setYear, startOfMonth, getDay } from 'date-fns';
import { ka } from 'date-fns/locale';

interface ModernDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minAge?: number;
  maxAge?: number;
  placeholder?: string;
  className?: string;
}

const MONTHS_KA = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];

const WEEKDAYS_KA = ['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'];

export const ModernDatePicker = ({
  value,
  onChange,
  minAge = 18,
  maxAge = 100,
  placeholder = 'აირჩიეთ თარიღი',
  className
}: ModernDatePickerProps) => {
  const [open, setOpen] = useState(false);
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const minYear = currentYear - maxAge;
  const maxYear = currentYear - minAge;
  
  // Default to a reasonable year when opening
  const defaultYear = value?.getFullYear() || maxYear - 5;
  const defaultMonth = value?.getMonth() || 0;
  
  const [viewYear, setViewYear] = useState(defaultYear);
  const [viewMonth, setViewMonth] = useState(defaultMonth);

  // Generate years array
  const years = useMemo(() => {
    const arr = [];
    for (let y = maxYear; y >= minYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [minYear, maxYear]);

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = startOfMonth(new Date(viewYear, viewMonth));
    const daysInMonth = getDaysInMonth(firstDayOfMonth);
    const startWeekday = getDay(firstDayOfMonth);
    
    const days: (number | null)[] = [];
    
    // Add empty slots for days before the 1st
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    
    return days;
  }, [viewYear, viewMonth]);

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day);
    const age = differenceInYears(today, selectedDate);
    
    if (age >= minAge && age <= maxAge) {
      onChange(selectedDate);
      setOpen(false);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      if (viewYear > minYear) {
        setViewYear(viewYear - 1);
        setViewMonth(11);
      }
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      if (viewYear < maxYear) {
        setViewYear(viewYear + 1);
        setViewMonth(0);
      }
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const age = differenceInYears(today, date);
    return age < minAge || age > maxAge;
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    return value.getFullYear() === viewYear && 
           value.getMonth() === viewMonth && 
           value.getDate() === day;
  };

  const age = value ? differenceInYears(today, value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-12 justify-start text-left font-normal bg-secondary/50 border-border/50 rounded-xl hover:bg-secondary/70 transition-colors",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5 shrink-0" />
          <span className="truncate">
            {value ? (
              <span className="flex items-center gap-2">
                <span>{format(value, 'dd.MM.yyyy')}</span>
                {age !== null && (
                  <span className="text-primary font-medium">({age} წ.)</span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[min(300px,calc(100vw-2rem))] p-0 bg-card border-border shadow-2xl rounded-2xl overflow-hidden max-h-[70dvh] overflow-y-auto" 
        align="center"
        side="bottom"
        sideOffset={4}
        avoidCollisions
      >
        {/* Header with month/year selectors */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-3 border-b border-border/50">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-9 w-9 rounded-xl hover:bg-secondary"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2 flex-1 justify-center">
              <Select
                value={viewMonth.toString()}
                onValueChange={(v) => setViewMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[120px] h-9 text-sm font-medium bg-background/80 border-border/50 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] bg-card border-border rounded-xl">
                  {MONTHS_KA.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()} className="text-sm">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={viewYear.toString()}
                onValueChange={(v) => setViewYear(parseInt(v))}
              >
                <SelectTrigger className="w-[90px] h-9 text-sm font-medium bg-background/80 border-border/50 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] bg-card border-border rounded-xl">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-sm">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-9 w-9 rounded-xl hover:bg-secondary"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Calendar grid */}
        <div className="p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS_KA.map((day, idx) => (
              <div
                key={idx}
                className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => (
              <div key={idx} className="aspect-square">
                {day !== null ? (
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={isDateDisabled(day)}
                    className={cn(
                      "w-full h-full flex items-center justify-center text-sm rounded-xl transition-all duration-200",
                      isSelected(day)
                        ? "bg-primary text-primary-foreground font-semibold shadow-md scale-105"
                        : isDateDisabled(day)
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "hover:bg-secondary text-foreground hover:scale-105"
                    )}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        
        {/* Age info footer */}
        {value && age !== null && (
          <div className="px-4 pb-4">
            <div className="bg-primary/10 rounded-xl px-3 py-2 text-center">
              <span className="text-sm text-foreground">
                თქვენი ასაკი: <span className="font-bold text-primary">{age} წელი</span>
              </span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ModernDatePicker;
