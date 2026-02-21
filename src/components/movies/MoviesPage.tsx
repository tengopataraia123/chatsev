import { Routes, Route } from 'react-router-dom';
import TopGeCounter from '@/components/TopGeCounter';
import MoviesList from './MoviesList';
import MovieDetail from './MovieDetail';

export default function MoviesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Routes>
          <Route index element={<MoviesList />} />
          <Route path=":id" element={<MovieDetail />} />
        </Routes>
      </div>
      <TopGeCounter />
    </div>
  );
}
