import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Movie, MovieSource, MovieGenre, MovieFilters } from '@/components/movies/types';

// Fetch all published movies with filters
export function useMovies(filters: MovieFilters) {
  return useQuery({
    queryKey: ['movies', filters],
    queryFn: async () => {
      let query = supabase
        .from('movies')
        .select('*')
        .eq('status', 'published');

      // Apply search filter
      if (filters.search) {
        query = query.or(`title_ka.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`);
      }

      // Apply genre filter
      if (filters.genres.length > 0) {
        query = query.overlaps('genres', filters.genres);
      }

      // Apply year filters
      if (filters.yearFrom) {
        query = query.gte('year', filters.yearFrom);
      }
      if (filters.yearTo) {
        query = query.lte('year', filters.yearTo);
      }

      // Apply country filter
      if (filters.country) {
        query = query.ilike('country', `%${filters.country}%`);
      }

      // Apply age rating filter
      if (filters.ageRating) {
        query = query.eq('age_rating', filters.ageRating);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'year_desc':
          query = query.order('year', { ascending: false, nullsFirst: false });
          break;
        case 'year_asc':
          query = query.order('year', { ascending: true, nullsFirst: false });
          break;
        case 'title_asc':
          query = query.order('title_ka', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title_ka', { ascending: false });
          break;
        case 'views':
          query = query.order('views_count', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Movie[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch single movie with sources and creator profile
export function useMovie(movieId: string | undefined) {
  return useQuery({
    queryKey: ['movie', movieId],
    queryFn: async () => {
      if (!movieId) return null;

      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('id', movieId)
        .maybeSingle();

      if (movieError) throw movieError;
      if (!movie) return null;

      // Fetch sources separately
      const { data: sources, error: sourcesError } = await supabase
        .from('movie_sources')
        .select('*')
        .eq('movie_id', movieId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (sourcesError) throw sourcesError;

      // Fetch creator profile if created_by exists
      let profiles = null;
      if (movie.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, gender')
          .eq('user_id', movie.created_by)
          .maybeSingle();
        profiles = profile;
      }

      return { ...movie, sources: sources || [], profiles } as Movie & { profiles?: { username: string; avatar_url: string | null; gender: string | null } };
    },
    enabled: !!movieId,
  });
}

// Fetch all genres
export function useMovieGenres() {
  return useQuery({
    queryKey: ['movie-genres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_genres')
        .select('*')
        .order('name_ka');

      if (error) throw error;
      return data as MovieGenre[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Admin: Fetch all movies (including drafts) with creator profiles
export function useAdminMovies() {
  return useQuery({
    queryKey: ['admin-movies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles for all movies
      const creatorIds = [...new Set(data.filter(m => m.created_by).map(m => m.created_by))];
      let profiles: Record<string, { username: string; avatar_url: string | null }> = {};
      
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', creatorIds);
        
        if (profilesData) {
          profiles = profilesData.reduce((acc, p) => {
            acc[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { username: string; avatar_url: string | null }>);
        }
      }

      return data.map(movie => ({
        ...movie,
        profiles: movie.created_by ? profiles[movie.created_by] : null
      })) as (Movie & { profiles?: { username: string; avatar_url: string | null } | null })[];
    },
  });
}

// Admin: Create movie
export function useCreateMovie() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (movie: Partial<Movie>) => {
      const { data, error } = await supabase
        .from('movies')
        .insert([movie as any])
        .select()
        .single();

      if (error) throw error;
      return data as Movie;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
    },
  });
}

// Admin: Update movie
export function useUpdateMovie() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Movie> & { id: string }) => {
      const { data, error } = await supabase
        .from('movies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Movie;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movie', data.id] });
    },
  });
}

// Admin: Delete movie
export function useDeleteMovie() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (movieId: string) => {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', movieId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
    },
  });
}

// Admin: Create movie source
export function useCreateMovieSource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (source: Partial<MovieSource>) => {
      const { data, error } = await supabase
        .from('movie_sources')
        .insert([source as any])
        .select()
        .single();

      if (error) throw error;
      return data as MovieSource;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movie', data.movie_id] });
    },
  });
}

// Admin: Update movie source
export function useUpdateMovieSource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MovieSource> & { id: string }) => {
      const { data, error } = await supabase
        .from('movie_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MovieSource;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movie', data.movie_id] });
    },
  });
}

// Admin: Delete movie source
export function useDeleteMovieSource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sourceId, movieId }: { sourceId: string; movieId: string }) => {
      const { error } = await supabase
        .from('movie_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;
      return movieId;
    },
    onSuccess: (movieId) => {
      queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
    },
  });
}

// Increment view count
export function useIncrementMovieViews() {
  return useMutation({
    mutationFn: async (movieId: string) => {
      const { error } = await supabase.rpc('increment_movie_views', { movie_id: movieId });
      if (error) throw error;
    },
  });
}
