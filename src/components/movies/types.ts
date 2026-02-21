export type AgeRating = '0+' | '6+' | '12+' | '16+' | '18+';
export type MovieSourceType = 'iframe' | 'mp4' | 'hls_m3u8' | 'youtube' | 'vimeo' | 'external';
export type MovieQuality = '360p' | '480p' | '720p' | '1080p' | '4K';
export type MovieStatus = 'draft' | 'published';

export interface MovieGenre {
  id: string;
  name_ka: string;
  name_en: string | null;
  slug: string;
  created_at: string;
}

export interface MovieSource {
  id: string;
  movie_id: string;
  label: string;
  url: string;
  source_type: MovieSourceType;
  quality: MovieQuality | null;
  language: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface Movie {
  id: string;
  title_ka: string;
  title_en: string | null;
  year: number | null;
  genres: string[];
  country: string | null;
  duration_minutes: number | null;
  description_ka: string | null;
  description_en: string | null;
  poster_url: string | null;
  trailer_url: string | null;
  age_rating: AgeRating;
  tags: string[];
  status: MovieStatus;
  views_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sources?: MovieSource[];
}

export interface MovieFilters {
  search: string;
  genres: string[];
  yearFrom: number | null;
  yearTo: number | null;
  country: string;
  quality: string;
  ageRating: AgeRating | '';
  sortBy: 'newest' | 'oldest' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc' | 'views';
}

export const DEFAULT_FILTERS: MovieFilters = {
  search: '',
  genres: [],
  yearFrom: null,
  yearTo: null,
  country: '',
  quality: '',
  ageRating: '',
  sortBy: 'newest',
};
