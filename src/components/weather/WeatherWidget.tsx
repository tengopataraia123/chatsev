import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  city: string;
}

interface WeatherWidgetProps {
  city?: string;
  compact?: boolean;
  className?: string;
}

const weatherIcons: Record<string, any> = {
  '01': Sun,
  '02': Cloud,
  '03': Cloud,
  '04': Cloud,
  '09': CloudRain,
  '10': CloudRain,
  '11': CloudRain,
  '13': CloudSnow,
  '50': Wind
};

const weatherDescriptions: Record<string, string> = {
  'clear sky': 'მოწმენდილი',
  'few clouds': 'მცირე ღრუბლიანობა',
  'scattered clouds': 'ღრუბლიანი',
  'broken clouds': 'ღრუბლიანი',
  'shower rain': 'წვიმა',
  'rain': 'წვიმა',
  'thunderstorm': 'ჭექა-ქუხილი',
  'snow': 'თოვლი',
  'mist': 'ნისლი',
  'overcast clouds': 'მოღრუბლული'
};

const WeatherWidget = ({ city = 'Tbilisi', compact = false, className }: WeatherWidgetProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Using Open-Meteo API (free, no API key required)
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      const geoData = await geoResponse.json();
      
      if (!geoData.results?.[0]) {
        throw new Error('ქალაქი ვერ მოიძებნა');
      }
      
      const { latitude, longitude, name } = geoData.results[0];
      
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code`
      );
      const weatherData = await weatherResponse.json();
      
      const current = weatherData.current;
      
      // Map weather codes to descriptions
      const weatherCodeDescriptions: Record<number, string> = {
        0: 'მოწმენდილი',
        1: 'ძირითადად მოწმენდილი',
        2: 'ნაწილობრივ ღრუბლიანი',
        3: 'მოღრუბლული',
        45: 'ნისლი',
        48: 'ყინვიანი ნისლი',
        51: 'მსუბუქი წვიმა',
        53: 'ზომიერი წვიმა',
        55: 'ძლიერი წვიმა',
        61: 'მსუბუქი წვიმა',
        63: 'ზომიერი წვიმა',
        65: 'ძლიერი წვიმა',
        71: 'მსუბუქი თოვლი',
        73: 'ზომიერი თოვლი',
        75: 'ძლიერი თოვლი',
        80: 'წვიმიანი',
        81: 'წვიმიანი',
        82: 'ძლიერი წვიმა',
        95: 'ჭექა-ქუხილი'
      };
      
      // Map weather codes to icons
      const getIconFromCode = (code: number) => {
        if (code === 0 || code === 1) return '01';
        if (code === 2) return '02';
        if (code === 3 || code === 45 || code === 48) return '04';
        if (code >= 51 && code <= 65) return '10';
        if (code >= 71 && code <= 77) return '13';
        if (code >= 80 && code <= 82) return '09';
        if (code === 95) return '11';
        return '03';
      };
      
      setWeather({
        temp: Math.round(current.temperature_2m),
        feels_like: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        wind_speed: Math.round(current.wind_speed_10m),
        description: weatherCodeDescriptions[current.weather_code] || 'უცნობი',
        icon: getIconFromCode(current.weather_code),
        city: name
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [city]);

  if (loading) {
    return (
      <div className={cn("p-4 rounded-2xl bg-card border border-border/50 animate-pulse", className)}>
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={cn("p-4 rounded-2xl bg-card border border-border/50", className)}>
        <p className="text-sm text-muted-foreground text-center">{error || 'ამინდი მიუწვდომელია'}</p>
        <button onClick={fetchWeather} className="mx-auto mt-2 text-primary text-sm flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> ხელახლა
        </button>
      </div>
    );
  }

  const WeatherIcon = weatherIcons[weather.icon] || Cloud;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 p-2 rounded-xl bg-card/50", className)}>
        <WeatherIcon className="w-5 h-5 text-primary" />
        <span className="font-semibold">{weather.temp}°C</span>
        <span className="text-xs text-muted-foreground">{weather.city}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-5 rounded-3xl bg-gradient-to-br from-sky-500/20 via-blue-500/10 to-indigo-500/20 border border-sky-500/20",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          {weather.city}
        </div>
        <button onClick={fetchWeather} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <WeatherIcon className="w-16 h-16 text-sky-500" />
        <div>
          <p className="text-4xl font-bold">{weather.temp}°C</p>
          <p className="text-muted-foreground capitalize">{weather.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">იგრძნობა</p>
          <p className="font-semibold">{weather.feels_like}°C</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Droplets className="w-3 h-3" /> ტენი
          </p>
          <p className="font-semibold">{weather.humidity}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Wind className="w-3 h-3" /> ქარი
          </p>
          <p className="font-semibold">{weather.wind_speed} კმ/ს</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
